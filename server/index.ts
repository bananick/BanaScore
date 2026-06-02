import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db';
import { handle, sendError } from './errors';
import { requireAdmin, checkPassword, issueToken } from './auth';
import { optString, reqInt, reqStatus, reqString } from './validation';
import * as store from './store';

const app = express();
const port = Number(process.env.PORT) || 3001;

// CORS: restrict to a comma-separated allowlist in production via CORS_ORIGIN.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((o) => o.trim()) }
      : undefined, // dev: reflect request origin
  ),
);
app.use(express.json());

const id = (req: Request, key: string) => reqInt(req.params[key], key, { min: 1 });

// --- ADMIN AUTH ---
app.post(
  '/api/admin/login',
  handle((req, res) => {
    if (!checkPassword(req.body?.password)) {
      sendError(res, 401, 'BAD_CREDENTIALS', 'Invalid password');
      return;
    }
    res.json({ token: issueToken() });
  }),
);

// Lightweight check used by the UI to confirm a stored token is still valid.
app.get('/api/admin/session', requireAdmin, (_req, res) => res.json({ ok: true }));

// --- EVENTS ---
app.get(
  '/api/events',
  handle((req, res) => {
    // Public listing shows only open events unless the caller is admin (?all=1).
    const all = req.query.all === '1';
    res.json(store.listEvents(db, { onlyOpen: !all }));
  }),
);

app.get(
  '/api/events/:id',
  handle((req, res) => res.json(store.getEvent(db, id(req, 'id')))),
);

app.post(
  '/api/events',
  requireAdmin,
  handle((req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 80 });
    const date = optString(req.body?.date, 'date', 40);
    const location = optString(req.body?.location, 'location', 120);
    res.status(201).json(store.createEvent(db, { name, date, location }));
  }),
);

app.patch(
  '/api/events/:id',
  requireAdmin,
  handle((req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 80 });
    const date = optString(req.body?.date, 'date', 40);
    const location = optString(req.body?.location, 'location', 120);
    const status = reqStatus(req.body?.status ?? 'open');
    res.json(store.updateEvent(db, id(req, 'id'), { name, date, location, status }));
  }),
);

app.delete(
  '/api/events/:id',
  requireAdmin,
  handle((req, res) => {
    store.deleteEvent(db, id(req, 'id'));
    res.sendStatus(204);
  }),
);

// --- TEAMS ---
app.get(
  '/api/events/:eventId/teams',
  handle((req, res) => res.json(store.listTeams(db, id(req, 'eventId')))),
);

app.post(
  '/api/events/:eventId/teams',
  requireAdmin,
  handle((req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 60 });
    res.status(201).json(store.createTeam(db, id(req, 'eventId'), name));
  }),
);

app.patch(
  '/api/events/:eventId/teams/:teamId',
  requireAdmin,
  handle((req, res) => {
    const name = req.body?.name !== undefined ? reqString(req.body.name, 'name', { max: 60 }) : undefined;
    const adminPoints =
      req.body?.adminPoints !== undefined
        ? reqInt(req.body.adminPoints, 'adminPoints', { min: -999, max: 999 })
        : undefined;
    res.json(store.updateTeam(db, id(req, 'eventId'), id(req, 'teamId'), { name, adminPoints }));
  }),
);

app.delete(
  '/api/events/:eventId/teams/:teamId',
  requireAdmin,
  handle((req, res) => {
    store.deleteTeam(db, id(req, 'eventId'), id(req, 'teamId'));
    res.sendStatus(204);
  }),
);

// --- ACTIVITIES ---
app.get(
  '/api/events/:eventId/activities',
  handle((req, res) => res.json(store.listActivities(db, id(req, 'eventId')))),
);

app.post(
  '/api/events/:eventId/activities',
  requireAdmin,
  handle((req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 60 });
    res.status(201).json(store.createActivity(db, id(req, 'eventId'), name));
  }),
);

app.patch(
  '/api/activities/:activityId',
  requireAdmin,
  handle((req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 60 });
    res.json(store.updateActivity(db, id(req, 'activityId'), name));
  }),
);

app.delete(
  '/api/activities/:activityId',
  requireAdmin,
  handle((req, res) => {
    store.deleteActivity(db, id(req, 'activityId'));
    res.sendStatus(204);
  }),
);

app.get(
  '/api/activities/:activityId/scores',
  handle((req, res) => res.json(store.listScores(db, id(req, 'activityId')))),
);

app.patch(
  '/api/activities/:activityId/scores/:teamId',
  requireAdmin,
  handle((req, res) => {
    const raw = req.body?.points;
    const points = raw === null ? null : reqInt(raw, 'points', { min: 1, max: 999 });
    store.setActivityScore(db, id(req, 'activityId'), id(req, 'teamId'), points);
    res.sendStatus(204);
  }),
);

// --- PARTICIPANTS ---
app.post(
  '/api/participants/register',
  handle((req, res) => {
    const pseudo = reqString(req.body?.pseudo, 'pseudo', { max: 40 });
    const qrToken = reqString(req.body?.qrToken, 'qrToken', { max: 64 });
    const deviceId = reqString(req.body?.deviceId, 'deviceId', { max: 64 });
    const participant = store.registerParticipant(db, { pseudo, qrToken, deviceId });
    res
      .status(201)
      .json({ ...participant, teamId: participant.team_id, eventId: participant.event_id });
  }),
);

app.get(
  '/api/participants/:id',
  handle((req, res) => res.json(store.getParticipant(db, id(req, 'id')))),
);

app.get(
  '/api/participants/:id/votes',
  handle((req, res) => res.json(store.getParticipantVotes(db, id(req, 'id')))),
);

// --- VOTES ---
app.post(
  '/api/votes',
  handle((req, res) => {
    const participantId = reqInt(req.body?.participantId, 'participantId', { min: 1 });
    const votedTeamId = reqInt(req.body?.votedTeamId, 'votedTeamId', { min: 1 });
    res.status(201).json(store.castVote(db, participantId, votedTeamId));
  }),
);

// --- RANKINGS ---
app.get(
  '/api/events/:eventId/ranking/activity/:activityId',
  handle((req, res) =>
    res.json(store.rankingByActivity(db, id(req, 'eventId'), id(req, 'activityId'))),
  ),
);

app.get(
  '/api/events/:eventId/ranking/votes',
  handle((req, res) => res.json(store.rankingByVotes(db, id(req, 'eventId')))),
);

app.get(
  '/api/events/:eventId/ranking/global',
  handle((req, res) => res.json(store.rankingGlobal(db, id(req, 'eventId')))),
);

app.listen(port, () => {
  console.log(`BanaScore server running at http://localhost:${port}`);
});

export {};
