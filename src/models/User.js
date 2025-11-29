import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullName: String,
  phone: String,
  street: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, required: true },
  country: { type: String, default: 'Vietnam' },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  addresses: [addressSchema],
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  isGuestAccount: {
    type: Boolean,
    default: false
  },
  oauthProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  oauthId: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 3600000; // 1 hour
  
  return resetToken;
};

export default mongoose.model('User', userSchema);
