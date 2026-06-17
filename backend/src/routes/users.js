'use strict';

const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── PUT /api/users/me/name ────────────────────────────────────────────────────
router.put('/me/name', (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'সঠিক নাম লিখুন।' });
  }

  try {
    const newName = name.trim();
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(newName, req.user.id);
    
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
router.get('/names', (req, res) => {
  try {
    const users = db.prepare('SELECT name FROM users ORDER BY name ASC').all();
    return res.status(200).json({ success: true, data: users.map(u => u.name) });
  } catch (err) {
    console.error('[Users/Names]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch member names.' });
  }
});

module.exports = router;
