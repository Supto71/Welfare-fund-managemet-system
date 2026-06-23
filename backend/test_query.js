const db = require('./src/db/database');

async function test() {
  const query = `
        SELECT 
            u.id, 
            u.name,
            u.email,
            u.role,
            COALESCE(ss.planned_amount, 5850) AS planned_amount,
            COALESCE(SUM(t.shares_bought), 0) AS individual_total_shares,
            COALESCE(SUM(CASE WHEN SUBSTRING(t.date, 1, 7) = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN t.amount_paid ELSE 0 END), 0) AS individual_monthly_deposit,
            COALESCE(SUM(t.amount_paid), 0) AS individual_total_deposit
        FROM users u
        LEFT JOIN shares_summary ss ON u.id = ss.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        WHERE u.is_approved = TRUE
        GROUP BY u.id, ss.planned_amount
        ORDER BY u.id ASC
  `;
  const result = await db.query(query);
  console.log(result.rows);
  process.exit(0);
}
test();
