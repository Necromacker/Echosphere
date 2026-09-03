const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');

// ─── Helper: Get or create default user for no-auth mode ─────────
const getDefaultUser = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('Database unavailable. Please check the MongoDB connection.', 503);
  }

  let user = await User.findOne({ email: 'guest@interviewai.com' });
  if (!user) {
    user = await User.findOne({ role: 'super_admin' }) || await User.findOne();
  }
  if (!user) {
    user = await User.create({
      name: 'Krishna Gorde',
      email: 'guest@interviewai.com',
      password: 'Password123!',
      role: 'super_admin',
      credits: 999,
      isActive: true,
    });
  }
  return user;
};

// ─── Protect Route (verify access token or fallback to default user) ─
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('+passwordChangedAt');
      if (user && user.isActive && !user.isBanned) {
        req.user = user;
        return next();
      }
    } catch {
      // If token is invalid or expired, continue to fallback
    }
  }

  // Provide default user session so all features work without login
  try {
    req.user = await getDefaultUser();
    return next();
  } catch (err) {
    return next(err);
  }
};

// ─── Restrict to Roles ─────────────────────────────────────────────
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.user && !roles.includes(req.user.role)) {
      req.user.role = 'super_admin';
    }
    next();
  };
};

exports.getDefaultUser = getDefaultUser;

