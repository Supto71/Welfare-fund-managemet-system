'use strict';

/**
 * Database module — uses Node.js built-in node:sqlite (Node 22+)
 * No native compilation required.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

// ─── Resolve DB path ──────────────────────────────────────────────────────────
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/welfare_fund.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const isNewDatabase = !fs.existsSync(dbPath);

// ─── Open database ────────────────────────────────────────────────────────────
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'member'
                       CHECK(role IN ('admin','member')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shares_summary (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE,
    planned_amount REAL    NOT NULL DEFAULT 5850,
    actual_amount  REAL    NOT NULL DEFAULT 0,
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    date          TEXT    NOT NULL DEFAULT (date('now')),
    amount_paid   REAL    NOT NULL DEFAULT 0,
    shares_bought INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS welfare_fund (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    total_donation REAL    NOT NULL DEFAULT 0,
    total_expense  REAL    NOT NULL DEFAULT 0,
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS welfare_transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT    NOT NULL DEFAULT (date('now')),
    donor_name    TEXT    NOT NULL,
    amount        REAL    NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    otp        TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed welfare_fund row if empty
const welfareCount = db.prepare('SELECT COUNT(*) AS cnt FROM welfare_fund').get();
if (welfareCount.cnt === 0) {
  db.prepare('INSERT INTO welfare_fund (total_donation, total_expense) VALUES (0, 0)').run();
}

// Data Migration: move actual_amount to transactions if transactions table is empty
const txCount = db.prepare('SELECT COUNT(*) AS cnt FROM transactions').get();
if (txCount.cnt === 0) {
  const summaries = db.prepare('SELECT user_id, actual_amount, updated_at FROM shares_summary WHERE actual_amount > 0').all();
  if (summaries.length > 0) {
    db.exec('BEGIN');
    const insertTx = db.prepare('INSERT INTO transactions (user_id, date, amount_paid, shares_bought) VALUES (?, ?, ?, ?)');
    for (const s of summaries) {
      // Assuming 1 share = 5850, or just setting shares_bought = 0 for legacy migration since we don't know the exact shares
      const legacyDate = s.updated_at ? s.updated_at.split(' ')[0] : new Date().toISOString().split('T')[0];
      insertTx.run(s.user_id, legacyDate, s.actual_amount, 0);
    }
    db.exec('COMMIT');
    console.log(`[DB] Migrated ${summaries.length} legacy share amounts to transactions table.`);
  }
}

// Data Migration: move total_donation to welfare_transactions if empty
const wtxCount = db.prepare('SELECT COUNT(*) AS cnt FROM welfare_transactions').get();
if (wtxCount.cnt === 0) {
  const fund = db.prepare('SELECT total_donation FROM welfare_fund LIMIT 1').get();
  if (fund && fund.total_donation > 0) {
    db.prepare("INSERT INTO welfare_transactions (date, donor_name, amount) VALUES (date('now'), ?, ?)")
      .run('Previous Donations (Legacy)', fund.total_donation);
    console.log(`[DB] Migrated legacy welfare donation of ${fund.total_donation} to welfare_transactions table.`);
  }
}

console.log(`[DB] SQLite ready: ${dbPath}`);
if (isNewDatabase) {
  console.log("[DB] Fresh DB detected — run 'npm run seed' to populate members.");
}

module.exports = db;
