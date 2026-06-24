'use strict';

const express                       = require('express');
const db                            = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { syncMembersToSheet }        = require('../services/googleSheets');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// ── POST /api/admin/add-transaction ──────────────────────────────────────────
router.post('/add-transaction', async (req, res) => {
  const { userId, date, amount_paid, shares_bought, note } = req.body;

  if (!userId || date === undefined || amount_paid === undefined || shares_bought === undefined)
    return res.status(400).json({ success: false, message: 'userId, date, amount_paid, and shares_bought are required.' });

  try {
    const targetUserRes = await db.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    const targetUser = targetUserRes.rows[0];
    if (!targetUser)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Insert into transactions
      await client.query(
        'INSERT INTO transactions (user_id, date, amount_paid, shares_bought, notes) VALUES ($1, $2, $3, $4, $5)',
        [userId, date, Number(amount_paid), Number(shares_bought), note || null]
      );

      // Fetch sum of amount_paid for user
      const totalDepositRes = await client.query('SELECT SUM(amount_paid) AS sum FROM transactions WHERE user_id = $1', [userId]);
      const totalDeposit = parseFloat(totalDepositRes.rows[0].sum) || 0;
      
      const existingRes = await client.query('SELECT id FROM shares_summary WHERE user_id = $1', [userId]);
      const existing = existingRes.rows[0];

      if (existing) {
        await client.query(
          `UPDATE shares_summary SET actual_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
          [totalDeposit, userId]
        );
      } else {
        await client.query(
          'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, 5850, $2)',
          [userId, totalDeposit]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    // --- Notification Trigger ---
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, 'নতুন লেনদেন (New Transaction)', `আপনার অ্যাকাউন্টে নতুন লেনদেন যুক্ত করা হয়েছে। (A new transaction was added to your account.)`, 'transaction']
    );

    // --- Sync to Google Sheets ---
    syncMembersToSheet().catch(console.error);

    return res.status(200).json({
      success: true,
      message: `Transaction added for "${targetUser.name}".`,
    });
  } catch (err) {
    console.error('[Admin/AddTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add transaction.' });
  }
});

// ── PUT /api/admin/set-transaction ───────────────────────────────────────────
router.put('/set-transaction', async (req, res) => {
  const { userId, amount_paid, shares_bought } = req.body;

  if (!userId || amount_paid === undefined || shares_bought === undefined)
    return res.status(400).json({ success: false, message: 'userId, amount_paid, and shares_bought are required.' });

  try {
    const targetUserRes = await db.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    const targetUser = targetUserRes.rows[0];
    if (!targetUser)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Reset history: Delete all previous transactions
      await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);

      // Insert new baseline transaction
      await client.query(
        "INSERT INTO transactions (user_id, date, amount_paid, shares_bought) VALUES ($1, TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), $2, $3)",
        [userId, Number(amount_paid), Number(shares_bought)]
      );

      // Update shares_summary
      const existingRes = await client.query('SELECT id FROM shares_summary WHERE user_id = $1', [userId]);
      const existing = existingRes.rows[0];

      if (existing) {
        await client.query(
          `UPDATE shares_summary SET actual_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
          [Number(amount_paid), userId]
        );
      } else {
        await client.query(
          'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, 5850, $2)',
          [userId, Number(amount_paid)]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    // --- Notification Trigger ---
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, 'অ্যাকাউন্ট আপডেট (Account Updated)', `আপনার শেয়ার এবং জমার পরিমাণ আপডেট করা হয়েছে। (Your shares and deposit amount were updated.)`, 'transaction']
    );

    // --- Sync to Google Sheets ---
    syncMembersToSheet().catch(console.error);

    return res.status(200).json({
      success: true,
      message: `Data reset and updated for "${targetUser.name}".`,
    });
  } catch (err) {
    console.error('[Admin/SetTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset transaction: ' + err.message });
  }
});

