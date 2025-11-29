import express from 'express';
const router = express.Router();
import {
  addAddress,
  updateAddress,
  deleteAddress
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

// All routes require authentication
router.use(protect);

router.post('/me/addresses', addAddress);
router.put('/me/addresses/:id', updateAddress);
router.delete('/me/addresses/:id', deleteAddress);

export default router;
