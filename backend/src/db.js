import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'fpl.db');

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Store team snapshots
  CREATE TABLE IF NOT EXISTS team_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameweek INTEGER NOT NULL,
    squad JSON NOT NULL,
    budget REAL NOT NULL,
    free_transfers INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Store all AI decisions made
  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameweek INTEGER NOT NULL,
    transfers JSON,
    captain INTEGER,
    vice_captain INTEGER,
    reasoning TEXT,
    confidence TEXT,
    executed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Store performance history
  CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameweek INTEGER NOT NULL UNIQUE,
    points INTEGER,
    overall_rank INTEGER,
    gameweek_rank INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Cache player data
  CREATE TABLE IF NOT EXISTS players_cache (
    id INTEGER PRIMARY KEY,
    data JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Cache fixtures data
  CREATE TABLE IF NOT EXISTS fixtures_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI reasoning log for the feed
  CREATE TABLE IF NOT EXISTS reasoning_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameweek INTEGER,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
