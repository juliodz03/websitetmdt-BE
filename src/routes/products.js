import express from 'express';
const router = express.Router();
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  addRating,
  getCategories,
  getBrands,
  getFeaturedProducts,
  getBestSellers,
  getNewProducts
} from '../controllers/productController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/best-sellers', getBestSellers);
router.get('/new', getNewProducts);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/:id', getProduct);

// Reviews (public, but can be authenticated)
router.post('/:id/reviews', optionalAuth, addReview);

// Ratings (require auth)
router.post('/:id/rating', protect, addRating);

// Admin routes
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
