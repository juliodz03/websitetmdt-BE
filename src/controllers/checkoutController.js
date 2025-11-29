import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Discount from '../models/Discount.js';
import { sendEmail, templates } from '../utils/email.js';
import { generateToken } from '../utils/jwt.js';
import crypto from 'crypto';

// Checkout
export const checkout = async (req, res) => {
  try {
    const {
      cartItems,
      shippingAddressId,
      shippingAddress,
      paymentMethod,
      discountCode,
      pointsToUse,
      guestInfo // { email, fullName, phone }
    } = req.body;

    console.log('Checkout request:', { cartItems, shippingAddress, paymentMethod, guestInfo });
    console.log('req.user:', req.user);
    console.log('Authorization header:', req.headers.authorization);

    let userId = req.user?.id;
    let user = req.user;

    // Handle guest checkout (or authenticated user without proper req.user)
    if (!userId && (guestInfo || shippingAddress)) {
      // If no guestInfo but has shippingAddress, create guest from shipping info
      const guestData = guestInfo || {
        email: `guest_${Date.now()}@temp.com`, // Temporary email
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone
      };
      
      console.log('Creating/finding guest user with:', guestData);
      // Check if user exists
      let existingUser = await User.findOne({ email: guestData.email });

      if (!existingUser) {
        // Create guest account
        const tempPassword = crypto.randomBytes(8).toString('hex');
        
        existingUser = await User.create({
          email: guestData.email,
          fullName: guestData.fullName,
          password: tempPassword,
          isGuestAccount: true,
          addresses: shippingAddress ? [{
            ...shippingAddress,
            isDefault: true
          }] : []
        });

        // Send email with credentials (disabled - configure SMTP to enable)
        if (guestInfo && guestInfo.email) {
          console.log(`✉️  Guest account email would be sent to: ${existingUser.email}`);
          console.log(`🔑 Temporary password: ${tempPassword}`);
          // TODO: Uncomment when email is configured
          // try {
          //   await sendEmail({
          //     to: existingUser.email,
          //     subject: 'Your Account Has Been Created',
          //     html: templates.guestAccountCreated(existingUser.email, tempPassword)
          //   });
          // } catch (emailError) {
          //   console.error('Failed to send guest account email:', emailError);
          // }
        }
      }

      userId = existingUser._id;
      user = existingUser;
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User authentication or guest info required'
      });
    }

    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Get shipping address
    let finalShippingAddress;
    if (shippingAddressId && user) {
      const address = user.addresses.id(shippingAddressId);
      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address not found'
        });
      }
      finalShippingAddress = address.toObject();
    } else if (shippingAddress) {
      finalShippingAddress = shippingAddress;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Shipping address required'
      });
    }

    // Validate and calculate order
    let subtotal = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      console.log('Looking for variant:', item.variantId, 'in product:', product.name);
      console.log('Available variants:', product.variants.map(v => ({ id: v._id.toString(), name: v.name })));

      const variant = product.variants.id(item.variantId);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Variant ${item.variantId} not found for product ${product.name}. Available variants: ${product.variants.map(v => v.name).join(', ')}`
        });
      }

      // Check inventory
      if (variant.inventory < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${product.name} - ${variant.name}`
        });
      }

      const itemSubtotal = variant.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        variantId: variant._id,
        variantName: variant.name,
        variantSku: variant.sku,
        quantity: item.quantity,
        price: variant.price,
        subtotal: itemSubtotal
      });
    }

    // Apply discount code
    let discountAmount = 0;
    let discountDoc = null;
    
    if (discountCode) {
      discountDoc = await Discount.findOne({ code: discountCode.toUpperCase() });
      
      if (!discountDoc || !discountDoc.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired discount code'
        });
      }

      discountAmount = discountDoc.calculateDiscount(subtotal);
    }

    // Apply loyalty points
    let pointsDiscount = 0;
    let pointsUsed = 0;
    
    if (pointsToUse && user) {
      const userWithPoints = await User.findById(userId);
      if (pointsToUse > userWithPoints.loyaltyPoints) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient loyalty points'
        });
      }

      pointsUsed = pointsToUse;
      pointsDiscount = pointsToUse; // 1 point = 1 VND
    }

    // Calculate taxes and shipping (simple logic)
    const taxRate = 0.10; // 10% tax
    const taxAmount = Math.round((subtotal - discountAmount - pointsDiscount) * taxRate);
    const shippingFee = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k VND

    const totalAmount = subtotal - discountAmount - pointsDiscount + taxAmount + shippingFee;

    // Calculate loyalty points earned (10% of total)
    const pointsEarned = Math.floor(totalAmount * 0.10);

    // Create order
    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress: finalShippingAddress,
      paymentMethod: paymentMethod || 'cod',
      subtotal,
      discountCode: discountDoc?.code,
      discountAmount,
      pointsUsed,
      pointsDiscount,
      taxAmount,
      shippingFee,
      totalAmount,
      pointsEarned,
      isPaid: paymentMethod === 'cod' ? false : true,
      paidAt: paymentMethod !== 'cod' ? new Date() : undefined
    });

    // Update inventory and sold count atomically
    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      const variant = product.variants.id(item.variantId);
      variant.inventory -= item.quantity;
      product.soldCount += item.quantity;
      await product.save();
    }

    // Update discount usage
    if (discountDoc) {
      discountDoc.usedCount += 1;
      discountDoc.usageHistory.push({
        user: userId,
        order: order._id
      });
      await discountDoc.save();
    }

    // Update user loyalty points
    if (user) {
      const userToUpdate = await User.findById(userId);
      userToUpdate.loyaltyPoints -= pointsUsed;
      userToUpdate.loyaltyPoints += pointsEarned;
      await userToUpdate.save();
    }

    // Clear cart
    const sessionId = req.headers['x-session-id'];
    if (userId) {
      await Cart.findOneAndDelete({ user: userId });
    } else if (sessionId) {
      await Cart.findOneAndDelete({ sessionId });
    }

    // Send confirmation email (disabled temporarily - configure SMTP in .env to enable)
    try {
      // TODO: Configure Gmail App Password or use Mailtrap/SendGrid
      // See EMAIL_SETUP_GUIDE.md for instructions
      console.log(`✉️  Order confirmation email would be sent to: ${user.email || guestData?.email}`);
      console.log(`📧 Order Number: ${order.orderNumber}`);
      
      // Uncomment below when email is configured:
      // const fullOrder = await Order.findById(order._id);
      // await sendEmail({
      //   to: user.email || guestData?.email,
      //   subject: `Order Confirmation - ${order.orderNumber}`,
      //   html: templates.orderConfirmation(fullOrder)
      // });
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
    }

    // Emit socket event
    if (req.io) {
      req.io.emit('newOrder', { order });
    }

    // Generate token for guest users
    let token;
    if (!req.user) {
      token = generateToken(userId);
    }

    res.status(201).json({
      success: true,
      order,
      token,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Calculate checkout preview (before submitting)
export const checkoutPreview = async (req, res) => {
  try {
    const { cartItems, discountCode, pointsToUse } = req.body;
    const userId = req.user?.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          subtotal += variant.price * item.quantity;
        }
      }
    }

    // Apply discount
    let discountAmount = 0;
    let discountValid = false;
    
    if (discountCode) {
      const discount = await Discount.findOne({ code: discountCode.toUpperCase() });
      if (discount && discount.isValid()) {
        discountAmount = discount.calculateDiscount(subtotal);
        discountValid = true;
      }
    }

    // Apply points
    let pointsDiscount = 0;
    let availablePoints = 0;
    
    if (userId) {
      const user = await User.findById(userId);
      availablePoints = user.loyaltyPoints;
      
      if (pointsToUse) {
        pointsDiscount = Math.min(pointsToUse, availablePoints);
      }
    }

    // Calculate totals
    const taxRate = 0.10;
    const taxAmount = Math.round((subtotal - discountAmount - pointsDiscount) * taxRate);
    const shippingFee = subtotal > 500000 ? 0 : 30000;
    const totalAmount = subtotal - discountAmount - pointsDiscount + taxAmount + shippingFee;
    const pointsEarned = Math.floor(totalAmount * 0.10);

    res.json({
      success: true,
      preview: {
        subtotal,
        discountAmount,
        discountValid,
        pointsDiscount,
        availablePoints,
        taxAmount,
        shippingFee,
        totalAmount,
        pointsEarned
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
