import Discount from '../models/Discount.js';

// Create discount code (Admin)
export const createDiscount = async (req, res) => {
  try {
    const { code, valueType, value, usageLimit } = req.body;

    // Validate code format
    if (!/^[A-Z0-9]{5}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Code must be 5 alphanumeric characters'
      });
    }

    // Validate usage limit
    if (usageLimit > 10) {
      return res.status(400).json({
        success: false,
        message: 'Usage limit cannot exceed 10'
      });
    }

    const discount = await Discount.create({
      code: code.toUpperCase(),
      valueType,
      value,
      usageLimit,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      discount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Discount code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all discounts (Admin)
export const getDiscounts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const discounts = await Discount.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'fullName email');

    const total = await Discount.countDocuments();
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      discounts,
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

// Validate discount code
export const validateDiscount = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId, subtotal } = req.query;

    const discount = await Discount.findOne({ code: code.toUpperCase() });

    if (!discount) {
      return res.json({
        success: true,
        valid: false,
        message: 'Discount code not found'
      });
    }

    if (!discount.isValid()) {
      return res.json({
        success: true,
        valid: false,
        message: 'Discount code is no longer valid',
        usedCount: discount.usedCount,
        usageLimit: discount.usageLimit
      });
    }

    const discountAmount = discount.calculateDiscount(Number(subtotal));

    res.json({
      success: true,
      valid: true,
      discount: {
        code: discount.code,
        valueType: discount.valueType,
        value: discount.value,
        remainingUses: discount.usageLimit - discount.usedCount,
        discountAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get discount usage logs (Admin)
export const getDiscountUsage = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id)
      .populate('usageHistory.user', 'fullName email')
      .populate('usageHistory.order', 'orderNumber totalAmount');

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found'
      });
    }

    res.json({
      success: true,
      discount,
      usageHistory: discount.usageHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle discount active status (Admin)
export const toggleDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found'
      });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    res.json({
      success: true,
      discount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
