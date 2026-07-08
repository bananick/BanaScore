import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db, type DB } from './db';
import { AppError } from './errors';
import * as store from './store';

/**
 * These tests run against the Firestore emulator. Start it first, e.g.:
 *   npm run test:emulator
 * which wraps the runner in `firebase emulators:exec`. FIRESTORE_EMULATOR_HOST
 * must point at the running emulator (set automatically by emulators:exec).
 */

/** Create a fresh event; every test scopes its data under its own event. */
async function setup(): Promise<{ db: DB; eventId: number }> {
  const { id } = await store.createEvent(db, { name: 'Party', date: null, location: null });
  return { db, eventId: id };
}

/** Register a participant for a given team via its QR token. */
function join(db: DB, qrToken: string, pseudo: string, deviceId: string) {
  return store.registerParticipant(db, { pseudo, qrToken, deviceId });
}

async function expectAppError(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(fn, (err) => err instanceof AppError && err.code === code);
}

test('registration is idempotent per device + event', async () => {
  const { db, eventId } = await setup();
  const team = await store.createTeam(db, eventId, 'Reds');
  const first = await join(db, team.qr_token, 'Alice', 'device-1');
  const second = await join(db, team.qr_token, 'Alice2', 'device-1');
  assert.equal(first.id, second.id, 'same device returns the same participant');
  assert.equal(second.pseudo, 'Alice', 'existing pseudo is preserved');
});

test('cannot vote for your own team', async () => {
  const { db, eventId } = await setup();
  const reds = await store.createTeam(db, eventId, 'Reds');
  const alice = await join(db, reds.qr_token, 'Alice', 'd1');
  await expectAppError(() => store.castVote(db, alice.id, reds.id), 'OWN_TEAM');
});

test('a participant can cast at most 3 votes', async () => {
  const { db, eventId } = await setup();
  const mine = await store.createTeam(db, eventId, 'Mine');
  const others: { id: number; qr_token: string }[] = [];
  for (const n of ['A', 'B', 'C', 'D']) others.push(await store.createTeam(db, eventId, n));
  const me = await join(db, mine.qr_token, 'Me', 'd1');

  await store.castVote(db, me.id, others[0].id);
  await store.castVote(db, me.id, others[1].id);
  await store.castVote(db, me.id, others[2].id);
  await expectAppError(() => store.castVote(db, me.id, others[3].id), 'VOTE_LIMIT');
});

test('cannot vote twice for the same team', async () => {
  const { db, eventId } = await setup();
  const mine = await store.createTeam(db, eventId, 'Mine');
  const other = await store.createTeam(db, eventId, 'Other');
  const me = await join(db, mine.qr_token, 'Me', 'd1');

  await store.castVote(db, me.id, other.id);
  await expectAppError(() => store.castVote(db, me.id, other.id), 'ALREADY_VOTED');
});

test('cannot vote on a closed event', async () => {
  const { db, eventId } = await setup();
  const mine = await store.createTeam(db, eventId, 'Mine');
  const other = await store.createTeam(db, eventId, 'Other');
  const me = await join(db, mine.qr_token, 'Me', 'd1');

  await store.updateEvent(db, eventId, {
    name: 'Party',
    date: null,
    location: null,
    status: 'closed',
    maxVotes: 3,
    votingEnabled: true,
    rankingMode: 'raw',
    workshopWeights: null,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });
  await expectAppError(() => store.castVote(db, me.id, other.id), 'EVENT_CLOSED');
});

test('voting can be disabled per event', async () => {
  const { db, eventId } = await setup();
  const mine = await store.createTeam(db, eventId, 'Mine');
  const other = await store.createTeam(db, eventId, 'Other');
  const me = await join(db, mine.qr_token, 'Me', 'd1');
  await store.updateEvent(db, eventId, {
    name: 'Party',
    date: null,
    location: null,
    status: 'open',
    maxVotes: 3,
    votingEnabled: false,
    rankingMode: 'raw',
    workshopWeights: null,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });
  await expectAppError(() => store.castVote(db, me.id, other.id), 'VOTING_DISABLED');
});

test('criteria scoring: team activity score = sum of achieved criteria', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const taste = await store.createActivity(db, eventId, 'Goûter', 'Sensoriel');
  await store.updateActivity(db, taste.id, { scoringMode: 'criteria' });
  const eaten = await store.addCriterion(db, taste.id, 'Insecte mangé', 1000);
  const found = await store.addCriterion(db, taste.id, 'Goût trouvé', 2000);

  await store.toggleCriterion(db, eaten.id, a.id, true);
  let scores = await store.listScores(db, taste.id);
  assert.equal(scores[0].points, 1000);
  await store.toggleCriterion(db, found.id, a.id, true);
  scores = await store.listScores(db, taste.id);
  assert.equal(scores[0].points, 3000); // 1000 + 2000
  // Untoggle one criterion.
  await store.toggleCriterion(db, eaten.id, a.id, false);
  scores = await store.listScores(db, taste.id);
  assert.equal(scores[0].points, 2000);

  // The scoring payload reflects the checked criterion.
  const scoring = await store.getActivityScoring(db, taste.id);
  assert.equal(scoring.criteria.length, 2);
  assert.deepEqual(
    scoring.teamCriteria.map((tc) => tc.criterion_id),
    [found.id],
  );
});

