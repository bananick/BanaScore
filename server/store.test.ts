import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, type DB } from './db';
import { AppError } from './errors';
import * as store from './store';

/** Build a fresh in-memory database with one event for each test. */
function setup(): { db: DB; eventId: number } {
  const db = createDb(':memory:');
  const { id } = store.createEvent(db, { name: 'Party', date: null, location: null });
  return { db, eventId: id };
}

/** Register a participant for a given team via its QR token. */
function join(db: DB, qrToken: string, pseudo: string, deviceId: string) {
  return store.registerParticipant(db, { pseudo, qrToken, deviceId });
}

function expectAppError(fn: () => void, code: string) {
  assert.throws(fn, (err) => err instanceof AppError && err.code === code);
}

test('registration is idempotent per device + event', () => {
  const { db, eventId } = setup();
  const team = store.createTeam(db, eventId, 'Reds');
  const first = join(db, team.qr_token, 'Alice', 'device-1');
  const second = join(db, team.qr_token, 'Alice2', 'device-1');
  assert.equal(first.id, second.id, 'same device returns the same participant');
  assert.equal(second.pseudo, 'Alice', 'existing pseudo is preserved');
});

test('cannot vote for your own team', () => {
  const { db, eventId } = setup();
  const reds = store.createTeam(db, eventId, 'Reds');
  const alice = join(db, reds.qr_token, 'Alice', 'd1');
  expectAppError(() => store.castVote(db, alice.id, reds.id), 'OWN_TEAM');
});

test('a participant can cast at most 3 votes', () => {
  const { db, eventId } = setup();
  const mine = store.createTeam(db, eventId, 'Mine');
  const others = ['A', 'B', 'C', 'D'].map((n) => store.createTeam(db, eventId, n));
  const me = join(db, mine.qr_token, 'Me', 'd1');

  store.castVote(db, me.id, others[0].id);
  store.castVote(db, me.id, others[1].id);
  store.castVote(db, me.id, others[2].id);
  expectAppError(() => store.castVote(db, me.id, others[3].id), 'VOTE_LIMIT');
});

test('cannot vote twice for the same team', () => {
  const { db, eventId } = setup();
  const mine = store.createTeam(db, eventId, 'Mine');
  const other = store.createTeam(db, eventId, 'Other');
  const me = join(db, mine.qr_token, 'Me', 'd1');

  store.castVote(db, me.id, other.id);
  expectAppError(() => store.castVote(db, me.id, other.id), 'ALREADY_VOTED');
});

test('cannot vote on a closed event', () => {
  const { db, eventId } = setup();
  const mine = store.createTeam(db, eventId, 'Mine');
  const other = store.createTeam(db, eventId, 'Other');
  const me = join(db, mine.qr_token, 'Me', 'd1');

  store.updateEvent(db, eventId, {
    name: 'Party',
    date: null,
    location: null,
    status: 'closed',
    maxVotes: 3,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });
  expectAppError(() => store.castVote(db, me.id, other.id), 'EVENT_CLOSED');
});

test('a rank can only be assigned to one team per activity', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  const b = store.createTeam(db, eventId, 'B');
  const activity = store.createActivity(db, eventId, 'Quiz');

  store.setActivityScore(db, activity.id, a.id, 3);
  expectAppError(() => store.setActivityScore(db, activity.id, b.id, 3), 'RANK_TAKEN');
  // Reassigning the same team to the same rank is fine.
  store.setActivityScore(db, activity.id, a.id, 3);
  // Clearing then assigning to another team works.
  store.setActivityScore(db, activity.id, a.id, null);
  store.setActivityScore(db, activity.id, b.id, 3);
  const scores = store.listScores(db, activity.id);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].team_id, b.id);
});

test('global ranking sums activity points + votes + admin bonus', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  const b = store.createTeam(db, eventId, 'B');
  const voterTeam = store.createTeam(db, eventId, 'Voters');
  const activity = store.createActivity(db, eventId, 'Quiz');

  // A: 3 activity points + 1 admin bonus. B: 1 activity point + 2 votes.
  store.setActivityScore(db, activity.id, a.id, 3);
  store.setActivityScore(db, activity.id, b.id, 1);
  store.updateTeam(db, eventId, a.id, { adminPoints: 1 });

  const v1 = join(db, voterTeam.qr_token, 'V1', 'd1');
  const v2 = store.registerParticipant(db, { pseudo: 'V2', qrToken: voterTeam.qr_token, deviceId: 'd2' });
  store.castVote(db, v1.id, b.id);
  store.castVote(db, v2.id, b.id);

  const ranking = store.rankingGlobal(db, eventId);
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

test('registering with an invalid QR token fails', () => {
  const { db } = setup();
  expectAppError(() => join(db, 'nope', 'X', 'd1'), 'INVALID_QR');
});

test('duplicate team and activity names are rejected (case-insensitive)', () => {
  const { db, eventId } = setup();
  store.createTeam(db, eventId, 'Alpha');
  expectAppError(() => store.createTeam(db, eventId, ' alpha '), 'DUPLICATE_NAME');
  store.createActivity(db, eventId, 'Quiz');
  expectAppError(() => store.createActivity(db, eventId, 'QUIZ'), 'DUPLICATE_NAME');
});

test('duplicateEvent copies structure but not scores/votes', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  store.createTeam(db, eventId, 'B');
  const activity = store.createActivity(db, eventId, 'Quiz');
  store.setActivityScore(db, activity.id, a.id, 2);
  store.updateTeam(db, eventId, a.id, { adminPoints: 5 });

  const copy = store.duplicateEvent(db, eventId, { name: 'Copie' });
  const copyTeams = store.listTeams(db, copy.id);
  const copyActivities = store.listActivities(db, copy.id);

  assert.equal(copyTeams.length, 2);
  assert.equal(copyActivities.length, 1);
  assert.deepEqual(copyTeams.map((t) => t.name).sort(), ['A', 'B']);
  // New QR tokens, no copied bonus, no copied activity scores.
  assert.notEqual(copyTeams[0].qr_token, store.listTeams(db, eventId)[0].qr_token);
  assert.equal(copyTeams.find((t) => t.name === 'A')!.admin_points, 0);
  assert.equal(store.listScores(db, copyActivities[0].id).length, 0);
});

