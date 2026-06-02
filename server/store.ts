import crypto from 'crypto';
import type { DB } from './db';
import { AppError } from './errors';
import type { EventStatus } from './validation';
import type {
  ActivityRow,
  ActivityScoreRow,
  EventRow,
  ParticipantRow,
  RankingEntry,
  TeamRow,
  VoteRow,
} from './types';

export const MAX_VOTES = 3;

// --- EVENTS ---

export function listEvents(db: DB, opts: { onlyOpen?: boolean } = {}): EventRow[] {
  if (opts.onlyOpen) {
    return db
      .prepare(`SELECT * FROM events WHERE status = 'open' ORDER BY id DESC`)
      .all() as EventRow[];
  }
  return db.prepare('SELECT * FROM events ORDER BY id DESC').all() as EventRow[];
}

export function getEvent(db: DB, id: number): EventRow {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow | undefined;
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
  return event;
}

export function createEvent(
  db: DB,
  data: { name: string; date: string | null; location: string | null },
): { id: number } {
  const result = db
    .prepare('INSERT INTO events (name, date, location) VALUES (?, ?, ?)')
    .run(data.name, data.date, data.location);
  return { id: Number(result.lastInsertRowid) };
}

export function updateEvent(
  db: DB,
  id: number,
  data: { name: string; date: string | null; location: string | null; status: EventStatus },
): EventRow {
  getEvent(db, id);
  db.prepare('UPDATE events SET name = ?, date = ?, location = ?, status = ? WHERE id = ?').run(
    data.name,
    data.date,
    data.location,
    data.status,
    id,
  );
  return getEvent(db, id);
}

export function deleteEvent(db: DB, id: number): void {
  const r = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  if (r.changes === 0) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
}

// --- TEAMS ---

export function listTeams(db: DB, eventId: number): TeamRow[] {
  return db
    .prepare('SELECT * FROM teams WHERE event_id = ? ORDER BY id')
    .all(eventId) as TeamRow[];
}

export function createTeam(db: DB, eventId: number, name: string): { id: number; qr_token: string } {
  getEvent(db, eventId);
  const qrToken = crypto.randomBytes(16).toString('hex');
  const result = db
    .prepare('INSERT INTO teams (name, event_id, qr_token) VALUES (?, ?, ?)')
    .run(name, eventId, qrToken);
  return { id: Number(result.lastInsertRowid), qr_token: qrToken };
}

export function updateTeam(
  db: DB,
  eventId: number,
  teamId: number,
  data: { name?: string; adminPoints?: number },
): TeamRow {
  const team = db
    .prepare('SELECT * FROM teams WHERE id = ? AND event_id = ?')
    .get(teamId, eventId) as TeamRow | undefined;
  if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  const name = data.name ?? team.name;
  const adminPoints = data.adminPoints ?? team.admin_points;
  db.prepare('UPDATE teams SET name = ?, admin_points = ? WHERE id = ?').run(name, adminPoints, teamId);
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow;
}

export function deleteTeam(db: DB, eventId: number, teamId: number): void {
  const team = db
    .prepare('SELECT id FROM teams WHERE id = ? AND event_id = ?')
    .get(teamId, eventId);
  if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
}

// --- ACTIVITIES ---

export function listActivities(db: DB, eventId: number): ActivityRow[] {
  return db
    .prepare('SELECT * FROM activities WHERE event_id = ? ORDER BY id')
    .all(eventId) as ActivityRow[];
}

export function createActivity(db: DB, eventId: number, name: string): { id: number } {
  getEvent(db, eventId);
  const result = db
    .prepare('INSERT INTO activities (name, event_id) VALUES (?, ?)')
    .run(name, eventId);
  return { id: Number(result.lastInsertRowid) };
}

export function updateActivity(db: DB, activityId: number, name: string): ActivityRow {
  const r = db.prepare('UPDATE activities SET name = ? WHERE id = ?').run(name, activityId);
  if (r.changes === 0) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  return db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as ActivityRow;
}

export function deleteActivity(db: DB, activityId: number): void {
  const r = db.prepare('DELETE FROM activities WHERE id = ?').run(activityId);
  if (r.changes === 0) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
}

export function listScores(db: DB, activityId: number): ActivityScoreRow[] {
  return db
    .prepare('SELECT * FROM activity_scores WHERE activity_id = ?')
    .all(activityId) as ActivityScoreRow[];
}

/**
 * Assign rank-based points to a team for an activity. `points === null` clears
 * the score. Enforces that a rank can only be held by one team per activity.
 */
export function setActivityScore(
  db: DB,
  activityId: number,
  teamId: number,
  points: number | null,
): void {
  const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId);
  if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');

  if (points === null) {
    db.prepare('DELETE FROM activity_scores WHERE activity_id = ? AND team_id = ?').run(
      activityId,
      teamId,
    );
    return;
  }

  const clash = db
    .prepare(
      'SELECT team_id FROM activity_scores WHERE activity_id = ? AND points = ? AND team_id != ?',
    )
    .get(activityId, points, teamId);
  if (clash) {
    throw new AppError(409, 'RANK_TAKEN', `Rank ${points} is already assigned to another team`);
  }

  db.prepare(
    `INSERT INTO activity_scores (activity_id, team_id, points)
     VALUES (?, ?, ?)
     ON CONFLICT(activity_id, team_id) DO UPDATE SET points = excluded.points`,
  ).run(activityId, teamId, points);
}

