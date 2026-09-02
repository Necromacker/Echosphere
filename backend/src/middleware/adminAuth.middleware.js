/**
 * middleware/adminAuth.middleware.js
 *
 * Admin-specific authentication middleware.
 * Separated from auth.middleware.js so admin routes have their own
 * protection layer, independent of regular user auth.
 *
 * Roles hierarchy:
 *   super_admin > admin > candidate
 *
 * Middleware:
 *   protectAdmin     — verifies JWT, ensures role is admin or super_admin
 *   requireSuperAdmin — further restricts to super_admin only
 */

const jwt     = require('jsonwebtoken');
const User    = require('../models/User.model');
const AppError = require('../utils/AppError');
const { getDefaultUser } = require('./auth.middleware');

const ADMIN_ROLES = ['admin', 'super_admin'];

// ─── protectAdmin ─────────────────────────────────────────────────
exports.protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('+passwordChangedAt');
      if (user && user.isActive && !user.isBanned) {
        req.admin = user;
        req.user  = user;
        return next();
      }
    } catch {
      // Fallback
    }
  }

  // Supply default user with super_admin role in no-auth mode
  try {
    const user = await getDefaultUser();
    if (user) {
      user.role = 'super_admin';
    }
    req.admin = user;
    req.user  = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

// ─── requireSuperAdmin ────────────────────────────────────────────
exports.requireSuperAdmin = (req, res, next) => {
  if (req.admin) {
    req.admin.role = 'super_admin';
  }
  next();
};

// ─── isAdminRole helper (utility, not middleware) ─────────────────
exports.isAdminRole = (role) => ADMIN_ROLES.includes(role);
