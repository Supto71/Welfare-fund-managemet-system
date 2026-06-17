'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const db      = require('../db/database');

const router = express.Router();
const SALT_ROUNDS = 12;

const signToken = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const role = 'member';

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'name, email, and password are required.' });

  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing)
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

  try {
    const hashed = bcrypt.hashSync(password, SALT_ROUNDS);

    db.exec('BEGIN');
    const result = db
      .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
      .run(name, email.toLowerCase().trim(), hashed, role);

    const userId = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES (?, 5850, 0)')
      .run(userId);
    db.exec('COMMIT');

    const user  = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId);
    const token = signToken(user);

    return res.status(201).json({ success: true, message: 'Registration successful.', token, user });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Auth/Register]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'email and password are required.' });

  const user = db
    .prepare('SELECT id, name, email, password, role FROM users WHERE email = ?')
    .get(email.toLowerCase().trim());

  if (!user)
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  if (!bcrypt.compareSync(password, user.password))
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  const token = signToken(user);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// ── MAIL TRANSPORTER ──────────────────────────────────────────────────────────
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  const emailClean = email.toLowerCase().trim();
  const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(emailClean);
  if (!user) {
    // Return success to prevent email enumeration
    return res.status(200).json({ success: true, message: 'If this email exists, an OTP has been sent.' });
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

  try {
    db.prepare('INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)')
      .run(emailClean, otp, expiresAt);

    // Send Email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"আসেন খাই কল্যাণ তহবিল" <${process.env.SMTP_USER}>`,
        to: emailClean,
        subject: 'Password Reset Code',
        text: `Hello ${user.name},\n\nYour password reset code is: ${otp}\n\nThis code will expire in 15 minutes.\nIf you did not request this, please ignore this email.`,
        html: `<p>Hello <strong>${user.name}</strong>,</p>
               <p>Your password reset code is: <strong style="font-size:24px; color:#1e3a8a;">${otp}</strong></p>
               <p>This code will expire in 15 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>`
      });
      return res.status(200).json({ success: true, message: 'রিসেট কোডটি আপনার ইমেইলে পাঠানো হয়েছে (OTP code has been sent to your email)।' });
    } else {
      console.warn('[Forgot Password] Email not sent because SMTP credentials are not configured. OTP:', otp);
      return res.status(200).json({ 
        success: true, 
        message: `SMTP কনফিগার করা নেই! টেস্ট করার জন্য আপনার রিসেট কোড (OTP) হলো: ${otp} (SMTP not configured! For testing, your reset code is: ${otp})`
      });
    }
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const emailClean = email.toLowerCase().trim();

  // Find valid OTP
  const record = db.prepare('SELECT id, expires_at FROM password_resets WHERE email = ? AND otp = ? ORDER BY id DESC LIMIT 1')
    .get(emailClean, otp);

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP has expired.' });
  }

  try {
    const hashed = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    db.exec('BEGIN');
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashed, emailClean);
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(emailClean);
    db.exec('COMMIT');

    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
});

module.exports = router;
