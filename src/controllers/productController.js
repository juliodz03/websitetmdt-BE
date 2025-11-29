import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Rating from '../models/Rating.js';

// Get all products with pagination, sorting, filtering
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt_desc',
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      tags,
      q
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (tags) query.tags = { $in: tags.split(',') };
    
    // Price filter
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.averageRating = { $gte: Number(rating) };
    }

    // Search
    if (q) {
      query.$text = { $search: q };
    }

    // Sort
    let sortOption = {};
    switch (sort) {
      case 'name_asc':
        sortOption = { name: 1 };
        break;
      case 'name_desc':
        sortOption = { name: -1 };
        break;
      case 'price_asc':
        sortOption = { basePrice: 1 };
        break;
      case 'price_desc':
        sortOption = { basePrice: -1 };
        break;
      case 'rating_desc':
        sortOption = { averageRating: -1 };
        break;
      case 'sold_desc':
        sortOption = { soldCount: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get reviews
    const reviews = await Review.find({ product: product._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      product,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create product (Admin)
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product (Admin)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add review (public)
export const addReview = async (req, res) => {
  try {
    const { name, email, comment } = req.body;
    const productId = req.params.id;

    const review = await Review.create({
      product: productId,
      user: req.user?.id,
      name,
      email,
      comment,
      isGuest: !req.user
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('newComment', {
        productId,
        review
      });
    }

    // Update product review count
    await Product.findByIdAndUpdate(productId, {
      $inc: { totalReviews: 1 }
    });

    res.status(201).json({
      success: true,
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add/Update rating (requires auth)
export const addRating = async (req, res) => {
  try {
    const { rating } = req.body;
    const productId = req.params.id;
    const userId = req.user.id;

    // Upsert rating
    const ratingDoc = await Rating.findOneAndUpdate(
      { product: productId, user: userId },
      { rating },
      { upsert: true, new: true }
    );

    // Recalculate product average rating
    const ratings = await Rating.find({ product: productId });
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    const product = await Product.findByIdAndUpdate(
      productId,
      { 
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length
      },
      { new: true }
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('newRating', {
        productId,
        averageRating: product.averageRating,
        totalRatings: product.totalRatings
      });
    }

    res.json({
      success: true,
      rating: ratingDoc,
      product: {
        averageRating: product.averageRating,
        totalRatings: product.totalRatings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get brands
export const getBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand');
    
    res.json({
      success: true,
      brands
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const featured = await Product.find({ isFeatured: true, isActive: true })
      .limit(10);

    res.json({
      success: true,
      products: featured
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get best sellers
export const getBestSellers = async (req, res) => {
  try {
    const bestSellers = await Product.find({ isActive: true })
      .sort({ soldCount: -1 })
      .limit(10);

    res.json({
      success: true,
      products: bestSellers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get new products
export const getNewProducts = async (req, res) => {
  try {
    const newProducts = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      products: newProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
