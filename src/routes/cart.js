import express from 'express';
const router = express.Router();
import {
  getCart,
  updateCart,
  clearCart,
  mergeCart
} from '../controllers/cartController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

router.get('/', optionalAuth, getCart);
router.post('/', optionalAuth, updateCart);
router.delete('/', optionalAuth, clearCart);
router.post('/merge', protect, mergeCart);

export default router;
