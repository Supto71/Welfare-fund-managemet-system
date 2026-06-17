'use strict';

const express = require('express');
const db      = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/welfare/transactions ───────────────────────────────────────────
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const transactionsRes = await db.query('SELECT id, date, donor_name, amount, type, notes FROM welfare_transactions ORDER BY date DESC, id DESC');
    const transactions = transactionsRes.rows;
    
    const welfareRes = await db.query('SELECT total_expense FROM welfare_fund LIMIT 1');
    const welfare = welfareRes.rows[0];
    const manualExpense = welfare ? parseFloat(welfare.total_expense) : 0;
    
    const wtx_donationRes = await db.query("SELECT SUM(amount) AS sum FROM welfare_transactions WHERE type = 'donation'");
    const wtx_donation = wtx_donationRes.rows[0];
    const totalDonation = wtx_donation ? (parseFloat(wtx_donation.sum) || 0) : 0;

    const wtx_expenseRes = await db.query("SELECT SUM(amount) AS sum FROM welfare_transactions WHERE type = 'expense'");
    const wtx_expense = wtx_expenseRes.rows[0];
    const totalExpense = manualExpense + (wtx_expense ? (parseFloat(wtx_expense.sum) || 0) : 0);

    const welfareBalance = totalDonation - totalExpense;

    return res.status(200).json({ 
      success: true, 
      data: {
        transactions,
        summary: {
          totalDonation,
          totalExpense,
          welfareBalance
        }
      } 
    });
  } catch (err) {
    console.error('[Welfare/Transactions]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch welfare transactions.' });
  }
});

module.exports = router;
