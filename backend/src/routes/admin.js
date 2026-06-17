'use strict';

const express                       = require('express');
const db                            = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// ── POST /api/admin/add-transaction ──────────────────────────────────────────
router.post('/add-transaction', (req, res) => {
  const { userId, date, amount_paid, shares_bought } = req.body;

  if (!userId || date === undefined || amount_paid === undefined || shares_bought === undefined)
    return res.status(400).json({ success: false, message: 'userId, date, amount_paid, and shares_bought are required.' });

  const targetUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!targetUser)
    return res.status(404).json({ success: false, message: 'User not found.' });

  try {
    db.exec('BEGIN');

    // Insert into transactions
    db.prepare('INSERT INTO transactions (user_id, date, amount_paid, shares_bought) VALUES (?, ?, ?, ?)')
      .run(userId, date, Number(amount_paid), Number(shares_bought));

    // For backwards compatibility and the global shares_summary logic, keep actual_amount updated
    const totalDeposit = db.prepare('SELECT SUM(amount_paid) AS sum FROM transactions WHERE user_id = ?').get(userId).sum || 0;
    
    const existing = db.prepare('SELECT id FROM shares_summary WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`UPDATE shares_summary SET actual_amount = ?, updated_at = datetime('now') WHERE user_id = ?`)
        .run(totalDeposit, userId);
    } else {
      db.prepare('INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES (?, 5850, ?)')
        .run(userId, totalDeposit);
    }

    db.exec('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Transaction added for "${targetUser.name}".`,
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Admin/AddTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add transaction.' });
  }
});

// ── PUT /api/admin/set-transaction ───────────────────────────────────────────
router.put('/set-transaction', (req, res) => {
  const { userId, amount_paid, shares_bought } = req.body;

  if (!userId || amount_paid === undefined || shares_bought === undefined)
    return res.status(400).json({ success: false, message: 'userId, amount_paid, and shares_bought are required.' });

  const targetUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!targetUser)
    return res.status(404).json({ success: false, message: 'User not found.' });

  try {
    db.exec('BEGIN');

    // Reset history: Delete all previous transactions
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);

    // Insert new baseline transaction
    db.prepare("INSERT INTO transactions (user_id, date, amount_paid, shares_bought) VALUES (?, date('now'), ?, ?)")
      .run(userId, Number(amount_paid), Number(shares_bought));

    // Update shares_summary
    const existing = db.prepare('SELECT id FROM shares_summary WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`UPDATE shares_summary SET actual_amount = ?, updated_at = datetime('now') WHERE user_id = ?`)
        .run(Number(amount_paid), userId);
    } else {
      db.prepare('INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES (?, 5850, ?)')
        .run(userId, Number(amount_paid));
    }

    db.exec('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Data reset and updated for "${targetUser.name}".`,
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Admin/SetTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset transaction: ' + err.message });
  }
});

// ── PUT /api/admin/update-welfare ─────────────────────────────────────────────
router.put('/update-welfare', (req, res) => {
  const { field, amount, mode = 'set' } = req.body;

  const ALLOWED = ['total_expense'];
  if (!ALLOWED.includes(field))
    return res.status(400).json({ success: false, message: `field must be one of: ${ALLOWED.join(', ')}.` });

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0)
    return res.status(400).json({ success: false, message: 'amount must be a non-negative number.' });

  if (!['set', 'add'].includes(mode))
    return res.status(400).json({ success: false, message: "mode must be 'set' or 'add'." });

  try {
    const sql = mode === 'add'
      ? `UPDATE welfare_fund SET ${field} = ${field} + ?, updated_at = datetime('now')`
      : `UPDATE welfare_fund SET ${field} = ?, updated_at = datetime('now')`;

    db.prepare(sql).run(parsed);

    const updated      = db.prepare('SELECT total_donation, total_expense, updated_at FROM welfare_fund LIMIT 1').get();
    const welfareBalance = updated.total_donation - updated.total_expense;

    return res.status(200).json({
      success: true,
      message: `Welfare "${field}" updated.`,
      data: { ...updated, welfareBalance },
    });
  } catch (err) {
    console.error('[Admin/UpdateWelfare]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update welfare fund.' });
  }
});

// ── POST /api/admin/welfare-transaction ──────────────────────────────────────────
router.post('/welfare-transaction', (req, res) => {
  const { date, donor_name, amount, type = 'donation', notes } = req.body;

  if (!date || amount === undefined) {
    return res.status(400).json({ success: false, message: 'date and amount are required.' });
  }

  if (type === 'donation' && !donor_name) {
    return res.status(400).json({ success: false, message: 'donor_name is required for donations.' });
  }

  if (type === 'expense' && !notes) {
    return res.status(400).json({ success: false, message: 'notes (purpose) is required for expenses.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ success: false, message: 'amount must be a non-negative number.' });
  }

  try {
    db.prepare("INSERT INTO welfare_transactions (date, donor_name, amount, type, notes) VALUES (?, ?, ?, ?, ?)")
      .run(date, type === 'donation' ? donor_name : '', parsedAmount, type, type === 'expense' ? notes : '');

    return res.status(200).json({ success: true, message: 'Welfare transaction added successfully.' });
  } catch (err) {
    console.error('[Admin/WelfareTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add welfare transaction.' });
  }
});

// ── DELETE /api/admin/welfare-transaction/:id ────────────────────────────────────
router.delete('/welfare-transaction/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare("DELETE FROM welfare_transactions WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    return res.status(200).json({ success: true, message: 'Welfare transaction deleted successfully.' });
  } catch (err) {
    console.error('[Admin/DeleteWelfareTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete welfare transaction.' });
  }
});

// ── PUT /api/admin/update-member ────────────────────────────────────────────────
router.put('/update-member', (req, res) => {
  const { userId, name, planned_amount } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

  try {
    db.exec('BEGIN');
    if (name !== undefined) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), userId);
    }
    if (planned_amount !== undefined) {
      const existing = db.prepare('SELECT id FROM shares_summary WHERE user_id = ?').get(userId);
      if (existing) {
        db.prepare("UPDATE shares_summary SET planned_amount = ? WHERE user_id = ?").run(Number(planned_amount), userId);
      } else {
        db.prepare('INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES (?, ?, 0)').run(userId, Number(planned_amount));
      }
    }
    db.exec('COMMIT');
    return res.status(200).json({ success: true, message: 'Member settings updated successfully.' });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Admin/UpdateMember]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update member settings.' });
  }
});

module.exports = router;
