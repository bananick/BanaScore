const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
import { Request, Response } from 'express';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// API Endpoints

// --- EVENTS ---
app.get('/api/events', (req: Request, res: Response) => {
  const events = db.prepare('SELECT * FROM events').all();
  res.json(events);
});

app.post('/api/events', (req: Request, res: Response) => {
  const { name, date, location } = req.body;
  const result = db.prepare('INSERT INTO events (name, date, location) VALUES (?, ?, ?)').run(name, date, location);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).send('Event not found');
  res.json(event);
});

app.delete('/api/events/:id', (req: Request, res: Response) => {
  const r = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).send('Event not found');
  res.sendStatus(204);
});

// --- TEAMS ---
app.get('/api/events/:eventId/teams', (req: Request, res: Response) => {
  const teams = db.prepare('SELECT * FROM teams WHERE event_id = ?').all(req.params.eventId);
  res.json(teams);
});

app.post('/api/events/:eventId/teams', (req: Request, res: Response) => {
  const { name } = req.body;
  const qrToken = crypto.randomBytes(16).toString('hex');
  const result = db.prepare('INSERT INTO teams (name, event_id, qr_token) VALUES (?, ?, ?)').run(name, req.params.eventId, qrToken);
  res.status(201).json({ id: result.lastInsertRowid, qr_token: qrToken });
});

app.delete('/api/events/:eventId/teams/:teamId', (req: Request, res: Response) => {
  const { eventId, teamId } = req.params;
  const team = db.prepare('SELECT id FROM teams WHERE id = ? AND event_id = ?').get(teamId, eventId);
  if (!team) return res.status(404).send('Team not found');
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  res.sendStatus(204);
});

// --- ACTIVITIES ---
app.get('/api/events/:eventId/activities', (req: Request, res: Response) => {
    const activities = db.prepare('SELECT * FROM activities WHERE event_id = ?').all(req.params.eventId);
    res.json(activities);
});

app.post('/api/events/:eventId/activities', (req: Request, res: Response) => {
    const { name } = req.body;
    const result = db.prepare('INSERT INTO activities (name, event_id) VALUES (?, ?)').run(name, req.params.eventId);
    res.status(201).json({ id: result.lastInsertRowid });
});

app.patch('/api/activities/:activityId/scores/:teamId', (req: Request, res: Response) => {
    const { points } = req.body;
    const { activityId, teamId } = req.params;
    
    if (points === null) {
        db.prepare('DELETE FROM activity_scores WHERE activity_id = ? AND team_id = ?').run(activityId, teamId);
    } else {
        db.prepare(`
            INSERT INTO activity_scores (activity_id, team_id, points)
            VALUES (?, ?, ?)
            ON CONFLICT(activity_id, team_id) DO UPDATE SET points = excluded.points
        `).run(activityId, teamId, points);
    }
    res.sendStatus(204);
});

app.get('/api/activities/:activityId/scores', (req: Request, res: Response) => {
    const scores = db.prepare('SELECT * FROM activity_scores WHERE activity_id = ?').all(req.params.activityId);
    res.json(scores);
});

// --- PARTICIPANTS ---
app.post('/api/participants/register', (req: Request, res: Response) => {
  const { pseudo, qrToken, deviceId } = req.body;
  
  const team = db.prepare('SELECT id, event_id FROM teams WHERE qr_token = ?').get(qrToken) as any;
  if (!team) return res.status(404).send('Invalid QR Code');

  try {
    const result = db.prepare('INSERT INTO participants (pseudo, team_id, event_id, device_id) VALUES (?, ?, ?, ?)').run(pseudo, team.id, team.event_id, deviceId);
    res.status(201).json({ id: result.lastInsertRowid, teamId: team.id, eventId: team.event_id });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db.prepare('SELECT * FROM participants WHERE event_id = ? AND device_id = ?').get(team.event_id, deviceId);
      res.json(existing);
    } else {
      res.status(500).send(err.message);
    }
  }
});

app.get('/api/participants/:id', (req: Request, res: Response) => {
    const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
    res.json(participant);
});

app.get('/api/participants/:id/votes', (req: Request, res: Response) => {
    const votes = db.prepare('SELECT * FROM votes WHERE participant_id = ?').all(req.params.id);
    res.json(votes);
});

// --- VOTES ---
app.post('/api/votes', (req: Request, res: Response) => {
  const { participantId, votedTeamId } = req.body;
  
  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId) as any;
  if (!participant) return res.status(404).send('Participant not found');

  if (participant.team_id === parseInt(votedTeamId)) {
    return res.status(403).send('Cannot vote for your own team');
  }

  // Count current votes
  const voteCount = db.prepare('SELECT COUNT(*) as count FROM votes WHERE participant_id = ? AND event_id = ?').get(participantId, participant.event_id) as any;
  if (voteCount.count >= 3) {
      return res.status(403).send('You can only vote for up to 3 teams');
  }

  try {
    const result = db.prepare('INSERT INTO votes (participant_id, voted_team_id, event_id) VALUES (?, ?, ?)').run(participantId, votedTeamId, participant.event_id);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(403).send('You have already voted for this team');
    } else {
      res.status(500).send(err.message);
    }
  }
});

// --- SCORES / CLASSEMENT ---

// Ranking per Activity
app.get('/api/events/:eventId/ranking/activity/:activityId', (req: Request, res: Response) => {
    const activity = db.prepare('SELECT name FROM activities WHERE id = ?').get(req.params.activityId);
    const ranking = db.prepare(`
    SELECT t.id, t.name, COALESCE(s.points, 0) as score
    FROM teams t
    LEFT JOIN activity_scores s ON t.id = s.team_id AND s.activity_id = ?
    WHERE t.event_id = ?
    ORDER BY score DESC
  `).all(req.params.activityId, req.params.eventId);
  res.json({ ranking, activityName: activity ? activity.name : 'Unknown' });
});

// Ranking for Votes only
app.get('/api/events/:eventId/ranking/votes', (req: Request, res: Response) => {
  const ranking = db.prepare(`
    SELECT t.id, t.name, (SELECT COUNT(*) FROM votes v WHERE v.voted_team_id = t.id) as score
    FROM teams t
    WHERE t.event_id = ?
    ORDER BY score DESC
  `).all(req.params.eventId);
  res.json(ranking);
});

// Global Ranking
app.get('/api/events/:eventId/ranking/global', (req: Request, res: Response) => {
  const ranking = db.prepare(`
    SELECT t.id, t.name, 
    (
        COALESCE((SELECT SUM(points) FROM activity_scores s JOIN activities a ON s.activity_id = a.id WHERE s.team_id = t.id AND a.event_id = ?), 0) + 
        (SELECT COUNT(*) FROM votes v WHERE v.voted_team_id = t.id)
    ) as score
    FROM teams t
    WHERE t.event_id = ?
    ORDER BY score DESC
  `).all(req.params.eventId, req.params.eventId);
  res.json(ranking);
});

app.listen(port, () => {
  console.log(`Bananote server running at http://localhost:${port}`);
});

export {};
