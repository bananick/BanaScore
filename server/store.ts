import crypto from 'crypto';
import { db as fs, nextId, type DB } from './db';
import { AppError } from './errors';
import type { EventStatus } from './validation';
import type {
  ActivityRow,
  ActivityScoreRow,
  CriterionRow,
  EventRow,
  ParticipantRow,
  RankingEntry,
  TeamRow,
  VoteRow,
  WorkshopRanking,
} from './types';

export const MAX_VOTES = 3;

// `db` is kept as a parameter for call-site compatibility, but all access goes
// through the Firestore instance imported as `fs`.

const C = {
  events: 'events',
  teams: 'teams',
  activities: 'activities',
  criteria: 'activity_criteria',
  teamCriteria: 'team_criteria',
  scores: 'activity_scores',
  participants: 'participants',
  participantIndex: 'participant_index',
  votes: 'votes',
  settings: 'settings',
};

const byId = <T extends { id: number }>(rows: T[]) => rows.sort((a, b) => a.id - b.id);

async function whereEvent<T>(collection: string, eventId: number): Promise<T[]> {
  const snap = await fs.collection(collection).where('event_id', '==', eventId).get();
  return snap.docs.map((d) => d.data() as T);
}

// --- EVENTS ---

export async function listEvents(_db: DB, opts: { onlyOpen?: boolean } = {}): Promise<EventRow[]> {
  const ref = opts.onlyOpen
    ? fs.collection(C.events).where('status', '==', 'open')
    : fs.collection(C.events);
  const snap = await ref.get();
  return (snap.docs.map((d) => d.data() as EventRow)).sort((a, b) => b.id - a.id);
}

export async function getEvent(_db: DB, id: number): Promise<EventRow> {
  const doc = await fs.collection(C.events).doc(String(id)).get();
  if (!doc.exists) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
  return doc.data() as EventRow;
}

export async function createEvent(
  _db: DB,
  data: { name: string; date: string | null; location: string | null },
): Promise<{ id: number }> {
  const id = await nextId(C.events);
  const event: EventRow = {
    id,
    name: data.name,
    date: data.date,
    location: data.location,
    status: 'open',
    max_votes: 3,
    voting_enabled: 1,
    ranking_mode: 'raw',
    workshop_weights: null,
    brand_color: null,
    logo_url: null,
    scorer_code: null,
    created_at: new Date().toISOString(),
  };
  await fs.collection(C.events).doc(String(id)).set(event);
  return { id };
}

export async function updateEvent(
  db: DB,
  id: number,
  data: {
    name: string;
    date: string | null;
    location: string | null;
    status: EventStatus;
    maxVotes: number;
    votingEnabled: boolean;
    rankingMode: 'raw' | 'normalized';
    workshopWeights: Record<string, number> | null;
    brandColor: string | null;
    logoUrl: string | null;
    scorerCode: string | null;
  },
): Promise<EventRow> {
  await getEvent(db, id);
  await fs.collection(C.events).doc(String(id)).set(
    {
      name: data.name,
      date: data.date,
      location: data.location,
      status: data.status,
      max_votes: data.maxVotes,
      voting_enabled: data.votingEnabled ? 1 : 0,
      ranking_mode: data.rankingMode,
      workshop_weights: data.workshopWeights ? JSON.stringify(data.workshopWeights) : null,
      brand_color: data.brandColor,
      logo_url: data.logoUrl,
      scorer_code: data.scorerCode,
    },
    { merge: true },
  );
  return getEvent(db, id);
}

