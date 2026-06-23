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

const normalizeName = (str) => {
  if (!str) return '';
  return str.toLowerCase()
            .replace(/[\.\-\s]/g, '')
            .replace(/^(md|mst|mst\.)/g, '')
            .trim();
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const role = 'member';

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'name, email, and password are required.' });

  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

  try {
    const emailLower = email.toLowerCase().trim();
    const existingRes = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [emailLower]);
    if (existingRes.rows[0])
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    // Try to match with an existing seeded member by name
    const allUsersRes = await db.query("SELECT id, name, email FROM users WHERE role = 'member'");
    const normalizedInputName = normalizeName(name);
    
    let matchedUserId = null;
    for (const u of allUsersRes.rows) {
      if (normalizeName(u.name) === normalizedInputName && u.email.endsWith('@asenkhaikakalyan.com')) {
        matchedUserId = u.id;
        break;
      }
    }

    const hashed = bcrypt.hashSync(password, SALT_ROUNDS);

    const client = await db.connect();
    let userId;
    try {
      await client.query('BEGIN');
      if (matchedUserId) {
        // Update the existing seeded user record to link their new login credentials
        await client.query(
          'UPDATE users SET name = $1, email = $2, password = $3, is_approved = FALSE WHERE id = $4',
          [name, emailLower, hashed, matchedUserId]
        );
        userId = matchedUserId;
      } else {
        // Create a new user record
        const insertUserRes = await client.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, emailLower, hashed, role]
        );
        userId = insertUserRes.rows[0].id;

        await client.query(
          'INSERT INTO shares_summary (user_id, planned_amount, actual_amount) VALUES ($1, 5850, 0)',
          [userId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const userRes = await db.query('SELECT id, name, email, role, is_approved FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    return res.status(201).json({ 
      success: true, 
      message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। অনুগ্রহ করে এডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন (Registration successful. Please wait for admin approval).', 
      pendingApproval: true 
    });
  } catch (err) {
    console.error('[Auth/Register]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'email and password are required.' });

  try {
    const userRes = await db.query(
      'SELECT id, name, email, password, role, is_approved FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = userRes.rows[0];

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (!user.is_approved) {
      return res.status(403).json({ 
        success: false, 
        message: 'আপনার অ্যাকাউন্টটি এখনও এডমিন দ্বারা অ্যাপ্রুভ করা হয়নি। অনুগ্রহ করে অপেক্ষা করুন (Your account is pending admin approval. Please wait).' 
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[Auth/Login]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
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
  try {
    const userRes = await db.query('SELECT id, name FROM users WHERE email = $1', [emailClean]);
    const user = userRes.rows[0];
    if (!user) {
      // Return success to prevent email enumeration
      return res.status(200).json({ success: true, message: 'If this email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    await db.query(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)',
      [emailClean, otp, expiresAt]
    );

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
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const emailClean = email.toLowerCase().trim();

  try {
    // Find valid OTP
    const recordRes = await db.query(
      'SELECT id, expires_at FROM password_resets WHERE email = $1 AND otp = $2 ORDER BY id DESC LIMIT 1',
      [emailClean, otp]
    );
    const record = recordRes.rows[0];

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    const hashed = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, emailClean]);
      await client.query('DELETE FROM password_resets WHERE email = $1', [emailClean]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
});

module.exports = router;
