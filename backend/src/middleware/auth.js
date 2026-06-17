'use strict';

/**
 * JWT Authentication Middleware
 *
 * Verifies the Bearer token from the Authorization header and attaches the
 * decoded payload to `req.user`.  Optionally restricts access to specific
 * roles via the `requireRole` factory.
 */

const jwt = require('jsonwebtoken');

// ─── Token verification ───────────────────────────────────────────────────────

/**
 * authenticate
 * Middleware that validates the JWT and populates req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token expired. Please log in again.'
        : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }
};

// ─── Role guard ───────────────────────────────────────────────────────────────

/**
 * requireRole
 * Factory that returns a middleware restricting access to specific role(s).
 *
 * @param {...string} roles - Allowed roles, e.g. requireRole('admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires role: ${roles.join(' or ')}.`,
    });
  }

  next();
};

module.exports = { authenticate, requireRole };
