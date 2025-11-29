import Order from '../models/Order.js';

// Get user orders
export const getOrders = async (req, res) => {
  try {
    console.log('📦 Get Orders - User:', req.user ? `${req.user._id} (${req.user.email})` : 'NOT AUTHENTICATED');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { user: req.user._id };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('items.product');

    console.log('📦 Found orders:', orders.length);

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('❌ Error in getOrders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single order
export const getOrder = async (req, res) => {
  try {
    console.log('📦 Get Order Details - User:', req.user ? `${req.user._id} (${req.user.email})` : 'NOT AUTHENTICATED');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'email fullName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ Error in getOrder:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update order status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Add to status history
    order.statusHistory.push({
      status,
      time: new Date(),
      note
    });
    
    order.currentStatus = status;

    // If delivered, mark as paid
    if (status === 'delivered') {
      order.isPaid = true;
      order.paidAt = new Date();
    }

    await order.save();

    // Emit socket event
    if (req.io) {
      req.io.emit('orderStatusUpdated', {
        orderId: order._id,
        status,
        orderNumber: order.orderNumber
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
