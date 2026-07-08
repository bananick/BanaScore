import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import db from './db';
import { handle, sendError } from './errors';
import {
  requireAdmin,
  checkPassword,
  issueToken,
  setPassword,
  canScore,
  isAdmin,
  issueScorerToken,
  verifyScorerCode,
} from './auth';
import { optString, reqInt, reqNumber, reqStatus, reqString } from './validation';
import * as store from './store';
import { streamReportPdf } from './pdf';
import { rateLimit } from './rateLimit';

export const app = express();
const port = Number(process.env.PORT) || 3001;

// True when running inside Cloud Functions / Cloud Run (managed by Firebase).
// There we must not bind a port or serve static files (Hosting does that), and
// long-lived SSE connections are disabled (clients fall back to polling).
const inCloud = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);

// Behind a reverse proxy (prod), trust it so req.ip reflects the real client.
app.set('trust proxy', 1);

// Basic security headers (cheap hardening; TLS is handled by the reverse proxy).
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// CORS: restrict to a comma-separated allowlist in production via CORS_ORIGIN.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((o) => o.trim()) }
      : undefined, // dev: reflect request origin
  ),
);
app.use(express.json({ limit: '1mb' }));

const id = (req: Request, key: string) => reqInt(req.params[key], key, { min: 1 });

/** Best-guess LAN IPv4 of this machine, for building tablet-reachable URLs. */
function lanBaseUrl(): string {
  const cands: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) cands.push(ni.address);
    }
  }
  const ip =
    cands.find((a) => a.startsWith('192.168.')) ||
    cands.find((a) => a.startsWith('10.')) ||
    cands.find((a) => /^172\.(1[6-9]|2\d|3[01])\./.test(a)) ||
    cands[0] ||
    'localhost';
  return `http://${ip}:${port}`;
}

// Lets the /access page show a tablet-reachable URL/QR even when opened on the PC.
app.get('/api/network', (_req: Request, res: Response) => res.json({ baseUrl: lanBaseUrl() }));

// --- LIVE UPDATES (Server-Sent Events) ---
// Any successful mutating API call broadcasts a "tick" so connected clients
// (rankings, projection, scoring, dashboard) refresh near-instantly instead of
// only on their polling interval.
const sseClients = new Set<Response>();

function broadcastTick(): void {
  for (const client of sseClients) {
    try {
      client.write('data: tick\n\n');
    } catch {
      /* ignore broken pipe */
    }
  }
}

app.use((req: Request, res: Response, next) => {
  if (req.method !== 'GET' && req.path.startsWith('/api') && req.path !== '/api/stream') {
    res.on('finish', () => {
      if (res.statusCode < 400) broadcastTick();
    });
  }
  next();
});

app.get('/api/stream', (req: Request, res: Response) => {
  // No persistent SSE in the cloud: end immediately so the client relies on
  // its polling interval instead of holding an instance open.
  if (inCloud) {
    res.sendStatus(204);
    return;
  }
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  sseClients.add(res);
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* ignore */
    }
  }, 25000);
  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

// --- ADMIN AUTH ---
const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 10 });

app.post(
  '/api/admin/login',
  loginLimiter,
  handle(async (req, res) => {
    if (!(await checkPassword(req.body?.password))) {
      sendError(res, 401, 'BAD_CREDENTIALS', 'Invalid password');
      return;
    }
    res.json({ token: issueToken() });
  }),
);

// Lightweight check used by the UI to confirm a stored token is still valid.
app.get('/api/admin/session', requireAdmin, (_req, res) => res.json({ ok: true }));

app.post(
  '/api/admin/password',
  requireAdmin,
  handle(async (req, res) => {
    const current = reqString(req.body?.currentPassword, 'currentPassword', { max: 200 });
    const next = reqString(req.body?.newPassword, 'newPassword', { min: 4, max: 200 });
    if (!(await checkPassword(current))) {
      sendError(res, 401, 'BAD_CREDENTIALS', 'Current password is incorrect');
      return;
    }
    await setPassword(next);
    res.json({ ok: true });
  }),
);

