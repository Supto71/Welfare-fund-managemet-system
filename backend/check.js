const db = require('./src/db/database');

async function check() {
  const q1 = await db.query("SELECT * FROM users WHERE name ILIKE '%Kykobad%' OR name ILIKE '%Nazrul%'");
  console.log('Users:', q1.rows);

  const q2 = await db.query(`SELECT user_id, SUM(amount_paid) as amount, SUM(shares_bought) as shares FROM transactions GROUP BY user_id`);
  console.log('Transactions:', q2.rows);

  process.exit(0);
}

check();
