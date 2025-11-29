import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Get dashboard statistics
export const getStats = async (req, res) => {
  try {
    const { range = 'month', start, end } = req.query;

    // Calculate date range
    let startDate, endDate;
    const now = new Date();

    switch (range) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      case 'custom':
        if (!start || !end) {
          return res.status(400).json({
            success: false,
            message: 'Start and end dates required for custom range'
          });
        }
        startDate = new Date(start);
        endDate = new Date(end);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
    }

    // Get orders in date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Simple profit calculation (assuming 30% margin)
    const totalProfit = Math.round(totalRevenue * 0.3);

    // Get best sellers
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.product.toString();
        if (!productSales[key]) {
          productSales[key] = {
            productId: item.product,
            productName: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal;
      });
    });

    const bestSellers = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Order status breakdown
    const statusBreakdown = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(order => {
      statusBreakdown[order.currentStatus]++;
    });

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'fullName email');

    // Get total users
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const newUsers = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        totalProfit,
        totalUsers,
        newUsers,
        statusBreakdown,
        bestSellers,
        recentOrders,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all orders (Admin with pagination and filters)
export const getAdminOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      perPage = 20, 
      from, 
      to, 
      status,
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);

    // Build query
    const query = {};

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    if (status) {
      query.currentStatus = status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(perPage))
      .populate('user', 'fullName email');

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / Number(perPage));

    res.json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        perPage: Number(perPage),
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

// Get all users (Admin)
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { role: 'customer' };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      users,
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

// Get single user details (Admin)
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalOrders = await Order.countDocuments({ user: user._id });
    const totalSpent = await Order.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      user,
      orderStats: {
        totalOrders,
        totalSpent: totalSpent[0]?.total || 0,
        recentOrders: orders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Ban/Unban user (Admin)
export const toggleUserBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban admin user'
      });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      message: user.isBanned ? 'User banned successfully' : 'User unbanned successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user info (Admin)
export const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, loyaltyPoints } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (loyaltyPoints !== undefined) user.loyaltyPoints = loyaltyPoints;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
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

    const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update current status
    order.currentStatus = status;

    // Add to status history
    order.statusHistory.push({
      status,
      time: new Date(),
      note: note || ''
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get order details (Admin)
export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
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