// ── PUT /api/admin/update-welfare ─────────────────────────────────────────────
router.put('/update-welfare', async (req, res) => {
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
      ? `UPDATE welfare_fund SET ${field} = ${field} + $1, updated_at = CURRENT_TIMESTAMP`
      : `UPDATE welfare_fund SET ${field} = $1, updated_at = CURRENT_TIMESTAMP`;

    await db.query(sql, [parsed]);

    const updatedRes = await db.query('SELECT total_donation, total_expense, updated_at FROM welfare_fund LIMIT 1');
    const updated = updatedRes.rows[0];
    
    const totalDonation = parseFloat(updated.total_donation) || 0;
    const totalExpense = parseFloat(updated.total_expense) || 0;
    const welfareBalance = totalDonation - totalExpense;

    return res.status(200).json({
      success: true,
      message: `Welfare "${field}" updated.`,
      data: {
        total_donation: totalDonation,
        total_expense: totalExpense,
        updated_at: updated.updated_at,
        welfareBalance
      },
    });
  } catch (err) {
    console.error('[Admin/UpdateWelfare]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update welfare fund.' });
  }
});

// ── POST /api/admin/welfare-transaction ──────────────────────────────────────────
router.post('/welfare-transaction', async (req, res) => {
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
    await db.query(
      "INSERT INTO welfare_transactions (date, donor_name, amount, type, notes) VALUES ($1, $2, $3, $4, $5)",
      [date, type === 'donation' ? donor_name : '', parsedAmount, type, notes || '']
    );

    return res.status(200).json({ success: true, message: 'Welfare transaction added successfully.' });
  } catch (err) {
    console.error('[Admin/WelfareTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add welfare transaction.' });
  }
});

// ── PUT /api/admin/welfare-transaction/:id ───────────────────────────────────────
router.put('/welfare-transaction/:id', async (req, res) => {
  const { id } = req.params;
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
    const result = await db.query(
      "UPDATE welfare_transactions SET date = $1, donor_name = $2, amount = $3, type = $4, notes = $5 WHERE id = $6",
      [date, type === 'donation' ? donor_name : '', parsedAmount, type, notes || '', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.status(200).json({ success: true, message: 'Welfare transaction updated successfully.' });
  } catch (err) {
    console.error('[Admin/UpdateWelfareTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update welfare transaction.' });
  }
});

// ── DELETE /api/admin/welfare-transaction/:id ────────────────────────────────────
router.delete('/welfare-transaction/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("DELETE FROM welfare_transactions WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    return res.status(200).json({ success: true, message: 'Welfare transaction deleted successfully.' });
  } catch (err) {
    console.error('[Admin/DeleteWelfareTransaction]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete welfare transaction.' });
  }
});

// ── PUT /api/admin/update-member ────────────────────────────────────────────────
router.put('/update-member', async (req, res) => {
  const { userId, name, planned_amount } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      if (name !== undefined) {
        await client.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), userId]);
      }
      if (planned_amount !== undefined) {
        const existingRes = await client.query('SELECT id FROM shares_summary WHERE user_id = $1', [userId]);
        const existing = existingRes.rows[0];
        if (existing) {
          await client.query("UPDATE shares_summary SET planned_amount = $1 WHERE user_id = $2", [Number(planned_amount), userId]);
        } else {
          await client.query('INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, $2, 0)', [userId, Number(planned_amount)]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
    // --- Sync to Google Sheets ---
    syncMembersToSheet().catch(console.error);
    
    return res.status(200).json({ success: true, message: 'Member settings updated successfully.' });
  } catch (err) {
    console.error('[Admin/UpdateMember]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update member settings.' });
  }
});

