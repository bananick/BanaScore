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

  store.updateEvent(db, eventId, { name: 'Party', date: null, location: null, status: 'closed' });
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
