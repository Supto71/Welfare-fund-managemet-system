'use strict';

const express = require('express');
const db      = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/welfare/transactions ───────────────────────────────────────────
router.get('/transactions', authenticate, (req, res) => {
  try {
    const transactions = db.prepare('SELECT id, date, donor_name, amount FROM welfare_transactions ORDER BY date DESC, id DESC').all();
    const welfare = db.prepare('SELECT total_expense FROM welfare_fund LIMIT 1').get();
    const totalExpense = welfare ? welfare.total_expense : 0;
    const wtx = db.prepare('SELECT SUM(amount) AS total_donation FROM welfare_transactions').get();
    const totalDonation = wtx ? (wtx.total_donation || 0) : 0;
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
