'use strict';

const express          = require('express');
const db               = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
router.get('/summary', authenticate, (req, res) => {
  try {
    const selectedMonth = req.query.month; // e.g. "2026-06" or undefined/all

    const welfare = db.prepare('SELECT total_expense FROM welfare_fund LIMIT 1').get();
    const totalExpense   = welfare ? welfare.total_expense  : 0;

    const wtx = db.prepare('SELECT SUM(amount) AS total_donation FROM welfare_transactions').get();
    const totalDonation = wtx ? (wtx.total_donation || 0) : 0;
    const welfareBalance = totalDonation - totalExpense;

    let sharesAgg;
    if (selectedMonth && selectedMonth !== 'all') {
      sharesAgg = db.prepare(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS total_amount,
          COUNT(DISTINCT user_id) AS totalMembers,
          COALESCE(SUM(shares_bought), 0) AS total_shares_sold,
          COALESCE(SUM(amount_paid), 0) AS monthly_amount
        FROM transactions
        WHERE strftime('%Y-%m', date) = ?
      `).get(selectedMonth);
    } else {
      sharesAgg = db.prepare(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS total_amount,
          COUNT(DISTINCT user_id) AS totalMembers,
          COALESCE(SUM(shares_bought), 0) AS total_shares_sold,
          COALESCE(SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN amount_paid ELSE 0 END), 0) AS monthly_amount
        FROM transactions
      `).get();
    }

    const monthlyHistory = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) AS month, 
        COALESCE(SUM(amount_paid), 0) AS total_amount, 
        COALESCE(SUM(shares_bought), 0) AS total_shares 
      FROM transactions 
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
    `).all();

    // Aggregated members list based on month query
    let members;
    if (selectedMonth && selectedMonth !== 'all') {
      members = db.prepare(`
        SELECT 
            u.id, 
            u.name,
            u.email,
            u.role,
            COALESCE(ss.planned_amount, 5850) AS planned_amount,
            COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? THEN t.shares_bought ELSE 0 END), 0) AS individual_total_shares,
            COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? THEN t.amount_paid ELSE 0 END), 0) AS individual_monthly_deposit,
            COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? THEN t.amount_paid ELSE 0 END), 0) AS individual_total_deposit
        FROM users u
        LEFT JOIN shares_summary ss ON u.id = ss.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        GROUP BY u.id
        ORDER BY u.id ASC
        LIMIT 18
      `).all(selectedMonth, selectedMonth, selectedMonth);
    } else {
      members = db.prepare(`
        SELECT 
            u.id, 
            u.name,
            u.email,
            u.role,
            COALESCE(ss.planned_amount, 5850) AS planned_amount,
            COALESCE(SUM(t.shares_bought), 0) AS individual_total_shares,
            COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now') THEN t.amount_paid ELSE 0 END), 0) AS individual_monthly_deposit,
            COALESCE(SUM(t.amount_paid), 0) AS individual_total_deposit
        FROM users u
        LEFT JOIN shares_summary ss ON u.id = ss.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        GROUP BY u.id
        ORDER BY u.id ASC
        LIMIT 18
      `).all();
    }

    return res.status(200).json({
      success: true,
      data: {
        totalSavings:  sharesAgg.total_amount, // keeping totalSavings for backward compatibility if needed, or just replace
        total_amount:  sharesAgg.total_amount,
        soldShares:    sharesAgg.total_shares_sold,
        total_shares_sold: sharesAgg.total_shares_sold,
        monthly_amount: sharesAgg.monthly_amount,
        welfareBalance,
        totalDonation,
        totalExpense,
        memberCount:   sharesAgg.totalMembers,
        members,
        monthlyHistory,
      },
    });
  } catch (err) {
    console.error('[Dashboard/Summary]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
});

// ── GET /api/dashboard/member/:id/history ─────────────────────────────────────
router.get('/member/:id/history', authenticate, (req, res) => {
  try {
    const userId = req.params.id;

    // Optional: Only allow admin to view others, members can only view their own.
    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const transactions = db.prepare(`
      SELECT date, amount_paid, shares_bought 
      FROM transactions 
      WHERE user_id = ? 
      ORDER BY date DESC
    `).all(userId);

    const monthlySummary = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) AS month, 
        SUM(amount_paid) AS total_paid, 
        SUM(shares_bought) AS total_shares
      FROM transactions 
      WHERE user_id = ? 
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
    `).all(userId);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        monthlySummary
      }
    });
  } catch (err) {
    console.error('[Dashboard/History]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

module.exports = router;
