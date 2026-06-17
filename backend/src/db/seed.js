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

(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌱  আসেন খাই কল্যাণ তহবিল — Database Seed (PostgreSQL)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let seeded = 0, skipped = 0, shares = 0;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // ── Admin ──────────────────────────────────────────────────
    const adminCheckRes = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN.email]);
    if (adminCheckRes.rows.length === 0) {
      const hashed = bcrypt.hashSync(ADMIN.password, SALT_ROUNDS);
      await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [ADMIN.name, ADMIN.email.toLowerCase().trim(), hashed, ADMIN.role]
      );
      console.log(`  ✅  Admin created  →  ${ADMIN.email}`);
      seeded++;
    } else {
      console.log(`  ⏭️   Admin exists   →  ${ADMIN.email}`);
      skipped++;
    }

    // ── Members ────────────────────────────────────────────────
    const defaultHash = bcrypt.hashSync('Member@1234', SALT_ROUNDS);

    for (const m of MEMBERS) {
      const userCheckRes = await client.query('SELECT id FROM users WHERE email = $1', [m.email]);
      const userRow = userCheckRes.rows[0];

      if (!userRow) {
        const insertUserRes = await client.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [m.name, m.email.toLowerCase().trim(), defaultHash, 'member']
        );
        const uid = insertUserRes.rows[0].id;
        await client.query(
          'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, $2, 0)',
          [uid, PLANNED_AMOUNT]
        );
        console.log(`  ✅  Member created  →  ${m.name.padEnd(20)} (id: ${uid})`);
        seeded++; shares++;
      } else {
        const shareCheckRes = await client.query('SELECT id FROM shares_summary WHERE user_id = $1', [userRow.id]);
        if (shareCheckRes.rows.length === 0) {
          await client.query(
            'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, $2, 0)',
            [userRow.id, PLANNED_AMOUNT]
          );
          shares++;
          console.log(`  🔧  Share row added →  ${m.name}`);
        } else {
          console.log(`  ⏭️   Already exists →  ${m.name}`);
          skipped++;
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n  ❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
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
  process.exit(0);
})();
