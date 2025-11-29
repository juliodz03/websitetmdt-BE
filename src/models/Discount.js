import mongoose from 'mongoose';

const discountUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
});

const discountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 5,
    match: /^[A-Z0-9]{5}$/
  },
  valueType: {
    type: String,
    enum: ['percent', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  usageLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  usedCount: {
    type: Number,
    default: 0
  },
  usageHistory: [discountUsageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Check if discount is still valid
discountSchema.methods.isValid = function() {
  return this.isActive && this.usedCount < this.usageLimit;
};

// Calculate discount amount
discountSchema.methods.calculateDiscount = function(subtotal) {
  if (!this.isValid()) return 0;
  
  if (this.valueType === 'percent') {
    return Math.round(subtotal * (this.value / 100));
  } else {
    return Math.min(this.value, subtotal);
  }
};

export default mongoose.model('Discount', discountSchema);