// --- PARTICIPANTS ---

export function registerParticipant(
  db: DB,
  data: { pseudo: string; qrToken: string; deviceId: string },
): ParticipantRow {
  const team = db
    .prepare('SELECT id, event_id FROM teams WHERE qr_token = ?')
    .get(data.qrToken) as Pick<TeamRow, 'id' | 'event_id'> | undefined;
  if (!team) throw new AppError(404, 'INVALID_QR', 'Invalid QR code');

  const existing = db
    .prepare('SELECT * FROM participants WHERE event_id = ? AND device_id = ?')
    .get(team.event_id, data.deviceId) as ParticipantRow | undefined;
  if (existing) return existing;

  const result = db
    .prepare('INSERT INTO participants (pseudo, team_id, event_id, device_id) VALUES (?, ?, ?, ?)')
    .run(data.pseudo, team.id, team.event_id, data.deviceId);
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid) as ParticipantRow;
}

export function getParticipant(db: DB, id: number): ParticipantRow {
  const p = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
  if (!p) throw new AppError(404, 'PARTICIPANT_NOT_FOUND', 'Participant not found');
  return p;
}

export function getParticipantVotes(db: DB, participantId: number): VoteRow[] {
  return db
    .prepare('SELECT * FROM votes WHERE participant_id = ?')
    .all(participantId) as VoteRow[];
}

// --- VOTES ---

/**
 * Cast a vote. Enforces: event is open, not voting for own team, max votes,
 * and no duplicate vote for the same team.
 */
export function castVote(db: DB, participantId: number, votedTeamId: number): { id: number } {
  const participant = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(participantId) as ParticipantRow | undefined;
  if (!participant) throw new AppError(404, 'PARTICIPANT_NOT_FOUND', 'Participant not found');

  const event = getEvent(db, participant.event_id);
  if (event.status !== 'open') {
    throw new AppError(403, 'EVENT_CLOSED', 'Voting is closed for this event');
  }

  if (participant.team_id === votedTeamId) {
    throw new AppError(403, 'OWN_TEAM', 'You cannot vote for your own team');
  }

  const target = db
    .prepare('SELECT id FROM teams WHERE id = ? AND event_id = ?')
    .get(votedTeamId, participant.event_id);
  if (!target) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found in this event');

  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM votes WHERE participant_id = ? AND event_id = ?')
    .get(participantId, participant.event_id) as { count: number };
  if (count >= MAX_VOTES) {
    throw new AppError(403, 'VOTE_LIMIT', `You can only vote for up to ${MAX_VOTES} teams`);
  }

  try {
    const result = db
      .prepare('INSERT INTO votes (participant_id, voted_team_id, event_id) VALUES (?, ?, ?)')
      .run(participantId, votedTeamId, participant.event_id);
    return { id: Number(result.lastInsertRowid) };
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'ALREADY_VOTED', 'You have already voted for this team');
    }
    throw err;
  }
}

// --- RANKINGS ---

export function rankingByActivity(
  db: DB,
  eventId: number,
  activityId: number,
): { ranking: RankingEntry[]; activityName: string } {
  const activity = db.prepare('SELECT name FROM activities WHERE id = ?').get(activityId) as
    | { name: string }
    | undefined;
  const ranking = db
    .prepare(
      `SELECT t.id, t.name, COALESCE(s.points, 0) as score
       FROM teams t
       LEFT JOIN activity_scores s ON t.id = s.team_id AND s.activity_id = ?
       WHERE t.event_id = ?
       ORDER BY score DESC, t.name ASC`,
    )
    .all(activityId, eventId) as RankingEntry[];
  return { ranking, activityName: activity ? activity.name : 'Unknown' };
}

export function rankingByVotes(db: DB, eventId: number): RankingEntry[] {
  return db
    .prepare(
      `SELECT t.id, t.name, (SELECT COUNT(*) FROM votes v WHERE v.voted_team_id = t.id) as score
       FROM teams t
       WHERE t.event_id = ?
       ORDER BY score DESC, t.name ASC`,
    )
    .all(eventId) as RankingEntry[];
}

/** Global score = sum of activity points + votes received + admin bonus points. */
export function rankingGlobal(db: DB, eventId: number): RankingEntry[] {
  return db
    .prepare(
      `SELECT t.id, t.name,
        (
          COALESCE((SELECT SUM(points) FROM activity_scores s JOIN activities a ON s.activity_id = a.id WHERE s.team_id = t.id AND a.event_id = ?), 0)
          + (SELECT COUNT(*) FROM votes v WHERE v.voted_team_id = t.id)
          + t.admin_points
        ) as score
       FROM teams t
       WHERE t.event_id = ?
       ORDER BY score DESC, t.name ASC`,
    )
    .all(eventId, eventId) as RankingEntry[];
}
