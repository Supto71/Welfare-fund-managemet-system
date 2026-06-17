'use strict';

const express = require('express');
const db      = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/welfare/transactions ───────────────────────────────────────────
router.get('/transactions', authenticate, (req, res) => {
  try {
    const transactions = db.prepare('SELECT id, date, donor_name, amount, type, notes FROM welfare_transactions ORDER BY date DESC, id DESC').all();
    
    const welfare = db.prepare('SELECT total_expense FROM welfare_fund LIMIT 1').get();
    const manualExpense = welfare ? welfare.total_expense : 0;
    
    const wtx_donation = db.prepare("SELECT SUM(amount) AS sum FROM welfare_transactions WHERE type = 'donation'").get();
    const totalDonation = wtx_donation ? (wtx_donation.sum || 0) : 0;

    const wtx_expense = db.prepare("SELECT SUM(amount) AS sum FROM welfare_transactions WHERE type = 'expense'").get();
    const totalExpense = manualExpense + (wtx_expense ? (wtx_expense.sum || 0) : 0);

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
