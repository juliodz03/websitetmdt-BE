import express from 'express';
const router = express.Router();
import {
  validateDiscount
} from '../controllers/discountController.js';

// Public route for validation
router.get('/:code/validate', validateDiscount);

export default router;
