'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db     = require('./database');

const SALT_ROUNDS    = 12;
const PLANNED_AMOUNT = 5850;

const ADMIN = {
  name: 'Admin', email: 'admin@asenkhaikakalyan.com',
  password: 'Admin@1234', role: 'admin',
};

const MEMBERS = [
  { name: 'Anisur Rahman',    email: 'anisur@asenkhaikakalyan.com' },
  { name: 'Fokhrul Islam',    email: 'fokhrul@asenkhaikakalyan.com' },
  { name: 'Jahan',            email: 'jahan@asenkhaikakalyan.com' },
  { name: 'Mithun',           email: 'mithun@asenkhaikakalyan.com' },
  { name: 'Md Musa',          email: 'musa@asenkhaikakalyan.com' },
  { name: 'Kabir Hossain',    email: 'kabir@asenkhaikakalyan.com' },
  { name: 'Rafiqul Islam',    email: 'rafiqul@asenkhaikakalyan.com' },
  { name: 'Delwar Hossain',   email: 'delwar@asenkhaikakalyan.com' },
  { name: 'Shahadat Hossain', email: 'shahadat@asenkhaikakalyan.com' },
  { name: 'Liton Mia',        email: 'liton@asenkhaikakalyan.com' },
  { name: 'Ariful Islam',     email: 'ariful@asenkhaikakalyan.com' },
  { name: 'Jahangir Alam',    email: 'jahangir@asenkhaikakalyan.com' },
  { name: 'Rubel Hossain',    email: 'rubel@asenkhaikakalyan.com' },
  { name: 'Mamun Rashid',     email: 'mamun@asenkhaikakalyan.com' },
  { name: 'Sumon Ahmed',      email: 'sumon@asenkhaikakalyan.com' },
  { name: 'Raju Mia',         email: 'raju@asenkhaikakalyan.com' },
  { name: 'Belal Hossain',    email: 'belal@asenkhaikakalyan.com' },
  { name: 'Nazrul Islam',     email: 'nazrul@asenkhaikakalyan.com' },
];

const stmtInsertUser = db.prepare(
  'INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
);
const stmtInsertShare = db.prepare(
  'INSERT OR IGNORE INTO shares_summary (user_id, planned_amount, actual_amount) VALUES (?, ?, 0)'
);
const stmtFindUser  = db.prepare('SELECT id FROM users WHERE email = ?');
const stmtFindShare = db.prepare('SELECT id FROM shares_summary WHERE user_id = ?');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🌱  আসেন খাই কল্যাণ তহবিল — Database Seed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let seeded = 0, skipped = 0, shares = 0;

db.exec('BEGIN');
try {
  // ── Admin ──────────────────────────────────────────────────
  if (!stmtFindUser.get(ADMIN.email)) {
    const hashed = bcrypt.hashSync(ADMIN.password, SALT_ROUNDS);
    stmtInsertUser.run(ADMIN.name, ADMIN.email, hashed, ADMIN.role);
    console.log(`  ✅  Admin created  →  ${ADMIN.email}`);
    seeded++;
  } else {
    console.log(`  ⏭️   Admin exists   →  ${ADMIN.email}`);
    skipped++;
  }

  // ── Members ────────────────────────────────────────────────
  const defaultHash = bcrypt.hashSync('Member@1234', SALT_ROUNDS);

  for (const m of MEMBERS) {
    let userRow = stmtFindUser.get(m.email);

    if (!userRow) {
      const res = stmtInsertUser.run(m.name, m.email, defaultHash, 'member');
      const uid = Number(res.lastInsertRowid);
      stmtInsertShare.run(uid, PLANNED_AMOUNT);
      console.log(`  ✅  Member created  →  ${m.name.padEnd(20)} (id: ${uid})`);
      seeded++; shares++;
    } else {
      if (!stmtFindShare.get(userRow.id)) {
        stmtInsertShare.run(userRow.id, PLANNED_AMOUNT);
        shares++;
        console.log(`  🔧  Share row added →  ${m.name}`);
      } else {
        console.log(`  ⏭️   Already exists →  ${m.name}`);
        skipped++;
      }
    }
  }

  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('\n  ❌  Seed failed:', err.message);
  process.exit(1);
}

console.log('\n──────────────────────────────────────────────────────');
console.log(`  📊  Users created  : ${seeded}`);
console.log(`  📊  Shares created : ${shares}`);
console.log(`  📊  Skipped        : ${skipped}`);
console.log('──────────────────────────────────────────────────────');
console.log('\n  Default passwords:');
console.log('       Admin   →  Admin@1234');
console.log('       Members →  Member@1234');
console.log('\n  ⚠️  Change passwords before production!\n');
