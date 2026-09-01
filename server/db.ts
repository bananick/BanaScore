import Database from 'better-sqlite3';
import path from 'path';

export type DB = Database.Database;

/**
 * Create (or open) a BanaScore database at the given path and ensure the schema
 * + lightweight migrations are applied. Pass ':memory:' for tests.
 */
export function createDb(dbPath: string): DB {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      max_votes INTEGER NOT NULL DEFAULT 3,
      voting_enabled INTEGER NOT NULL DEFAULT 1,
      ranking_mode TEXT NOT NULL DEFAULT 'raw',
      workshop_weights TEXT,
      brand_color TEXT,
      logo_url TEXT,
      scorer_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      admin_points INTEGER NOT NULL DEFAULT 0,
      bonus_label TEXT,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      coefficient REAL NOT NULL DEFAULT 1,
      workshop TEXT,
      scoring_mode TEXT NOT NULL DEFAULT 'criteria',
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_criteria (
      team_id INTEGER NOT NULL,
      criterion_id INTEGER NOT NULL,
      PRIMARY KEY (team_id, criterion_id),
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (criterion_id) REFERENCES activity_criteria (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      UNIQUE(activity_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pseudo TEXT NOT NULL,
      team_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      UNIQUE(event_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      voted_team_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants (id) ON DELETE CASCADE,
      FOREIGN KEY (voted_team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      UNIQUE(participant_id, voted_team_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  migrate(db);
  return db;
}

/** Additive migrations for databases created before a column existed. */
function migrate(db: DB): void {
  addColumnIfMissing(db, 'events', 'status', `TEXT NOT NULL DEFAULT 'open'`);
  addColumnIfMissing(db, 'events', 'created_at', `TEXT`);
  addColumnIfMissing(db, 'events', 'max_votes', `INTEGER NOT NULL DEFAULT 3`);
  addColumnIfMissing(db, 'events', 'voting_enabled', `INTEGER NOT NULL DEFAULT 1`);
  addColumnIfMissing(db, 'events', 'ranking_mode', `TEXT NOT NULL DEFAULT 'raw'`);
  addColumnIfMissing(db, 'events', 'workshop_weights', `TEXT`);
  addColumnIfMissing(db, 'events', 'brand_color', `TEXT`);
  addColumnIfMissing(db, 'events', 'logo_url', `TEXT`);
  addColumnIfMissing(db, 'events', 'scorer_code', `TEXT`);
  addColumnIfMissing(db, 'teams', 'admin_points', `INTEGER NOT NULL DEFAULT 0`);
  addColumnIfMissing(db, 'teams', 'bonus_label', `TEXT`);
  // Optional group tag (e.g. IFP tournament: A..F) used to bucket teams into
  // rotations. NULL for events that don't use groups.
  addColumnIfMissing(db, 'teams', 'team_group', `TEXT`);
  addColumnIfMissing(db, 'activities', 'coefficient', `REAL NOT NULL DEFAULT 1`);
  addColumnIfMissing(db, 'activities', 'workshop', `TEXT`);
  addColumnIfMissing(db, 'activities', 'scoring_mode', `TEXT NOT NULL DEFAULT 'criteria'`);
}

function addColumnIfMissing(db: DB, table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

const defaultPath = process.env.BANASCORE_DB || path.resolve(__dirname, '../banascore.db');
const db = createDb(defaultPath);

export default db;
