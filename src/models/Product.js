import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  inventory: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  attributes: {
    type: Map,
    of: String,
    default: {}
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  shortDescription: {
    type: String,
    required: true,
    minlength: 50
  },
  brand: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [String],
  images: [{
    url: String,
    alt: String
  }],
  variants: {
    type: [variantSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 2;
      },
      message: 'Product must have at least 2 variants'
    }
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Create slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Index for search and filter
productSchema.index({ name: 'text', shortDescription: 'text', brand: 'text' });
productSchema.index({ category: 1, brand: 1, basePrice: 1 });

export default mongoose.model('Product', productSchema);
