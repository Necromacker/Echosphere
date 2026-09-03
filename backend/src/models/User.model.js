const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    role: {
      type: String,
      enum: ['candidate', 'support', 'content_manager', 'admin', 'super_admin'],
      default: 'candidate',
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    credits: {
      type: Number,
      default: 10,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────
userSchema.virtual('sessions', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'userId',
});

module.exports = mongoose.model('User', userSchema);