test('resetScores clears free points and criteria selections', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const quiz = await store.createActivity(db, eventId, 'Quiz');
  await store.updateActivity(db, quiz.id, { scoringMode: 'free' });
  await store.setActivityScore(db, quiz.id, a.id, 3250);
  const sens = await store.createActivity(db, eventId, 'Voir');
  const found = await store.addCriterion(db, sens.id, 'Trouvé', 2000);
  await store.toggleCriterion(db, found.id, a.id, true);

  assert.ok((await store.rankingGlobal(db, eventId))[0].score > 0);
  await store.resetScores(db, eventId);
  assert.equal((await store.listScores(db, quiz.id)).length, 0);
  assert.equal((await store.getActivityScoring(db, sens.id)).teamCriteria.length, 0);
  assert.equal((await store.rankingGlobal(db, eventId))[0].score, 0);
});

test('global ranking sums activity points + votes + admin bonus', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const b = await store.createTeam(db, eventId, 'B');
  const voterTeam = await store.createTeam(db, eventId, 'Voters');
  const activity = await store.createActivity(db, eventId, 'Quiz');

  // A: 3 activity points + 1 admin bonus. B: 1 activity point + 2 votes.
  await store.setActivityScore(db, activity.id, a.id, 3);
  await store.setActivityScore(db, activity.id, b.id, 1);
  await store.updateTeam(db, eventId, a.id, { adminPoints: 1 });

  const v1 = await join(db, voterTeam.qr_token, 'V1', 'd1');
  const v2 = await store.registerParticipant(db, {
    pseudo: 'V2',
    qrToken: voterTeam.qr_token,
    deviceId: 'd2',
  });
  await store.castVote(db, v1.id, b.id);
  await store.castVote(db, v2.id, b.id);

  const ranking = await store.rankingGlobal(db, eventId);
  const byId = new Map(ranking.map((r) => [r.id, r.score]));
  assert.equal(byId.get(a.id), 4); // 3 + 0 votes + 1 bonus
  assert.equal(byId.get(b.id), 3); // 1 + 2 votes + 0 bonus
  assert.equal(byId.get(voterTeam.id), 0);
  // Ranking is sorted by score desc.
  assert.deepEqual(
    ranking.map((r) => r.id),
    [a.id, b.id, voterTeam.id],
  );
});

test('registering with an invalid QR token fails', async () => {
  const { db } = await setup();
  await expectAppError(() => join(db, 'nope', 'X', 'd1'), 'INVALID_QR');
});

test('registering by teamId+eventId works (event-level join, no token exposed)', async () => {
  const { db, eventId } = await setup();
  const team = await store.createTeam(db, eventId, 'Reds');
  const p = await store.registerParticipant(db, {
    pseudo: 'Al',
    deviceId: 'd9',
    teamId: team.id,
    eventId,
  });
  assert.equal(p.team_id, team.id);
  assert.equal(p.event_id, eventId);
  // Wrong event for that team is rejected.
  await expectAppError(
    () =>
      store.registerParticipant(db, { pseudo: 'X', deviceId: 'd10', teamId: team.id, eventId: 999999 }),
    'INVALID_QR',
  );
});

test('duplicate team and activity names are rejected (case-insensitive)', async () => {
  const { db, eventId } = await setup();
  await store.createTeam(db, eventId, 'Alpha');
  await expectAppError(() => store.createTeam(db, eventId, ' alpha '), 'DUPLICATE_NAME');
  await store.createActivity(db, eventId, 'Quiz');
  await expectAppError(() => store.createActivity(db, eventId, 'QUIZ'), 'DUPLICATE_NAME');
});

test('duplicateEvent copies structure but not scores/votes', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  await store.createTeam(db, eventId, 'B');
  const activity = await store.createActivity(db, eventId, 'Quiz');
  await store.setActivityScore(db, activity.id, a.id, 2);
  await store.updateTeam(db, eventId, a.id, { adminPoints: 5 });

  const copy = await store.duplicateEvent(db, eventId, { name: 'Copie' });
  const copyTeams = await store.listTeams(db, copy.id);
  const copyActivities = await store.listActivities(db, copy.id);

  assert.equal(copyTeams.length, 2);
  assert.equal(copyActivities.length, 1);
  assert.deepEqual(copyTeams.map((t) => t.name).sort(), ['A', 'B']);
  // New QR tokens, no copied bonus, no copied activity scores.
  assert.notEqual(copyTeams[0].qr_token, (await store.listTeams(db, eventId))[0].qr_token);
  assert.equal(copyTeams.find((t) => t.name === 'A')!.admin_points, 0);
  assert.equal((await store.listScores(db, copyActivities[0].id)).length, 0);
});

