'use strict';

const express          = require('express');
const db               = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
router.get('/summary', authenticate, async (req, res) => {
  try {
    const selectedMonth = req.query.month; // e.g. "2026-06" or undefined/all

    const welfareRes = await db.query('SELECT total_expense FROM welfare_fund LIMIT 1');
    const welfare = welfareRes.rows[0];
    const totalExpense   = welfare ? parseFloat(welfare.total_expense) : 0;

    const wtxRes = await db.query('SELECT SUM(amount) AS total_donation FROM welfare_transactions');
    const wtx = wtxRes.rows[0];
    const totalDonation = wtx ? (parseFloat(wtx.total_donation) || 0) : 0;
    const welfareBalance = totalDonation - totalExpense;

    let sharesAgg;
    if (selectedMonth && selectedMonth !== 'all') {
      const sharesAggRes = await db.query(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS total_amount,
          (SELECT COUNT(*) FROM users WHERE role = 'member') AS total_members,
          COALESCE(SUM(shares_bought), 0) AS total_shares_sold,
          COALESCE(SUM(amount_paid), 0) AS monthly_amount
        FROM transactions
        WHERE SUBSTRING(date, 1, 7) = $1
      `, [selectedMonth]);
      sharesAgg = sharesAggRes.rows[0];
    } else {
      const sharesAggRes = await db.query(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS total_amount,
          (SELECT COUNT(*) FROM users WHERE role = 'member') AS total_members,
          COALESCE(SUM(shares_bought), 0) AS total_shares_sold,
          COALESCE(SUM(CASE WHEN SUBSTRING(date, 1, 7) = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN amount_paid ELSE 0 END), 0) AS monthly_amount
        FROM transactions
      `);
      sharesAgg = sharesAggRes.rows[0];
    }

    const monthlyHistoryRes = await db.query(`
      SELECT 
        SUBSTRING(date, 1, 7) AS month, 
        COALESCE(SUM(amount_paid), 0) AS total_amount, 
        COALESCE(SUM(shares_bought), 0) AS total_shares 
      FROM transactions 
      GROUP BY SUBSTRING(date, 1, 7)
      ORDER BY month DESC
    `);
    const monthlyHistory = monthlyHistoryRes.rows;

    // Aggregated members list based on month query
    let members;
    if (selectedMonth && selectedMonth !== 'all') {
      const membersRes = await db.query(`
        SELECT 
            u.id, 
            u.name,
            u.email,
            u.role,
            COALESCE(ss.planned_amount, 5850) AS planned_amount,
            COALESCE(SUM(CASE WHEN SUBSTRING(t.date, 1, 7) = $1 THEN t.shares_bought ELSE 0 END), 0) AS individual_total_shares,
            COALESCE(SUM(CASE WHEN SUBSTRING(t.date, 1, 7) = $2 THEN t.amount_paid ELSE 0 END), 0) AS individual_monthly_deposit,
            COALESCE(SUM(CASE WHEN SUBSTRING(t.date, 1, 7) = $3 THEN t.amount_paid ELSE 0 END), 0) AS individual_total_deposit
        FROM users u
        LEFT JOIN shares_summary ss ON u.id = ss.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        GROUP BY u.id, ss.planned_amount
        ORDER BY u.id ASC
        LIMIT 18
      `, [selectedMonth, selectedMonth, selectedMonth]);
      members = membersRes.rows;
    } else {
      const membersRes = await db.query(`
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
        GROUP BY u.id, ss.planned_amount
        ORDER BY u.id ASC
        LIMIT 18
      `);
      members = membersRes.rows;
    }

    // Convert values to numbers for type safety
    const totalSavings = parseFloat(sharesAgg.total_amount) || 0;
    const soldShares = parseInt(sharesAgg.total_shares_sold) || 0;
    const memberCount = parseInt(sharesAgg.total_members) || 0;
    const monthlyAmount = parseFloat(sharesAgg.monthly_amount) || 0;

    // Convert members' deposit types
    const mappedMembers = members.map(m => ({
      ...m,
      planned_amount: parseFloat(m.planned_amount),
      individual_total_shares: parseInt(m.individual_total_shares),
      individual_monthly_deposit: parseFloat(m.individual_monthly_deposit),
      individual_total_deposit: parseFloat(m.individual_total_deposit)
    }));

    // Convert monthlyHistory types
    const mappedMonthlyHistory = monthlyHistory.map(h => ({
      ...h,
      total_amount: parseFloat(h.total_amount),
      total_shares: parseInt(h.total_shares)
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalSavings,
        total_amount:  totalSavings,
        soldShares,
        total_shares_sold: soldShares,
        monthly_amount: monthlyAmount,
        welfareBalance,
        totalDonation,
        totalExpense,
        memberCount,
        members: mappedMembers,
        monthlyHistory: mappedMonthlyHistory,
      },
    });
  } catch (err) {
    console.error('[Dashboard/Summary]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
});

// ── GET /api/dashboard/member/:id/history ─────────────────────────────────────
router.get('/member/:id/history', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;

    // Optional: Only allow admin to view others, members can only view their own.
    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const transactionsRes = await db.query(`
      SELECT date, amount_paid, shares_bought 
      FROM transactions 
      WHERE user_id = $1 
      ORDER BY date DESC
    `, [userId]);
    const transactions = transactionsRes.rows.map(t => ({
      ...t,
      amount_paid: parseFloat(t.amount_paid),
      shares_bought: parseInt(t.shares_bought)
    }));

    const monthlySummaryRes = await db.query(`
      SELECT 
        SUBSTRING(date, 1, 7) AS month, 
        SUM(amount_paid) AS total_paid, 
        SUM(shares_bought) AS total_shares
      FROM transactions 
      WHERE user_id = $1 
      GROUP BY SUBSTRING(date, 1, 7)
      ORDER BY month DESC
    `, [userId]);
    const monthlySummary = monthlySummaryRes.rows.map(m => ({
      ...m,
      total_paid: parseFloat(m.total_paid),
      total_shares: parseInt(m.total_shares)
    }));

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