// --- EVENTS ---
app.get(
  '/api/events',
  handle(async (req, res) => {
    // Public listing shows only open events unless the caller is admin (?all=1).
    // Only admins may list non-open (closed/archived) events.
    const all = req.query.all === '1' && isAdmin(req);
    res.json(await store.listEvents(db, { onlyOpen: !all }));
  }),
);

app.get(
  '/api/events/:id',
  handle(async (req, res) => res.json(await store.getEvent(db, id(req, 'id')))),
);

app.post(
  '/api/events',
  requireAdmin,
  handle(async (req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 80 });
    const date = optString(req.body?.date, 'date', 40);
    const location = optString(req.body?.location, 'location', 120);
    res.status(201).json(await store.createEvent(db, { name, date, location }));
  }),
);

app.patch(
  '/api/events/:id',
  requireAdmin,
  handle(async (req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 80 });
    const date = optString(req.body?.date, 'date', 40);
    const location = optString(req.body?.location, 'location', 120);
    const status = reqStatus(req.body?.status ?? 'open');
    const maxVotes = reqInt(req.body?.maxVotes ?? 3, 'maxVotes', { min: 1, max: 50 });
    const votingEnabled = req.body?.votingEnabled !== false; // default true
    const rankingMode = req.body?.rankingMode === 'normalized' ? 'normalized' : 'raw';
    const rawWeights = req.body?.workshopWeights;
    let workshopWeights: Record<string, number> | null = null;
    if (rawWeights && typeof rawWeights === 'object') {
      workshopWeights = {};
      for (const [k, v] of Object.entries(rawWeights)) {
        const n = typeof v === 'string' ? Number(v) : (v as number);
        if (typeof k === 'string' && Number.isFinite(n) && n > 0) workshopWeights[k] = n;
      }
    }
    const brandColor = optString(req.body?.brandColor, 'brandColor', 30);
    const logoUrl = optString(req.body?.logoUrl, 'logoUrl', 500000);
    const scorerCode = optString(req.body?.scorerCode, 'scorerCode', 40);
    res.json(
      await store.updateEvent(db, id(req, 'id'), {
        name,
        date,
        location,
        status,
        maxVotes,
        votingEnabled,
        rankingMode,
        workshopWeights,
        brandColor,
        logoUrl,
        scorerCode,
      }),
    );
  }),
);

app.delete(
  '/api/events/:id',
  requireAdmin,
  handle(async (req, res) => {
    await store.deleteEvent(db, id(req, 'id'));
    res.sendStatus(204);
  }),
);

app.post(
  '/api/events/:id/duplicate',
  requireAdmin,
  handle(async (req, res) => {
    const name = req.body?.name !== undefined ? reqString(req.body.name, 'name', { max: 80 }) : undefined;
    res.status(201).json(await store.duplicateEvent(db, id(req, 'id'), { name }));
  }),
);

app.post(
  '/api/events/:id/sessions',
  requireAdmin,
  handle(async (req, res) => {
    const count = reqInt(req.body?.count, 'count', { min: 1, max: 20 });
    const prefix = reqString(req.body?.prefix, 'prefix', { max: 60 });
    res.status(201).json(await store.generateSessions(db, id(req, 'id'), count, prefix));
  }),
);

app.post(
  '/api/events/:id/reset-scores',
  requireAdmin,
  handle(async (req, res) => {
    await store.resetScores(db, id(req, 'id'));
    res.sendStatus(204);
  }),
);

app.get(
  '/api/events/:id/report',
  requireAdmin,
  handle(async (req, res) => res.json(await store.getEventReport(db, id(req, 'id')))),
);

app.get(
  '/api/events/:id/stats',
  requireAdmin,
  handle(async (req, res) => res.json(await store.getEventStats(db, id(req, 'id')))),
);

