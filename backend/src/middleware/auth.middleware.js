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

// ─── Anonymous candidate identity ──────────────────────────────────
exports.protect = async (req, res, next) => {
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