test('activity coefficient weights the global ranking', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  const b = store.createTeam(db, eventId, 'B');
  const quiz = store.createActivity(db, eventId, 'Quiz');
  const sport = store.createActivity(db, eventId, 'Sport');
  store.updateActivity(db, quiz.id, { coefficient: 3 });
  // A wins quiz (rank 2) but loses sport (rank 1); coefficient makes A win overall.
  store.setActivityScore(db, quiz.id, a.id, 2); // 2 * 3 = 6
  store.setActivityScore(db, quiz.id, b.id, 1); // 1 * 3 = 3
  store.setActivityScore(db, sport.id, a.id, 1); // 1 * 1 = 1
  store.setActivityScore(db, sport.id, b.id, 2); // 2 * 1 = 2

  const ranking = store.rankingGlobal(db, eventId);
  assert.equal(ranking[0].id, a.id); // 7 vs 5
  assert.equal(ranking.find((r) => r.id === a.id)!.score, 7);
  assert.equal(ranking.find((r) => r.id === b.id)!.score, 5);
});

test('max_votes per event is enforced', () => {
  const { db, eventId } = setup();
  const mine = store.createTeam(db, eventId, 'Mine');
  const others = ['A', 'B'].map((n) => store.createTeam(db, eventId, n));
  store.updateEvent(db, eventId, {
    name: 'Party',
    date: null,
    location: null,
    status: 'open',
    maxVotes: 1,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });
  const me = join(db, mine.qr_token, 'Me', 'd1');
  store.castVote(db, me.id, others[0].id);
  expectAppError(() => store.castVote(db, me.id, others[1].id), 'VOTE_LIMIT');
});

test('rankingByWorkshop groups activities by atelier and sums them', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  const b = store.createTeam(db, eventId, 'B');
  // Sensory atelier with 2 activities, plus a standalone quiz atelier.
  const taste = store.createActivity(db, eventId, 'Goûter', 'Sensoriel');
  const smell = store.createActivity(db, eventId, 'Sentir', 'Sensoriel');
  const quiz = store.createActivity(db, eventId, 'Quiz', 'Quiz');

  store.setActivityScore(db, taste.id, a.id, 2);
  store.setActivityScore(db, smell.id, a.id, 2); // A sensory = 4
  store.setActivityScore(db, taste.id, b.id, 1);
  store.setActivityScore(db, smell.id, b.id, 1); // B sensory = 2
  store.setActivityScore(db, quiz.id, b.id, 2); // B quiz = 2, A quiz = 0

  const workshops = store.rankingByWorkshop(db, eventId);
  const sensory = workshops.find((w) => w.workshop === 'Sensoriel')!;
  const quizW = workshops.find((w) => w.workshop === 'Quiz')!;
  assert.equal(sensory.ranking[0].id, a.id);
  assert.equal(sensory.ranking[0].score, 4);
  assert.equal(quizW.ranking[0].id, b.id);
  assert.equal(quizW.ranking[0].score, 2);
});

test('getEventReport aggregates per-team breakdown', () => {
  const { db, eventId } = setup();
  const a = store.createTeam(db, eventId, 'A');
  const b = store.createTeam(db, eventId, 'B');
  const voters = store.createTeam(db, eventId, 'Voters');
  const activity = store.createActivity(db, eventId, 'Quiz');
  store.setActivityScore(db, activity.id, a.id, 3);
  store.updateTeam(db, eventId, a.id, { adminPoints: 2 });
  const v1 = join(db, voters.qr_token, 'V1', 'd1');
  store.castVote(db, v1.id, b.id);

  const report = store.getEventReport(db, eventId);
  const teamA = report.teams.find((t) => t.id === a.id)!;
  const teamB = report.teams.find((t) => t.id === b.id)!;
  assert.equal(teamA.total, 5); // 3 activity + 0 votes + 2 bonus
  assert.equal(teamA.activityPoints[activity.id], 3);
  assert.equal(teamB.votes, 1);
  assert.equal(report.teams[0].id, a.id); // sorted by total desc
  assert.equal(report.participantCount, 1);
});
