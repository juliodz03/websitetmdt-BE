import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Index for quick lookup
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });

// Calculate total amount
cartSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  return this.totalAmount;
};

export default mongoose.model('Cart', cartSchema);