// ── PUT /api/admin/update-member-full/:id ───────────────────────────────────────
router.put('/update-member-full/:id', async (req, res) => {
  const { id } = req.params;
  const { name, remarks, total_deposit } = req.body;

  if (!name || total_deposit === undefined) {
    return res.status(400).json({ success: false, message: 'Name and total_deposit are required.' });
  }

  const newDeposit = parseFloat(total_deposit);
  if (isNaN(newDeposit) || newDeposit < 0) {
    return res.status(400).json({ success: false, message: 'Total deposit must be a valid non-negative number.' });
  }

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Update name
      await client.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), id]);

      // Update remarks (ensure shares_summary exists)
      const ssRes = await client.query('SELECT * FROM shares_summary WHERE user_id = $1', [id]);
      if (ssRes.rowCount === 0) {
        await client.query('INSERT INTO shares_summary (user_id, remarks) VALUES ($1, $2)', [id, remarks || '']);
      } else {
        await client.query('UPDATE shares_summary SET remarks = $1 WHERE user_id = $2', [remarks || '', id]);
      }

      // Handle Adjustment Transaction
      // Calculate current total
      const txRes = await client.query('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM transactions WHERE user_id = $1', [id]);
      const currentTotal = parseFloat(txRes.rows[0].total) || 0;
      
      const diff = newDeposit - currentTotal;
      if (Math.abs(diff) > 0.01) {
        const shares_bought = Math.floor(diff / 100); // 1 share = 100
        await client.query(
          "INSERT INTO transactions (user_id, amount_paid, shares_bought, date) VALUES ($1, $2, $3, TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'))",
          [id, diff, shares_bought]
        );
      }

      await client.query('COMMIT');
      
      // Sync to Google Sheets
      syncMembersToSheet().catch(console.error);

      return res.status(200).json({ success: true, message: 'Member profile updated successfully.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Admin/UpdateMemberFull]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update member profile.' });
  }
});

// ── GET /api/admin/pending-approvals ─────────────────────────────────────────────
router.get('/pending-approvals', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, created_at FROM users WHERE role = 'member' AND is_approved = FALSE ORDER BY created_at DESC"
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin/PendingApprovals]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending approvals.' });
  }
});

// ── POST /api/admin/approve-user ─────────────────────────────────────────────────
router.post('/approve-user', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

  try {
    await db.query("UPDATE users SET is_approved = TRUE WHERE id = $1", [userId]);
    
    // --- Notification Trigger ---
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, 'অ্যাকাউন্ট অনুমোদিত (Account Approved)', `স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে অনুমোদিত হয়েছে। (Welcome! Your account has been successfully approved.)`, 'approval']
    );

    // --- Sync to Google Sheets ---
    syncMembersToSheet().catch(console.error);

    return res.status(200).json({ success: true, message: 'User approved successfully.' });
  } catch (err) {
    console.error('[Admin/ApproveUser]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to approve user.' });
  }
});

// ── POST /api/admin/reject-user ──────────────────────────────────────────────────
router.post('/reject-user', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

  try {
    // Delete cascade will automatically clean up shares_summary/transactions
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    // --- Sync to Google Sheets ---
    syncMembersToSheet().catch(console.error);

    return res.status(200).json({ success: true, message: 'User rejected and deleted successfully.' });
  } catch (err) {
    console.error('[Admin/RejectUser]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reject user.' });
  }
});
// ── POST /api/admin/broadcast-notification ─────────────────────────────────────
router.post('/broadcast-notification', async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  }

  // Security check: Only the main admin email can broadcast
  if (req.user.email !== 'mohasin_ni@yahoo.com') {
    return res.status(403).json({ success: false, message: 'Only the main administrator can broadcast messages.' });
  }

  try {
    // Get all approved members and admins
    const usersRes = await db.query(
      "SELECT id FROM users WHERE role IN ('member', 'admin') AND is_approved = true"
    );
    const users = usersRes.rows;

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'No approved members found to broadcast.' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Bulk insert notifications
      const insertQuery = `
        INSERT INTO notifications (user_id, title, message, type) 
        VALUES ($1, $2, $3, $4)
      `;
      for (const u of users) {
        await client.query(insertQuery, [u.id, subject, message, 'broadcast']);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.status(200).json({ success: true, message: `Notification broadcasted to ${users.length} members.` });
  } catch (err) {
    console.error('[Admin/BroadcastNotification]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification.' });
  }
});

module.exports = router;
