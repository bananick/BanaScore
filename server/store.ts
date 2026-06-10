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
  WorkshopRanking,
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
  data: {
    name: string;
    date: string | null;
    location: string | null;
    status: EventStatus;
    maxVotes: number;
    brandColor: string | null;
    logoUrl: string | null;
    scorerCode: string | null;
  },
): EventRow {
  getEvent(db, id);
  db.prepare(
    `UPDATE events
     SET name = ?, date = ?, location = ?, status = ?, max_votes = ?, brand_color = ?, logo_url = ?, scorer_code = ?
     WHERE id = ?`,
  ).run(
    data.name,
    data.date,
    data.location,
    data.status,
    data.maxVotes,
    data.brandColor,
    data.logoUrl,
    data.scorerCode,
    id,
  );
  return getEvent(db, id);
}

export function deleteEvent(db: DB, id: number): void {
  const r = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  if (r.changes === 0) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
}

/**
 * Duplicate an event's structure as a fresh "open" event: copies activities and
 * teams (with new QR tokens, bonus reset). Scores, votes and participants are
 * NOT copied. Useful to reuse a recurring Banana Events format as a template.
 */
export function duplicateEvent(
  db: DB,
  id: number,
  overrides: { name?: string; date?: string | null; location?: string | null } = {},
): { id: number } {
  const source = getEvent(db, id);
  const name = overrides.name?.trim() || `${source.name} (copie)`;
  const date = overrides.date !== undefined ? overrides.date : source.date;
  const location = overrides.location !== undefined ? overrides.location : source.location;

  const run = db.transaction(() => {
    const created = createEvent(db, { name, date, location });
    // Carry over event-level configuration (votes, branding, scorer code).
    db.prepare(
      'UPDATE events SET max_votes = ?, brand_color = ?, logo_url = ?, scorer_code = ? WHERE id = ?',
    ).run(source.max_votes, source.brand_color, source.logo_url, source.scorer_code, created.id);
    for (const activity of listActivities(db, id)) {
      db.prepare(
        'INSERT INTO activities (name, event_id, coefficient, workshop) VALUES (?, ?, ?, ?)',
      ).run(activity.name, created.id, activity.coefficient, activity.workshop);
    }
    for (const team of listTeams(db, id)) {
      const qrToken = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO teams (name, event_id, qr_token) VALUES (?, ?, ?)').run(
        team.name,
        created.id,
        qrToken,
      );
    }
    return created;
  });
  return run();
}

/**
 * Generate `count` sessions from a template event, named "<prefix> S1..Sn".
 * Each is a full duplicate (structure + config, no scores/teams).
 */
export function generateSessions(
  db: DB,
  id: number,
  count: number,
  prefix: string,
): { ids: number[] } {
  getEvent(db, id);
  const ids: number[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(duplicateEvent(db, id, { name: `${prefix} S${i}` }).id);
  }
  return { ids };
}

// --- TEAMS ---

export function listTeams(db: DB, eventId: number): TeamRow[] {
  return db
    .prepare('SELECT * FROM teams WHERE event_id = ? ORDER BY id')
    .all(eventId) as TeamRow[];
}

/** Throw if another row in `rows` has the same name (case-insensitive, trimmed). */
function assertUniqueName(
  rows: Array<{ id: number; name: string }>,
  name: string,
  exceptId: number | null,
  label: string,
): void {
  const norm = name.trim().toLowerCase();
  if (rows.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === norm)) {
    throw new AppError(409, 'DUPLICATE_NAME', `A ${label} named "${name}" already exists`);
  }
}

