import express from 'express';
const router = express.Router();
import {
  getStats,
  getAdminOrders,
  getOrderDetails,
  updateOrderStatus,
  getUsers,
  getUserDetails,
  toggleUserBan,
  updateUser
} from '../controllers/adminController.js';
import {
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import {
  createDiscount,
  getDiscounts,
  getDiscountUsage,
  toggleDiscount
} from '../controllers/discountController.js';
import { protect, adminOnly } from '../middleware/auth.js';

// All admin routes require authentication and admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/stats', getStats);

// Order management
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getOrderDetails);
router.put('/orders/:id/status', updateOrderStatus);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.put('/users/:id/ban', toggleUserBan);

// Product management
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Discount management
router.post('/discounts', createDiscount);
router.get('/discounts', getDiscounts);
router.get('/discounts/:id/usage', getDiscountUsage);
router.put('/discounts/:id/toggle', toggleDiscount);

export default router;
