'use strict';

/**
 * Express Application Entry Point
 * Share and Welfare Fund Management API
 *
 * Loads environment variables, sets up middleware, mounts all route modules,
 * and starts the HTTP server.
 */

// ── Load env vars before anything else ────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Initialise the database (creates tables if they don't exist)
require('./db/database');

// ── Route modules ──────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes     = require('./routes/admin');
const usersRoutes     = require('./routes/users');
const welfareRoutes   = require('./routes/welfare');

// ── Application setup ──────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*', // lock down in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());          // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welfare Fund API is running.',
    timestamp: new Date().toISOString(),
  });
});

// ─── Route mounting ───────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/welfare',   welfareRoutes);

// ─── Serve Frontend (Static) ──────────────────────────────────────────────────
const uiBuildPath = path.join(__dirname, '../../ui/dist');
app.use(express.static(uiBuildPath));

// ─── 404 handler for API routes ───────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── React Router Fallback ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(uiBuildPath, 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error.',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🏦  আসেন খাই কল্যাণ তহবিল`);
  console.log(`  📡  API Server → http://localhost:${PORT}`);
  console.log(`  🌱  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app; // Export for testing