/** Delete a document collection-query result in batches. */
async function deleteQuery(query: FirebaseFirestore.Query): Promise<void> {
  const snap = await query.get();
  let batch = fs.batch();
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    if (++n === 450) {
      await batch.commit();
      batch = fs.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

export async function deleteEvent(db: DB, id: number): Promise<void> {
  await getEvent(db, id);
  // Cascade: teams, activities (+criteria), scores, participants, votes.
  const activities = await listActivities(db, id);
  for (const a of activities) {
    await deleteQuery(fs.collection(C.criteria).where('activity_id', '==', a.id));
    await deleteQuery(fs.collection(C.scores).where('activity_id', '==', a.id));
  }
  await deleteQuery(fs.collection(C.activities).where('event_id', '==', id));
  await deleteQuery(fs.collection(C.teams).where('event_id', '==', id));
  await deleteQuery(fs.collection(C.participants).where('event_id', '==', id));
  await deleteQuery(fs.collection(C.votes).where('event_id', '==', id));
  await deleteQuery(fs.collection(C.participantIndex).where('event_id', '==', id));
  await fs.collection(C.events).doc(String(id)).delete();
}

/**
 * Duplicate an event's structure as a fresh "open" event: activities (+criteria)
 * and teams (new QR tokens). Scores, votes and participants are NOT copied.
 */
export async function duplicateEvent(
  db: DB,
  id: number,
  overrides: { name?: string; date?: string | null; location?: string | null } = {},
): Promise<{ id: number }> {
  const source = await getEvent(db, id);
  const name = overrides.name?.trim() || `${source.name} (copie)`;
  const date = overrides.date !== undefined ? overrides.date : source.date;
  const location = overrides.location !== undefined ? overrides.location : source.location;

  const created = await createEvent(db, { name, date, location });
  await fs.collection(C.events).doc(String(created.id)).set(
    {
      max_votes: source.max_votes,
      voting_enabled: source.voting_enabled,
      ranking_mode: source.ranking_mode,
      workshop_weights: source.workshop_weights,
      brand_color: source.brand_color,
      logo_url: source.logo_url,
      scorer_code: source.scorer_code,
    },
    { merge: true },
  );

  for (const activity of await listActivities(db, id)) {
    const newId = await nextId(C.activities);
    await fs.collection(C.activities).doc(String(newId)).set({
      id: newId,
      event_id: created.id,
      name: activity.name,
      coefficient: activity.coefficient,
      workshop: activity.workshop,
      scoring_mode: activity.scoring_mode,
    });
    for (const c of await listCriteria(db, activity.id)) {
      const cid = await nextId(C.criteria);
      await fs.collection(C.criteria).doc(String(cid)).set({
        id: cid,
        activity_id: newId,
        label: c.label,
        points: c.points,
        position: c.position,
      });
    }
  }
  for (const team of await listTeams(db, id)) {
    const tid = await nextId(C.teams);
    await fs.collection(C.teams).doc(String(tid)).set({
      id: tid,
      event_id: created.id,
      name: team.name,
      qr_token: crypto.randomBytes(16).toString('hex'),
      admin_points: 0,
      bonus_label: null,
    });
  }
  return created;
}

export async function generateSessions(
  db: DB,
  id: number,
  count: number,
  prefix: string,
): Promise<{ ids: number[] }> {
  await getEvent(db, id);
  const ids: number[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push((await duplicateEvent(db, id, { name: `${prefix} S${i}` })).id);
  }
  return { ids };
}

// --- TEAMS ---

export async function listTeams(_db: DB, eventId: number): Promise<TeamRow[]> {
  return byId(await whereEvent<TeamRow>(C.teams, eventId));
}

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

export async function createTeam(
  db: DB,
  eventId: number,
  name: string,
): Promise<{ id: number; qr_token: string }> {
  await getEvent(db, eventId);
  assertUniqueName(await listTeams(db, eventId), name, null, 'team');
  const id = await nextId(C.teams);
  const qr_token = crypto.randomBytes(16).toString('hex');
  await fs.collection(C.teams).doc(String(id)).set({
    id,
    event_id: eventId,
    name,
    qr_token,
    admin_points: 0,
    bonus_label: null,
  });
  return { id, qr_token };
}

export async function updateTeam(
  db: DB,
  eventId: number,
  teamId: number,
  data: { name?: string; adminPoints?: number; bonusLabel?: string | null },
): Promise<TeamRow> {
  const doc = await fs.collection(C.teams).doc(String(teamId)).get();
  const team = doc.exists ? (doc.data() as TeamRow) : undefined;
  if (!team || team.event_id !== eventId) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  if (data.name !== undefined) {
    assertUniqueName(await listTeams(db, eventId), data.name, teamId, 'team');
  }
  await fs.collection(C.teams).doc(String(teamId)).set(
    {
      name: data.name ?? team.name,
      admin_points: data.adminPoints ?? team.admin_points,
      bonus_label: data.bonusLabel !== undefined ? data.bonusLabel : team.bonus_label,
    },
    { merge: true },
  );
  return (await fs.collection(C.teams).doc(String(teamId)).get()).data() as TeamRow;
}

export async function deleteTeam(_db: DB, eventId: number, teamId: number): Promise<void> {
  const doc = await fs.collection(C.teams).doc(String(teamId)).get();
  const team = doc.exists ? (doc.data() as TeamRow) : undefined;
  if (!team || team.event_id !== eventId) throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
  await deleteQuery(fs.collection(C.scores).where('team_id', '==', teamId));
  await deleteQuery(fs.collection(C.teamCriteria).where('team_id', '==', teamId));
  await deleteQuery(fs.collection(C.votes).where('voted_team_id', '==', teamId));
  await fs.collection(C.teams).doc(String(teamId)).delete();
}

// --- ACTIVITIES ---

export async function listActivities(_db: DB, eventId: number): Promise<ActivityRow[]> {
  return byId(await whereEvent<ActivityRow>(C.activities, eventId));
}

export async function getActivity(_db: DB, activityId: number): Promise<ActivityRow> {
  const doc = await fs.collection(C.activities).doc(String(activityId)).get();
  if (!doc.exists) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  return doc.data() as ActivityRow;
}

export async function createActivity(
  db: DB,
  eventId: number,
  name: string,
  workshop: string | null = null,
): Promise<{ id: number }> {
  await getEvent(db, eventId);
  assertUniqueName(await listActivities(db, eventId), name, null, 'activity');
  const id = await nextId(C.activities);
  await fs.collection(C.activities).doc(String(id)).set({
    id,
    event_id: eventId,
    name,
    coefficient: 1,
    workshop,
    scoring_mode: 'criteria',
  });
  return { id };
}

export async function updateActivity(
  db: DB,
  activityId: number,
  data: { name?: string; coefficient?: number; workshop?: string | null; scoringMode?: string },
): Promise<ActivityRow> {
  const activity = await getActivity(db, activityId);
  if (data.name !== undefined) {
    assertUniqueName(await listActivities(db, activity.event_id), data.name, activityId, 'activity');
  }
  await fs.collection(C.activities).doc(String(activityId)).set(
    {
      name: data.name ?? activity.name,
      coefficient: data.coefficient ?? activity.coefficient,
      workshop: data.workshop !== undefined ? data.workshop : activity.workshop,
      scoring_mode: data.scoringMode ?? activity.scoring_mode,
    },
    { merge: true },
  );
  return getActivity(db, activityId);
}

export async function deleteActivity(_db: DB, activityId: number): Promise<void> {
  const doc = await fs.collection(C.activities).doc(String(activityId)).get();
  if (!doc.exists) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  await deleteQuery(fs.collection(C.criteria).where('activity_id', '==', activityId));
  await deleteQuery(fs.collection(C.scores).where('activity_id', '==', activityId));
  await fs.collection(C.activities).doc(String(activityId)).delete();
}

// --- CRITERIA ---

export async function getCriterionActivity(
  _db: DB,
  criterionId: number,
): Promise<{ activity_id: number; event_id: number }> {
  const doc = await fs.collection(C.criteria).doc(String(criterionId)).get();
  if (!doc.exists) throw new AppError(404, 'CRITERION_NOT_FOUND', 'Criterion not found');
  const activityId = (doc.data() as CriterionRow).activity_id;
  const act = await fs.collection(C.activities).doc(String(activityId)).get();
  if (!act.exists) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  return { activity_id: activityId, event_id: (act.data() as ActivityRow).event_id };
}

export async function listCriteria(_db: DB, activityId: number): Promise<CriterionRow[]> {
  const snap = await fs.collection(C.criteria).where('activity_id', '==', activityId).get();
  return (snap.docs.map((d) => d.data() as CriterionRow)).sort(
    (a, b) => a.position - b.position || a.id - b.id,
  );
}

export async function addCriterion(
  db: DB,
  activityId: number,
  label: string,
  points: number,
): Promise<{ id: number }> {
  await getActivity(db, activityId);
  const existing = await listCriteria(db, activityId);
  const position = existing.length ? Math.max(...existing.map((c) => c.position)) + 1 : 0;
  const id = await nextId(C.criteria);
  await fs.collection(C.criteria).doc(String(id)).set({ id, activity_id: activityId, label, points, position });
  return { id };
}

export async function updateCriterion(
  db: DB,
  criterionId: number,
  data: { label?: string; points?: number },
): Promise<CriterionRow> {
  const doc = await fs.collection(C.criteria).doc(String(criterionId)).get();
  if (!doc.exists) throw new AppError(404, 'CRITERION_NOT_FOUND', 'Criterion not found');
  const c = doc.data() as CriterionRow;
  await fs.collection(C.criteria).doc(String(criterionId)).set(
    { label: data.label ?? c.label, points: data.points ?? c.points },
    { merge: true },
  );
  await recomputeActivityScores(db, c.activity_id);
  return (await fs.collection(C.criteria).doc(String(criterionId)).get()).data() as CriterionRow;
}

export async function deleteCriterion(db: DB, criterionId: number): Promise<void> {
  const doc = await fs.collection(C.criteria).doc(String(criterionId)).get();
  if (!doc.exists) throw new AppError(404, 'CRITERION_NOT_FOUND', 'Criterion not found');
  const c = doc.data() as CriterionRow;
  await deleteQuery(fs.collection(C.teamCriteria).where('criterion_id', '==', criterionId));
  await fs.collection(C.criteria).doc(String(criterionId)).delete();
  await recomputeActivityScores(db, c.activity_id);
}

async function scoreDocId(activityId: number, teamId: number) {
  return `${activityId}_${teamId}`;
}

/** Recompute the stored activity_scores.points for one team from its checked criteria. */
async function recomputeTeamActivityScore(db: DB, activityId: number, teamId: number): Promise<void> {
  const criteria = await listCriteria(db, activityId);
  const critById = new Map(criteria.map((c) => [c.id, c.points]));
  const tcSnap = await fs.collection(C.teamCriteria).where('team_id', '==', teamId).get();
  let total = 0;
  for (const d of tcSnap.docs) {
    const cid = (d.data() as { criterion_id: number }).criterion_id;
    if (critById.has(cid)) total += critById.get(cid)!;
  }
  const ref = fs.collection(C.scores).doc(await scoreDocId(activityId, teamId));
  if (total > 0) {
    await ref.set({ id: 0, activity_id: activityId, team_id: teamId, points: total });
  } else {
    await ref.delete().catch(() => undefined);
  }
}

async function recomputeActivityScores(db: DB, activityId: number): Promise<void> {
  const activity = await getActivity(db, activityId);
  for (const team of await listTeams(db, activity.event_id)) {
    await recomputeTeamActivityScore(db, activityId, team.id);
  }
}

export async function toggleCriterion(
  db: DB,
  criterionId: number,
  teamId: number,
  achieved: boolean,
): Promise<void> {
  const doc = await fs.collection(C.criteria).doc(String(criterionId)).get();
  if (!doc.exists) throw new AppError(404, 'CRITERION_NOT_FOUND', 'Criterion not found');
  const activityId = (doc.data() as CriterionRow).activity_id;
  const ref = fs.collection(C.teamCriteria).doc(`${teamId}_${criterionId}`);
  if (achieved) {
    await ref.set({ team_id: teamId, criterion_id: criterionId });
  } else {
    await ref.delete().catch(() => undefined);
  }
  await recomputeTeamActivityScore(db, activityId, teamId);
}

export interface ActivityScoring {
  activity: { id: number; name: string; scoring_mode: string };
  criteria: CriterionRow[];
  scores: { team_id: number; points: number }[];
  teamCriteria: { team_id: number; criterion_id: number }[];
}

export async function getActivityScoring(db: DB, activityId: number): Promise<ActivityScoring> {
  const activity = await getActivity(db, activityId);
  const criteria = await listCriteria(db, activityId);
  const scores = (await listScores(db, activityId)).map((s) => ({ team_id: s.team_id, points: s.points }));
  const critIds = new Set(criteria.map((c) => c.id));
  const teamCriteria: { team_id: number; criterion_id: number }[] = [];
  // team_criteria has no activity_id; gather per criterion (few criteria).
  for (const cid of critIds) {
    const snap = await fs.collection(C.teamCriteria).where('criterion_id', '==', cid).get();
    for (const d of snap.docs) {
      const x = d.data() as { team_id: number; criterion_id: number };
      teamCriteria.push({ team_id: x.team_id, criterion_id: x.criterion_id });
    }
  }
  return {
    activity: { id: activity.id, name: activity.name, scoring_mode: activity.scoring_mode },
    criteria,
    scores,
    teamCriteria,
  };
}

export async function resetScores(db: DB, eventId: number): Promise<void> {
  await getEvent(db, eventId);
  for (const a of await listActivities(db, eventId)) {
    await deleteQuery(fs.collection(C.scores).where('activity_id', '==', a.id));
    for (const c of await listCriteria(db, a.id)) {
      await deleteQuery(fs.collection(C.teamCriteria).where('criterion_id', '==', c.id));
    }
  }
}

export async function listScores(_db: DB, activityId: number): Promise<ActivityScoreRow[]> {
  const snap = await fs.collection(C.scores).where('activity_id', '==', activityId).get();
  return snap.docs.map((d) => d.data() as ActivityScoreRow);
}

/** Set absolute points for a team on an activity (free mode, e.g. Kahoot). */
export async function setActivityScore(
  db: DB,
  activityId: number,
  teamId: number,
  points: number | null,
): Promise<void> {
  await getActivity(db, activityId);
  const ref = fs.collection(C.scores).doc(`${activityId}_${teamId}`);
  if (points === null || points === 0) {
    await ref.delete().catch(() => undefined);
    return;
  }
  await ref.set({ id: 0, activity_id: activityId, team_id: teamId, points });
}

// --- PARTICIPANTS ---

export async function registerParticipant(
  _db: DB,
  data: { pseudo: string; deviceId: string; qrToken?: string; teamId?: number; eventId?: number },
): Promise<ParticipantRow> {
  let team: Pick<TeamRow, 'id' | 'event_id'> | undefined;
  if (data.qrToken) {
    const snap = await fs.collection(C.teams).where('qr_token', '==', data.qrToken).limit(1).get();
    if (!snap.empty) team = snap.docs[0].data() as TeamRow;
  } else if (data.teamId && data.eventId) {
    const doc = await fs.collection(C.teams).doc(String(data.teamId)).get();
    const t = doc.exists ? (doc.data() as TeamRow) : undefined;
    if (t && t.event_id === data.eventId) team = t;
  }
  if (!team) throw new AppError(404, 'INVALID_QR', 'Invalid QR code or team');

  const safeDevice = data.deviceId.replace(/[^a-zA-Z0-9_-]/g, '');
  const indexRef = fs.collection(C.participantIndex).doc(`${team.event_id}__${safeDevice}`);
  const indexDoc = await indexRef.get();
  if (indexDoc.exists) {
    const pid = (indexDoc.data() as { participant_id: number }).participant_id;
    const p = await fs.collection(C.participants).doc(String(pid)).get();
    if (p.exists) return p.data() as ParticipantRow;
  }

  const id = await nextId(C.participants);
  const participant: ParticipantRow = {
    id,
    pseudo: data.pseudo,
    team_id: team.id,
    event_id: team.event_id,
    device_id: data.deviceId,
  };
  await fs.collection(C.participants).doc(String(id)).set(participant);
  await indexRef.set({ participant_id: id, event_id: team.event_id });
  return participant;
}

export async function getParticipant(_db: DB, id: number): Promise<ParticipantRow> {
  const doc = await fs.collection(C.participants).doc(String(id)).get();
  if (!doc.exists) throw new AppError(404, 'PARTICIPANT_NOT_FOUND', 'Participant not found');
  return doc.data() as ParticipantRow;
}

export async function getParticipantVotes(_db: DB, participantId: number): Promise<VoteRow[]> {
  const snap = await fs.collection(C.votes).where('participant_id', '==', participantId).get();
  return snap.docs.map((d) => d.data() as VoteRow);
}

// --- VOTES ---

export async function castVote(
  db: DB,
  participantId: number,
  votedTeamId: number,
): Promise<{ id: number }> {
  const participant = await getParticipant(db, participantId);
  const event = await getEvent(db, participant.event_id);
  if (!event.voting_enabled) throw new AppError(403, 'VOTING_DISABLED', 'Voting is disabled for this event');
  if (event.status !== 'open') throw new AppError(403, 'EVENT_CLOSED', 'Voting is closed for this event');
  if (participant.team_id === votedTeamId) throw new AppError(403, 'OWN_TEAM', 'You cannot vote for your own team');

  const target = await fs.collection(C.teams).doc(String(votedTeamId)).get();
  if (!target.exists || (target.data() as TeamRow).event_id !== participant.event_id) {
    throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found in this event');
  }

  const votes = await getParticipantVotes(db, participantId);
  if (votes.length >= event.max_votes) {
    throw new AppError(403, 'VOTE_LIMIT', `You can only vote for up to ${event.max_votes} teams`);
  }

  const ref = fs.collection(C.votes).doc(`${participantId}_${votedTeamId}`);
  try {
    const id = await nextId(C.votes);
    await ref.create({
      id,
      participant_id: participantId,
      voted_team_id: votedTeamId,
      event_id: participant.event_id,
      timestamp: new Date().toISOString(),
    });
    return { id };
  } catch (err) {
    if ((err as { code?: number }).code === 6 /* ALREADY_EXISTS */) {
      throw new AppError(409, 'ALREADY_VOTED', 'You have already voted for this team');
    }
    throw err;
  }
}

// --- RANKINGS ---

/** Count votes received by a team. */
async function votesForTeam(teamId: number): Promise<number> {
  const snap = await fs.collection(C.votes).where('voted_team_id', '==', teamId).get();
  return snap.size;
}

/** Map of activityId/teamId → points for an event, plus helpers. */
async function eventScores(eventId: number): Promise<Map<string, number>> {
  const activities = await whereEvent<ActivityRow>(C.activities, eventId);
  const map = new Map<string, number>();
  for (const a of activities) {
    const snap = await fs.collection(C.scores).where('activity_id', '==', a.id).get();
    for (const d of snap.docs) {
      const s = d.data() as ActivityScoreRow;
      map.set(`${s.activity_id}_${s.team_id}`, s.points);
    }
  }
  return map;
}

export async function rankingByActivity(
  db: DB,
  eventId: number,
  activityId: number,
): Promise<{ ranking: RankingEntry[]; activityName: string }> {
  const teams = await listTeams(db, eventId);
  const scoreSnap = await fs.collection(C.scores).where('activity_id', '==', activityId).get();
  const points = new Map<number, number>();
  for (const d of scoreSnap.docs) {
    const s = d.data() as ActivityScoreRow;
    points.set(s.team_id, s.points);
  }
  const ranking = teams
    .map((t) => ({ id: t.id, name: t.name, score: points.get(t.id) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const actDoc = await fs.collection(C.activities).doc(String(activityId)).get();
  return { ranking, activityName: actDoc.exists ? (actDoc.data() as ActivityRow).name : 'Unknown' };
}

export async function rankingByVotes(db: DB, eventId: number): Promise<RankingEntry[]> {
  const teams = await listTeams(db, eventId);
  const entries = await Promise.all(
    teams.map(async (t) => ({ id: t.id, name: t.name, score: await votesForTeam(t.id) })),
  );
  return entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** General ranking = Σ(activity points × coefficient) + votes + admin bonus. */
export async function rankingGlobal(db: DB, eventId: number): Promise<RankingEntry[]> {
  const teams = await listTeams(db, eventId);
  const activities = await listActivities(db, eventId);
  const scores = await eventScores(eventId);
  const entries = await Promise.all(
    teams.map(async (t) => {
      let score = 0;
      for (const a of activities) score += (scores.get(`${a.id}_${t.id}`) ?? 0) * a.coefficient;
      score += (await votesForTeam(t.id)) + t.admin_points;
      return { id: t.id, name: t.name, score };
    }),
  );
  return entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export async function rankingByWorkshop(db: DB, eventId: number): Promise<WorkshopRanking[]> {
  const activities = await listActivities(db, eventId);
  const teams = await listTeams(db, eventId);
  const scores = await eventScores(eventId);

  const groups: { key: string; acts: { id: number; coef: number }[] }[] = [];
  const byKey = new Map<string, (typeof groups)[number]>();
  for (const a of activities) {
    const key = a.workshop && a.workshop.trim() ? a.workshop.trim() : a.name;
    let g = byKey.get(key);
    if (!g) {
      g = { key, acts: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.acts.push({ id: a.id, coef: a.coefficient });
  }

  return groups.map((group) => {
    const ranking = teams
      .map((team) => {
        let score = 0;
        for (const a of group.acts) score += (scores.get(`${a.id}_${team.id}`) ?? 0) * a.coef;
        return { id: team.id, name: team.name, score };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return { workshop: group.key, ranking };
  });
}

export interface EventReport {
  event: EventRow;
  rankingMode: string;
  activities: { id: number; name: string; coefficient: number }[];
  teams: {
    id: number;
    name: string;
    activityPoints: Record<number, number>;
    activityTotal: number;
    votes: number;
    bonus: number;
    bonusLabel: string | null;
    total: number;
  }[];
  participantCount: number;
  generatedAt: string;
}

export async function getEventReport(db: DB, eventId: number): Promise<EventReport> {
  const event = await getEvent(db, eventId);
  const activities = (await listActivities(db, eventId)).map((a) => ({
    id: a.id,
    name: a.name,
    coefficient: a.coefficient,
  }));
  const teams = await listTeams(db, eventId);
  const scores = await eventScores(eventId);

  const rows = await Promise.all(
    teams.map(async (team) => {
      const activityPoints: Record<number, number> = {};
      let activityTotal = 0;
      for (const activity of activities) {
        const pts = scores.get(`${activity.id}_${team.id}`) ?? 0;
        activityPoints[activity.id] = pts;
        activityTotal += pts * activity.coefficient;
      }
      const votes = await votesForTeam(team.id);
      return {
        id: team.id,
        name: team.name,
        activityPoints,
        activityTotal,
        votes,
        bonus: team.admin_points,
        bonusLabel: team.bonus_label,
        total: activityTotal + votes + team.admin_points,
      };
    }),
  );
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const partSnap = await fs.collection(C.participants).where('event_id', '==', eventId).get();

  return {
    event,
    rankingMode: event.ranking_mode,
    activities,
    teams: rows,
    participantCount: partSnap.size,
    generatedAt: new Date().toISOString(),
  };
}

export interface EventStats {
  teams: number;
  participants: number;
  votes: number;
  activitiesTotal: number;
  activitiesScored: number;
  perTeam: { id: number; name: string; participants: number; votes: number }[];
}

export async function getEventStats(db: DB, eventId: number): Promise<EventStats> {
  await getEvent(db, eventId);
  const teams = await listTeams(db, eventId);
  const activities = await listActivities(db, eventId);

  let activitiesScored = 0;
  for (const a of activities) {
    const snap = await fs.collection(C.scores).where('activity_id', '==', a.id).limit(1).get();
    if (!snap.empty) activitiesScored++;
  }

  const perTeam = await Promise.all(
    teams.map(async (team) => {
      const partSnap = await fs.collection(C.participants).where('team_id', '==', team.id).get();
      return { id: team.id, name: team.name, participants: partSnap.size, votes: await votesForTeam(team.id) };
    }),
  );

  const partSnap = await fs.collection(C.participants).where('event_id', '==', eventId).get();
  const voteSnap = await fs.collection(C.votes).where('event_id', '==', eventId).get();

  return {
    teams: teams.length,
    participants: partSnap.size,
    votes: voteSnap.size,
    activitiesTotal: activities.length,
    activitiesScored,
    perTeam,
  };
}

// --- SETTINGS (admin password hash) ---

export async function getSetting(key: string): Promise<string | null> {
  const doc = await fs.collection(C.settings).doc(key).get();
  return doc.exists ? (doc.data() as { value: string }).value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await fs.collection(C.settings).doc(key).set({ value });
}
