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

  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    email               TEXT UNIQUE NOT NULL,
    first_name          TEXT,
    last_name           TEXT,
    auth_provider       TEXT NOT NULL DEFAULT 'email',
    marketing_consent   INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id             TEXT PRIMARY KEY,
    min_rating          REAL,
    strictly_near_me    INTEGER NOT NULL DEFAULT 0,
    sport_focus         TEXT DEFAULT '[]',
    updated_at          TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_favorites (
    user_id             TEXT NOT NULL,
    venue_id            TEXT NOT NULL,
    frequency           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL,
    PRIMARY KEY(user_id, venue_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(resume_token);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Additive migrations for pilot databases created by an earlier version.
for (const [column, definition] of [
  ['plan_overridden', 'INTEGER NOT NULL DEFAULT 0'],
  ['first_name', 'TEXT'],
  ['last_name', 'TEXT'],
  ['preferences', "TEXT NOT NULL DEFAULT '{}'"],
  ['starred_venues', "TEXT NOT NULL DEFAULT '{}'"],
  ['user_id', 'TEXT']
]) {
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

export function getUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalized);
  if (!row) return null;
  const prefsRow = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(row.id);
  const favRows = db.prepare('SELECT venue_id, frequency FROM user_favorites WHERE user_id = ?').all(row.id);
  const favorites = {};
  for (const f of favRows) favorites[f.venue_id] = { freq: f.frequency };
  return {
    ...row,
    marketing_consent: Boolean(row.marketing_consent),
    preferences: prefsRow ? {
      minRating: prefsRow.min_rating,
      strictlyNearMe: Boolean(prefsRow.strictly_near_me),
      sportFocus: safeParse(prefsRow.sport_focus, [])
    } : { minRating: null, strictlyNearMe: false, sportFocus: [] },
    favorites
  };
}

export function createUserOrUpdate({ email, firstName = null, lastName = null, authProvider = 'email', marketingConsent = 0 } = {}) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalized);
  const now = nowIso();
  let userId;
  if (existing) {
    userId = existing.id;
    db.prepare(
      `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
       auth_provider = ?, marketing_consent = ?, updated_at = ? WHERE id = ?`
    ).run(firstName, lastName, authProvider, marketingConsent ? 1 : 0, now, userId);
  } else {
    userId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, first_name, last_name, auth_provider, marketing_consent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, normalized, firstName, lastName, authProvider, marketingConsent ? 1 : 0, now, now);
  }
  return getUserByEmail(normalized);
}

export function saveUserPreferences(userId, prefs = {}) {
  if (!userId) return null;
  const now = nowIso();
  const minRating = prefs.minRating !== undefined ? prefs.minRating : null;
  const strictlyNearMe = prefs.strictlyNearMe ? 1 : 0;
  const sportFocus = JSON.stringify(prefs.sportFocus || []);
  db.prepare(
    `INSERT INTO user_preferences (user_id, min_rating, strictly_near_me, sport_focus, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       min_rating = excluded.min_rating,
       strictly_near_me = excluded.strictly_near_me,
       sport_focus = excluded.sport_focus,
       updated_at = excluded.updated_at`
  ).run(userId, minRating, strictlyNearMe, sportFocus, now);
  return prefs;
}

export function saveUserFavorites(userId, favorites = {}) {
  if (!userId) return null;
  const now = nowIso();
  db.prepare('DELETE FROM user_favorites WHERE user_id = ?').run(userId);
  const stmt = db.prepare('INSERT INTO user_favorites (user_id, venue_id, frequency, created_at) VALUES (?, ?, ?, ?)');
  for (const [venueId, meta] of Object.entries(favorites)) {
    const freq = typeof meta === 'number' ? meta : (meta?.freq || 1);
    stmt.run(userId, venueId, freq, now);
  }
  return favorites;
}

const ALLOWED = new Set([
  'email', 'first_name', 'last_name', 'auth_method', 'marketing_consent', 'consent_asked', 'answers',
  'recommendation', 'chosen_plan_id', 'plan_overridden', 'commitment_id', 'start_date',
  'details', 'preferences', 'starred_venues', 'user_id', 'payment_status', 'last_step', 'source', 'campaign', 'returned_count'
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

/** Prepares structured export payload ready for USC upstream CRM/membership service */
export function createMembershipExportPayload(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;
  return {
    version: '2026-08',
    exportedAt: nowIso(),
    sessionId: session.id,
    userId: session.user_id,
    identity: {
      email: session.email,
      firstName: session.first_name || (session.details && session.details.firstName) || null,
      lastName: session.last_name || (session.details && session.details.lastName) || null,
      marketingConsent: session.marketing_consent,
      authMethod: session.auth_method
    },
    membership: {
      planId: session.chosen_plan_id || (session.recommendation && session.recommendation.planId),
      commitmentId: session.commitment_id || 'monthly',
      startDate: session.start_date,
      paymentStatus: session.payment_status
    },
    profile: {
      answers: session.answers,
      preferences: session.preferences,
      starredVenues: session.starred_venues
    }
  };
}

function hydrate(row) {
  return {
    ...row,
    answers: safeParse(row.answers, {}),
    recommendation: safeParse(row.recommendation, null),
    details: safeParse(row.details, null),
    preferences: safeParse(row.preferences, { minRating: null, strictlyNearMe: false, sportFocus: [] }),
    starred_venues: safeParse(row.starred_venues, {}),
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

