import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - require authentication
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔐 Protect middleware - Token:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded:', { id: decoded.id, exp: new Date(decoded.exp * 1000) });
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('❌ User not found in database:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('✅ User authenticated:', { id: req.user._id, email: req.user.email, role: req.user.role });
      next();
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Optional auth - attach user if token exists, but don't require it
export async function optionalAuth(req, res, next) {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔓 Optional auth - Token:', token ? 'Present' : 'Missing');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        console.log('✅ Optional auth - User found:', { id: req.user?._id, email: req.user?.email });
      } catch (error) {
        console.log('⚠️ Optional auth - Token invalid, continuing as guest');
        // Token invalid, but continue as guest
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  console.log('👑 Admin check - User role:', req.user?.role);
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('❌ Admin access denied - User:', req.user ? `${req.user.email} (${req.user.role})` : 'Not authenticated');
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  console.log('✅ Admin access granted');
  next();
};