app.get(
  '/api/events/:id/report.pdf',
  requireAdmin,
  handle(async (req, res) => {
    const eventId = id(req, 'id');
    const report = await store.getEventReport(db, eventId);
    const workshops = await store.rankingByWorkshop(db, eventId);
    const slug =
      report.event.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'evenement';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="banascore-${slug}.pdf"`);
    streamReportPdf(report, workshops, res);
  }),
);

// --- TEAMS ---
app.get(
  '/api/events/:eventId/teams',
  handle(async (req, res) => {
    const teams = await store.listTeams(db, id(req, 'eventId'));
    // qr_token is sensitive (lets you register as that team) — admins only.
    if (isAdmin(req)) {
      res.json(teams);
    } else {
      res.json(teams.map(({ qr_token, ...rest }) => rest));
    }
  }),
);

app.post(
  '/api/events/:eventId/teams',
  requireAdmin,
  handle(async (req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 60 });
    res.status(201).json(await store.createTeam(db, id(req, 'eventId'), name));
  }),
);

app.patch(
  '/api/events/:eventId/teams/:teamId',
  requireAdmin,
  handle(async (req, res) => {
    const name = req.body?.name !== undefined ? reqString(req.body.name, 'name', { max: 60 }) : undefined;
    const adminPoints =
      req.body?.adminPoints !== undefined
        ? reqInt(req.body.adminPoints, 'adminPoints', { min: -999, max: 999 })
        : undefined;
    const bonusLabel =
      req.body?.bonusLabel !== undefined ? optString(req.body.bonusLabel, 'bonusLabel', 60) : undefined;
    res.json(
      await store.updateTeam(db, id(req, 'eventId'), id(req, 'teamId'), { name, adminPoints, bonusLabel }),
    );
  }),
);

app.delete(
  '/api/events/:eventId/teams/:teamId',
  requireAdmin,
  handle(async (req, res) => {
    await store.deleteTeam(db, id(req, 'eventId'), id(req, 'teamId'));
    res.sendStatus(204);
  }),
);

// --- ACTIVITIES ---
app.get(
  '/api/events/:eventId/activities',
  handle(async (req, res) => res.json(await store.listActivities(db, id(req, 'eventId')))),
);

app.post(
  '/api/events/:eventId/activities',
  requireAdmin,
  handle(async (req, res) => {
    const name = reqString(req.body?.name, 'name', { max: 60 });
    const workshop = optString(req.body?.workshop, 'workshop', 60);
    res.status(201).json(await store.createActivity(db, id(req, 'eventId'), name, workshop));
  }),
);

app.patch(
  '/api/activities/:activityId',
  requireAdmin,
  handle(async (req, res) => {
    const name = req.body?.name !== undefined ? reqString(req.body.name, 'name', { max: 60 }) : undefined;
    const coefficient =
      req.body?.coefficient !== undefined
        ? reqNumber(req.body.coefficient, 'coefficient', { min: 0.1, max: 100 })
        : undefined;
    const workshop =
      req.body?.workshop !== undefined ? optString(req.body.workshop, 'workshop', 60) : undefined;
    const scoringMode =
      req.body?.scoringMode === 'free' ||
      req.body?.scoringMode === 'criteria' ||
      req.body?.scoringMode === 'preset'
        ? req.body.scoringMode
        : undefined;
    let presetPoints: number[] | null | undefined;
    if (req.body?.presetPoints !== undefined) {
      const raw = req.body.presetPoints;
      if (raw === null) {
        presetPoints = null;
      } else if (Array.isArray(raw)) {
        presetPoints = raw
          .map((v: unknown) => (typeof v === 'string' ? parseInt(v, 10) : (v as number)))
          .filter((n: number) => Number.isFinite(n) && n >= 0 && n <= 1000000)
          .slice(0, 20);
      }
    }
    res.json(
      await store.updateActivity(db, id(req, 'activityId'), {
        name,
        coefficient,
        workshop,
        scoringMode,
        presetPoints,
      }),
    );
  }),
);

// --- CRITERIA (criteria scoring mode) ---
app.get(
  '/api/activities/:activityId/criteria',
  handle(async (req, res) => res.json(await store.listCriteria(db, id(req, 'activityId')))),
);

app.post(
  '/api/activities/:activityId/criteria',
  requireAdmin,
  handle(async (req, res) => {
    const label = reqString(req.body?.label, 'label', { max: 60 });
    const points = reqInt(req.body?.points, 'points', { min: 0, max: 1000000 });
    res.status(201).json(await store.addCriterion(db, id(req, 'activityId'), label, points));
  }),
);

app.patch(
  '/api/criteria/:criterionId',
  requireAdmin,
  handle(async (req, res) => {
    const label = req.body?.label !== undefined ? reqString(req.body.label, 'label', { max: 60 }) : undefined;
    const points =
      req.body?.points !== undefined ? reqInt(req.body.points, 'points', { min: 0, max: 1000000 }) : undefined;
    res.json(await store.updateCriterion(db, id(req, 'criterionId'), { label, points }));
  }),
);

app.delete(
  '/api/criteria/:criterionId',
  requireAdmin,
  handle(async (req, res) => {
    await store.deleteCriterion(db, id(req, 'criterionId'));
    res.sendStatus(204);
  }),
);

// Combined payload the scoring UI needs for one activity.
app.get(
  '/api/activities/:activityId/scoring',
  handle(async (req, res) => res.json(await store.getActivityScoring(db, id(req, 'activityId')))),
);

// Toggle a criterion for a team (criteria mode) — admin or scorer, event must be open.
app.patch(
  '/api/criteria/:criterionId/teams/:teamId',
  handle(async (req, res) => {
    const criterionId = id(req, 'criterionId');
    const crit = await store.getCriterionActivity(db, criterionId);
    if (!canScore(req, crit.event_id)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Scoring requires admin or scorer access');
      return;
    }
    const event = await store.getEvent(db, crit.event_id);
    if (event.status !== 'open' && !isAdmin(req)) {
      sendError(res, 403, 'EVENT_LOCKED', 'Scoring is locked: the event is not open');
      return;
    }
    const achieved = req.body?.achieved === true;
    await store.toggleCriterion(db, criterionId, id(req, 'teamId'), achieved);
    res.sendStatus(204);
  }),
);

app.delete(
  '/api/activities/:activityId',
  requireAdmin,
  handle(async (req, res) => {
    await store.deleteActivity(db, id(req, 'activityId'));
    res.sendStatus(204);
  }),
);

app.get(
  '/api/activities/:activityId/scores',
  handle(async (req, res) => res.json(await store.listScores(db, id(req, 'activityId')))),
);

app.patch(
  '/api/activities/:activityId/scores/:teamId',
  handle(async (req, res) => {
    const activityId = id(req, 'activityId');
    const activity = await store.getActivity(db, activityId);
    if (!canScore(req, activity.event_id)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Scoring requires admin or scorer access');
      return;
    }
    // Once an event is closed/archived, scoring is locked for animateurs
    // (admins can still correct mistakes).
    const event = await store.getEvent(db, activity.event_id);
    if (event.status !== 'open' && !isAdmin(req)) {
      sendError(res, 403, 'EVENT_LOCKED', 'Scoring is locked: the event is not open');
      return;
    }
    const raw = req.body?.points;
    const points = raw === null ? null : reqInt(raw, 'points', { min: 0, max: 1000000 });
    await store.setActivityScore(db, activityId, id(req, 'teamId'), points);
    res.sendStatus(204);
  }),
);

// --- PARTICIPANTS ---
app.post(
  '/api/participants/register',
  handle(async (req, res) => {
    const pseudo = reqString(req.body?.pseudo, 'pseudo', { max: 40 });
    const deviceId = reqString(req.body?.deviceId, 'deviceId', { max: 64 });
    // Either a per-team QR token, or a teamId+eventId (event-level join flow).
    const qrToken =
      req.body?.qrToken !== undefined ? reqString(req.body.qrToken, 'qrToken', { max: 64 }) : undefined;
    const teamId = req.body?.teamId !== undefined ? reqInt(req.body.teamId, 'teamId', { min: 1 }) : undefined;
    const eventId =
      req.body?.eventId !== undefined ? reqInt(req.body.eventId, 'eventId', { min: 1 }) : undefined;
    const participant = await store.registerParticipant(db, { pseudo, deviceId, qrToken, teamId, eventId });
    res
      .status(201)
      .json({ ...participant, teamId: participant.team_id, eventId: participant.event_id });
  }),
);

app.get(
  '/api/participants/:id',
  handle(async (req, res) => res.json(await store.getParticipant(db, id(req, 'id')))),
);

app.get(
  '/api/participants/:id/votes',
  handle(async (req, res) => res.json(await store.getParticipantVotes(db, id(req, 'id')))),
);

// --- VOTES ---
app.post(
  '/api/votes',
  handle(async (req, res) => {
    const participantId = reqInt(req.body?.participantId, 'participantId', { min: 1 });
    const votedTeamId = reqInt(req.body?.votedTeamId, 'votedTeamId', { min: 1 });
    res.status(201).json(await store.castVote(db, participantId, votedTeamId));
  }),
);

// --- RANKINGS ---
app.get(
  '/api/events/:eventId/ranking/activity/:activityId',
  handle(async (req, res) =>
    res.json(await store.rankingByActivity(db, id(req, 'eventId'), id(req, 'activityId'))),
  ),
);

app.get(
  '/api/events/:eventId/ranking/votes',
  handle(async (req, res) => res.json(await store.rankingByVotes(db, id(req, 'eventId')))),
);

app.get(
  '/api/events/:eventId/ranking/global',
  handle(async (req, res) => res.json(await store.rankingGlobal(db, id(req, 'eventId')))),
);

app.get(
  '/api/events/:eventId/ranking/workshops',
  handle(async (req, res) => res.json(await store.rankingByWorkshop(db, id(req, 'eventId')))),
);

// --- SCORER ("animateur") AUTH ---
app.post(
  '/api/events/:eventId/scorer-login',
  loginLimiter,
  handle(async (req, res) => {
    const event = await store.getEvent(db, id(req, 'eventId'));
    if (!verifyScorerCode(event.scorer_code, req.body?.code)) {
      sendError(res, 401, 'BAD_CREDENTIALS', 'Invalid scorer code');
      return;
    }
    res.json({ token: issueScorerToken(event.id) });
  }),
);

app.get(
  '/api/events/:eventId/scorer-session',
  handle((req, res) => {
    const eventId = id(req, 'eventId');
    if (!canScore(req, eventId)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Scorer access required');
      return;
    }
    res.json({ ok: true });
  }),
);

// Local / LAN mode only — runs when this file is the entrypoint (e.g.
// `ts-node-dev server/index.ts`). When the module is *imported* (by Cloud
// Functions, or by the Firebase CLI during deploy-time export discovery) this
// block is skipped, so no port is bound and Hosting serves the frontend.
if (require.main === module) {
  // Serve the built frontend (dist/) from this same server so the whole app is
  // reachable at one origin (http://<IP>:PORT) — convenient for running an
  // event from a single machine on the local Wi-Fi network.
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    // SPA fallback for client-side routes (everything that isn't /api).
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(distDir, 'index.html'));
      } else {
        next();
      }
    });
    console.log('[BanaScore] Serving built frontend from dist/');
  }

  // Bind 0.0.0.0 so tablets/phones on the same network can connect.
  app.listen(port, '0.0.0.0', () => {
    console.log(`BanaScore server running on http://0.0.0.0:${port} (reachable on your LAN IP)`);
  });
}
