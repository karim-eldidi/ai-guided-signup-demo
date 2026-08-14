/**
 * Pilot database — a single SQLite file, created on first run.
 *
 * Uses Node's built-in SQLite module, so the project has zero npm dependencies:
 * `node server.js` is all it takes to run. Nothing here is a second permanent
 * membership or identity system; it stores only what the journey needs to resume.
 *
 * Delete .data/pilot.db (or run `npm run reset:db`) to start from a clean slate.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', '.data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'pilot.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id                TEXT PRIMARY KEY,
    email             TEXT,
    auth_method       TEXT,
    marketing_consent INTEGER NOT NULL DEFAULT 0,
    consent_asked     INTEGER NOT NULL DEFAULT 0,
    answers           TEXT    NOT NULL DEFAULT '{}',
    recommendation    TEXT,
    chosen_plan_id    TEXT,
    plan_overridden   INTEGER NOT NULL DEFAULT 0,
    commitment_id     TEXT    NOT NULL DEFAULT 'monthly',
    start_date        TEXT,
    details           TEXT,
    payment_status    TEXT    NOT NULL DEFAULT 'none',
    last_step         TEXT    NOT NULL DEFAULT 'landing',
    resume_token      TEXT,
    source            TEXT,
    campaign          TEXT,
    returned_count    INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    payload    TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(resume_token);
`);

// Additive migrations for pilot databases created by an earlier version.
for (const [column, definition] of [['plan_overridden', 'INTEGER NOT NULL DEFAULT 0']]) {
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN ${column} ${definition}`);
  } catch {
    /* column already exists */
  }
}

const nowIso = () => new Date().toISOString();

export function createSession({ source = null, campaign = null } = {}) {
  const id = randomUUID();
  const token = randomBytes(24).toString('base64url');
  db.prepare(
    `INSERT INTO sessions (id, resume_token, source, campaign, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, token, source, campaign, nowIso(), nowIso());
  return getSession(id);
}

export function getSession(id) {
  if (!id) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  return row ? hydrate(row) : null;
}

export function getSessionByToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE resume_token = ?').get(token);
  return row ? hydrate(row) : null;
}

/** Most recent session that has an email — used by the demo email preview. */
export function latestIdentifiedSession() {
  const row = db
    .prepare("SELECT * FROM sessions WHERE email IS NOT NULL ORDER BY updated_at DESC LIMIT 1")
    .get();
  return row ? hydrate(row) : null;
}

const ALLOWED = new Set([
  'email', 'auth_method', 'marketing_consent', 'consent_asked', 'answers',
  'recommendation', 'chosen_plan_id', 'plan_overridden', 'commitment_id', 'start_date',
  'details', 'payment_status', 'last_step', 'source', 'campaign', 'returned_count'
]);

export function updateSession(id, patch = {}) {
  const keys = Object.keys(patch).filter((k) => ALLOWED.has(k));
  if (!keys.length) return getSession(id);
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => {
    const v = patch[k];
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
  db.prepare(`UPDATE sessions SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, nowIso(), id);
  return getSession(id);
}

export function recordEvent(sessionId, name, payload = null) {
  if (!sessionId) return;
  db.prepare('INSERT INTO events (session_id, name, payload, created_at) VALUES (?, ?, ?, ?)').run(
    sessionId,
    name,
    payload ? JSON.stringify(payload) : null,
    nowIso()
  );
}

export function eventsFor(sessionId) {
  return db
    .prepare('SELECT * FROM events WHERE session_id = ? ORDER BY id ASC')
    .all(sessionId)
    .map((e) => ({ ...e, payload: e.payload ? JSON.parse(e.payload) : null }));
}

export function allSessions(limit = 100) {
  return db
    .prepare('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?')
    .all(limit)
    .map(hydrate);
}

export function eventCounts() {
  return db
    .prepare('SELECT name, COUNT(*) AS count FROM events GROUP BY name ORDER BY count DESC')
    .all();
}

function hydrate(row) {
  return {
    ...row,
    answers: safeParse(row.answers, {}),
    recommendation: safeParse(row.recommendation, null),
    details: safeParse(row.details, null),
    marketing_consent: Boolean(row.marketing_consent),
    consent_asked: Boolean(row.consent_asked),
    plan_overridden: Boolean(row.plan_overridden)
  };
}

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