export function createTeam(db: DB, eventId: number, name: string): { id: number; qr_token: string } {
  getEvent(db, eventId);
  assertUniqueName(listTeams(db, eventId), name, null, 'team');
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
  data: { name?: string; adminPoints?: number; bonusLabel?: string | null },
): TeamRow {
  const team = db
    .prepare('SELECT * FROM teams WHERE id = ? AND event_id = ?')
    .get(teamId, eventId) as TeamRow | undefined;
  if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  const name = data.name ?? team.name;
  if (data.name !== undefined) {
    assertUniqueName(listTeams(db, eventId), data.name, teamId, 'team');
  }
  const adminPoints = data.adminPoints ?? team.admin_points;
  const bonusLabel = data.bonusLabel !== undefined ? data.bonusLabel : team.bonus_label;
  db.prepare('UPDATE teams SET name = ?, admin_points = ?, bonus_label = ? WHERE id = ?').run(
    name,
    adminPoints,
    bonusLabel,
    teamId,
  );
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

export function getActivity(db: DB, activityId: number): ActivityRow {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as
    | ActivityRow
    | undefined;
  if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  return activity;
}

export function createActivity(
  db: DB,
  eventId: number,
  name: string,
  workshop: string | null = null,
): { id: number } {
  getEvent(db, eventId);
  assertUniqueName(listActivities(db, eventId), name, null, 'activity');
  const result = db
    .prepare('INSERT INTO activities (name, event_id, workshop) VALUES (?, ?, ?)')
    .run(name, eventId, workshop);
  return { id: Number(result.lastInsertRowid) };
}

export function updateActivity(
  db: DB,
  activityId: number,
  data: { name?: string; coefficient?: number; workshop?: string | null },
): ActivityRow {
  const activity = getActivity(db, activityId);
  const name = data.name ?? activity.name;
  if (data.name !== undefined) {
    assertUniqueName(listActivities(db, activity.event_id), data.name, activityId, 'activity');
  }
  const coefficient = data.coefficient ?? activity.coefficient;
  const workshop = data.workshop !== undefined ? data.workshop : activity.workshop;
  db.prepare('UPDATE activities SET name = ?, coefficient = ?, workshop = ? WHERE id = ?').run(
    name,
    coefficient,
    workshop,
    activityId,
  );
  return getActivity(db, activityId);
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
  if (count >= event.max_votes) {
    throw new AppError(403, 'VOTE_LIMIT', `You can only vote for up to ${event.max_votes} teams`);
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

/**
 * Global score = sum of (activity points × activity coefficient) + votes
 * received + admin bonus points.
 */
export function rankingGlobal(db: DB, eventId: number): RankingEntry[] {
  return db
    .prepare(
      `SELECT t.id, t.name,
        (
          COALESCE((SELECT SUM(s.points * a.coefficient) FROM activity_scores s JOIN activities a ON s.activity_id = a.id WHERE s.team_id = t.id AND a.event_id = ?), 0)
          + (SELECT COUNT(*) FROM votes v WHERE v.voted_team_id = t.id)
          + t.admin_points
        ) as score
       FROM teams t
       WHERE t.event_id = ?
       ORDER BY score DESC, t.name ASC`,
    )
    .all(eventId, eventId) as RankingEntry[];
}

/**
 * Ranking per "atelier" (workshop): activities are grouped by their `workshop`
 * label (falling back to the activity's own name when unset). Each group's
 * score for a team is the coefficient-weighted sum of its activities' points.
 * Returns groups in activity order, each ranking sorted by score desc.
 */
export function rankingByWorkshop(db: DB, eventId: number): WorkshopRanking[] {
  const activities = listActivities(db, eventId);
  const teams = listTeams(db, eventId);

  // Preserve first-seen order of workshops.
  const groups: { key: string; activityIds: number[]; coefs: Map<number, number> }[] = [];
  const byKey = new Map<string, (typeof groups)[number]>();
  for (const a of activities) {
    const key = a.workshop && a.workshop.trim() ? a.workshop.trim() : a.name;
    let group = byKey.get(key);
    if (!group) {
      group = { key, activityIds: [], coefs: new Map() };
      byKey.set(key, group);
      groups.push(group);
    }
    group.activityIds.push(a.id);
    group.coefs.set(a.id, a.coefficient);
  }

  return groups.map((group) => {
    const ranking: RankingEntry[] = teams.map((team) => {
      let score = 0;
      for (const activityId of group.activityIds) {
        const row = db
          .prepare('SELECT points FROM activity_scores WHERE activity_id = ? AND team_id = ?')
          .get(activityId, team.id) as { points: number } | undefined;
        score += (row?.points ?? 0) * (group.coefs.get(activityId) ?? 1);
      }
      return { id: team.id, name: team.name, score };
    });
    ranking.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return { workshop: group.key, ranking };
  });
}

export interface EventReport {
  event: EventRow;
  activities: { id: number; name: string; coefficient: number }[];
  /** One row per team with a full breakdown, sorted by total desc. */
  teams: {
    id: number;
    name: string;
    activityPoints: Record<number, number>; // activityId -> raw points
    activityTotal: number; // coefficient-weighted sum
    votes: number;
    bonus: number;
    bonusLabel: string | null;
    total: number;
  }[];
  participantCount: number;
  generatedAt: string;
}

/**
 * Aggregate everything needed for the client report / CSV export: per-team
 * breakdown (points per activity, vote count, bonus, total) plus event meta.
 */
export function getEventReport(db: DB, eventId: number): EventReport {
  const event = getEvent(db, eventId);
  const activities = listActivities(db, eventId).map((a) => ({
    id: a.id,
    name: a.name,
    coefficient: a.coefficient,
  }));
  const teams = listTeams(db, eventId);

  const rows = teams.map((team) => {
    const activityPoints: Record<number, number> = {};
    let activityTotal = 0;
    for (const activity of activities) {
      const row = db
        .prepare('SELECT points FROM activity_scores WHERE activity_id = ? AND team_id = ?')
        .get(activity.id, team.id) as { points: number } | undefined;
      const pts = row?.points ?? 0;
      activityPoints[activity.id] = pts;
      activityTotal += pts * activity.coefficient;
    }
    const { count: votes } = db
      .prepare('SELECT COUNT(*) as count FROM votes WHERE voted_team_id = ?')
      .get(team.id) as { count: number };
    const bonus = team.admin_points;
    return {
      id: team.id,
      name: team.name,
      activityPoints,
      activityTotal,
      votes,
      bonus,
      bonusLabel: team.bonus_label,
      total: activityTotal + votes + bonus,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const { count: participantCount } = db
    .prepare('SELECT COUNT(*) as count FROM participants WHERE event_id = ?')
    .get(eventId) as { count: number };

  return {
    event,
    activities,
    teams: rows,
    participantCount,
    generatedAt: new Date().toISOString(),
  };
}

export interface EventStats {
  teams: number;
  participants: number;
  votes: number;
  activitiesTotal: number;
  activitiesScored: number; // activities with at least one score
  perTeam: { id: number; name: string; participants: number; votes: number }[];
}

/** Live counters for the organiser dashboard. */
export function getEventStats(db: DB, eventId: number): EventStats {
  getEvent(db, eventId);
  const teams = listTeams(db, eventId);
  const activities = listActivities(db, eventId);

  const activitiesScored = activities.filter((a) => {
    const row = db
      .prepare('SELECT 1 FROM activity_scores WHERE activity_id = ? LIMIT 1')
      .get(a.id);
    return !!row;
  }).length;

  const perTeam = teams.map((team) => {
    const { count: participants } = db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE team_id = ?')
      .get(team.id) as { count: number };
    const { count: votes } = db
      .prepare('SELECT COUNT(*) as count FROM votes WHERE voted_team_id = ?')
      .get(team.id) as { count: number };
    return { id: team.id, name: team.name, participants, votes };
  });

  const { count: participants } = db
    .prepare('SELECT COUNT(*) as count FROM participants WHERE event_id = ?')
    .get(eventId) as { count: number };
  const { count: votes } = db
    .prepare('SELECT COUNT(*) as count FROM votes WHERE event_id = ?')
    .get(eventId) as { count: number };

  return {
    teams: teams.length,
    participants,
    votes,
    activitiesTotal: activities.length,
    activitiesScored,
    perTeam,
  };
}
