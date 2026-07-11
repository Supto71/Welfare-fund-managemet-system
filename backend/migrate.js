const db = require('./src/db/database');

(async () => {
  try {
    const client = await db.connect();
    await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT');
    console.log('Migration successful: Added notes column to transactions table.');
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