test('activity coefficient weights the global ranking', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const b = await store.createTeam(db, eventId, 'B');
  const quiz = await store.createActivity(db, eventId, 'Quiz');
  const sport = await store.createActivity(db, eventId, 'Sport');
  await store.updateActivity(db, quiz.id, { coefficient: 3 });
  // A wins quiz (rank 2) but loses sport (rank 1); coefficient makes A win overall.
  await store.setActivityScore(db, quiz.id, a.id, 2); // 2 * 3 = 6
  await store.setActivityScore(db, quiz.id, b.id, 1); // 1 * 3 = 3
  await store.setActivityScore(db, sport.id, a.id, 1); // 1 * 1 = 1
  await store.setActivityScore(db, sport.id, b.id, 2); // 2 * 1 = 2

  const ranking = await store.rankingGlobal(db, eventId);
  assert.equal(ranking[0].id, a.id); // 7 vs 5
  assert.equal(ranking.find((r) => r.id === a.id)!.score, 7);
  assert.equal(ranking.find((r) => r.id === b.id)!.score, 5);
});

test('max_votes per event is enforced', async () => {
  const { db, eventId } = await setup();
  const mine = await store.createTeam(db, eventId, 'Mine');
  const others: { id: number; qr_token: string }[] = [];
  for (const n of ['A', 'B']) others.push(await store.createTeam(db, eventId, n));
  await store.updateEvent(db, eventId, {
    name: 'Party',
    date: null,
    location: null,
    status: 'open',
    maxVotes: 1,
    votingEnabled: true,
    rankingMode: 'raw',
    workshopWeights: null,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });
  const me = await join(db, mine.qr_token, 'Me', 'd1');
  await store.castVote(db, me.id, others[0].id);
  await expectAppError(() => store.castVote(db, me.id, others[1].id), 'VOTE_LIMIT');
});

test('rankingByWorkshop groups activities by atelier and sums them', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const b = await store.createTeam(db, eventId, 'B');
  // Sensory atelier with 2 activities, plus a standalone quiz atelier.
  const taste = await store.createActivity(db, eventId, 'Goûter', 'Sensoriel');
  const smell = await store.createActivity(db, eventId, 'Sentir', 'Sensoriel');
  const quiz = await store.createActivity(db, eventId, 'Quiz', 'Quiz');

  await store.setActivityScore(db, taste.id, a.id, 2);
  await store.setActivityScore(db, smell.id, a.id, 2); // A sensory = 4
  await store.setActivityScore(db, taste.id, b.id, 1);
  await store.setActivityScore(db, smell.id, b.id, 1); // B sensory = 2
  await store.setActivityScore(db, quiz.id, b.id, 2); // B quiz = 2, A quiz = 0

  const workshops = await store.rankingByWorkshop(db, eventId);
  const sensory = workshops.find((w) => w.workshop === 'Sensoriel')!;
  const quizW = workshops.find((w) => w.workshop === 'Quiz')!;
  assert.equal(sensory.ranking[0].id, a.id);
  assert.equal(sensory.ranking[0].score, 4);
  assert.equal(quizW.ranking[0].id, b.id);
  assert.equal(quizW.ranking[0].score, 2);
});

test('preset mode stores a point ladder and scores like free points', async () => {
  const { db, eventId } = await setup();
  const rougeA = await store.createTeam(db, eventId, 'Rouge A');
  const nerf = await store.createActivity(db, eventId, 'Nerf');
  await store.updateActivity(db, nerf.id, {
    scoringMode: 'preset',
    presetPoints: [600, 500, 400, 300, 200, 100, 0],
  });

  const scoring = await store.getActivityScoring(db, nerf.id);
  assert.equal(scoring.activity.scoring_mode, 'preset');
  assert.deepEqual(scoring.activity.preset_points, [600, 500, 400, 300, 200, 100, 0]);

  await store.setActivityScore(db, nerf.id, rougeA.id, 500);
  const ranking = await store.rankingGlobal(db, eventId);
  assert.equal(ranking.find((r) => r.id === rougeA.id)!.score, 500);
});

test('getEventReport aggregates per-team breakdown', async () => {
  const { db, eventId } = await setup();
  const a = await store.createTeam(db, eventId, 'A');
  const b = await store.createTeam(db, eventId, 'B');
  const voters = await store.createTeam(db, eventId, 'Voters');
  const activity = await store.createActivity(db, eventId, 'Quiz');
  await store.setActivityScore(db, activity.id, a.id, 3);
  await store.updateTeam(db, eventId, a.id, { adminPoints: 2 });
  const v1 = await join(db, voters.qr_token, 'V1', 'd1');
  await store.castVote(db, v1.id, b.id);

  const report = await store.getEventReport(db, eventId);
  const teamA = report.teams.find((t) => t.id === a.id)!;
  const teamB = report.teams.find((t) => t.id === b.id)!;
  assert.equal(teamA.total, 5); // 3 activity + 0 votes + 2 bonus
  assert.equal(teamA.activityPoints[activity.id], 3);
  assert.equal(teamB.votes, 1);
  assert.equal(report.teams[0].id, a.id); // sorted by total desc
  assert.equal(report.participantCount, 1);
});
