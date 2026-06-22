'use strict';

const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── PUT /api/users/me/name ────────────────────────────────────────────────────
router.put('/me/name', async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'সঠিক নাম লিখুন।' });
  }

  try {
    const newName = name.trim();
    await db.query('UPDATE users SET name = $1 WHERE id = $2', [newName, req.user.id]);
    
    return res.status(200).json({ 
      success: true, 
      message: 'নাম সফলভাবে আপডেট হয়েছে।',
      user: { ...req.user, name: newName }
    });
  } catch (err) {
    console.error('[Users/Me/Name]', err.message);
    return res.status(500).json({ success: false, message: 'নাম আপডেট করতে ব্যর্থ হয়েছে।' });
  }
});

// ── GET /api/users/names ──────────────────────────────────────────────────────
router.get('/names', async (req, res) => {
  try {
    const result = await db.query("SELECT name FROM users WHERE role = 'member' ORDER BY name ASC");
    return res.status(200).json({ success: true, data: result.rows.map(u => u.name) });
  } catch (err) {
    console.error('[Users/Names]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch member names.' });
  }
});

module.exports = router;
