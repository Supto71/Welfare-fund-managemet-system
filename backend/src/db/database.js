'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('verbatim');
}

const { Pool } = require('pg');

// Resolve PostgreSQL URI
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.rirsrckjjdhyhfdxbyis:Share!AsenKhai99@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Prevent unhandled errors from crashing the Node.js process
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  pool
};

// ─── Schema Initialization & Seeding ───────────────────────────────────────────
(async () => {
  try {
    console.log('[DB] Connecting to PostgreSQL/Supabase...');
    
    // Core table creations
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shares_summary (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL UNIQUE,
        planned_amount DOUBLE PRECISION NOT NULL DEFAULT 5850,
        actual_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
        updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        remarks        TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL,
        date          TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
        amount_paid   DOUBLE PRECISION NOT NULL DEFAULT 0,
        shares_bought INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS welfare_fund (
        id             SERIAL PRIMARY KEY,
        total_donation DOUBLE PRECISION NOT NULL DEFAULT 0,
        total_expense  DOUBLE PRECISION NOT NULL DEFAULT 0,
        updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS welfare_transactions (
        id            SERIAL PRIMARY KEY,
        date          TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
        donor_name    TEXT,
        amount        DOUBLE PRECISION NOT NULL DEFAULT 0,
        type          TEXT NOT NULL DEFAULT 'donation' CHECK(type IN ('donation', 'expense')),
        notes         TEXT,
        created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL,
        otp        TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safely add remarks column if it doesn't exist
    try {
      await db.query("ALTER TABLE shares_summary ADD COLUMN IF NOT EXISTS remarks TEXT;");
    } catch (err) {
      console.log('[DB] Note: remarks column check failed or not supported by this dialect, ignoring.');
    }

    // Seed welfare_fund row if empty
    const fundRes = await db.query('SELECT COUNT(*) AS cnt FROM welfare_fund');
    if (parseInt(fundRes.rows[0].cnt) === 0) {
      await db.query('INSERT INTO welfare_fund (total_donation, total_expense) VALUES (0, 0)');
      console.log('[DB] Seeded initial welfare_fund row.');
    }

    // Seed users and shares_summary (Idempotent seed checks)
    console.log('[DB] Running seeder checks...');
    const bcrypt = require('bcryptjs');
    const SALT_ROUNDS = 12;
    const PLANNED_AMOUNT = 5850;

    const ADMIN = {
      name: 'Admin', email: 'mohasin_ni@yahoo.com',
      password: 'Panimo$@#26', role: 'admin',
    };

    const MEMBERS = [];

    // Seed/Update Admin
    const adminEmail = ADMIN.email.toLowerCase().trim();
    const adminCheckRes = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [adminEmail]);
    const adminHash = bcrypt.hashSync(ADMIN.password, SALT_ROUNDS);
    if (adminCheckRes.rows.length > 0) {
      await db.query(
        "UPDATE users SET password = $1, role = 'admin', is_approved = TRUE WHERE id = $2",
        [adminHash, adminCheckRes.rows[0].id]
      );
      console.log(`  ✅ Admin updated/verified → ${adminEmail}`);
    } else {
      // Also check by role to update email if role exists but email changed
      const adminRoleRes = await db.query("SELECT id FROM users WHERE role = 'admin'");
      if (adminRoleRes.rows.length > 0) {
        await db.query(
          "UPDATE users SET email = $1, password = $2, is_approved = TRUE WHERE id = $3",
          [adminEmail, adminHash, adminRoleRes.rows[0].id]
        );
        console.log(`  ✅ Admin updated by role → ${adminEmail}`);
      } else {
        await db.query(
          "INSERT INTO users (name, email, password, role, is_approved) VALUES ($1, $2, $3, $4, TRUE)",
          [ADMIN.name, adminEmail, adminHash, ADMIN.role]
        );
        console.log(`  ✅ Admin created → ${adminEmail}`);
      }
    }

    // Seed Members
    const memberHash = bcrypt.hashSync('Member@1234', SALT_ROUNDS);
    for (const m of MEMBERS) {
      const emailLower = m.email.toLowerCase().trim();
      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [emailLower]);
      if (existing.rows.length > 0) {
        // User already exists, skip insertion to prevent duplicates
        continue;
      }
      
      const insertRes = await db.query(
        'INSERT INTO users (name, email, password, role, is_approved) VALUES ($1, $2, $3, $4, TRUE) RETURNING id',
        [m.name, emailLower, memberHash, 'member']
      );
      const uid = insertRes.rows[0].id;
      
      // Ensure shares_summary exists
      await db.query(
        'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING',
        [uid, PLANNED_AMOUNT]
      );
      console.log(`  ✅ Member created → ${m.name} (id: ${uid})`);
    }
    console.log('[DB] Seeding/Checks completed.');

    // Notifications Table (Isolated)
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] PostgreSQL/Supabase Tables Checked & Ready.');
  } catch (err) {
    console.error('[DB] Initialization failed:', err.message);
  }
})();

module.exports = db;
