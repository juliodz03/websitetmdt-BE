import express from 'express';
const router = express.Router();
import {
  checkout,
  checkoutPreview
} from '../controllers/checkoutController.js';
import { optionalAuth } from '../middleware/auth.js';

router.post('/', optionalAuth, checkout);
router.post('/preview', optionalAuth, checkoutPreview);

export default router;
