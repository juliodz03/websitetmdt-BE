import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Get cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    let cart;
    if (userId) {
      cart = await Cart.findOne({ user: userId }).populate('items.product');
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId }).populate('items.product');
    }

    if (!cart) {
      return res.json({
        success: true,
        cart: { items: [], totalAmount: 0 }
      });
    }

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add to cart / Update cart
export const updateCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    // Get product and variant
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Check inventory
    if (variant.inventory < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient inventory'
      });
    }

    // Find or create cart
    let cart;
    if (userId) {
      cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId });
      if (!cart) {
        cart = new Cart({ sessionId, items: [] });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Session ID required for guest cart'
      });
    }

    // Check if item exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.variantId.toString() === variantId
    );

    if (existingItemIndex > -1) {
      if (quantity === 0) {
        // Remove item
        cart.items.splice(existingItemIndex, 1);
      } else {
        // Update quantity
        cart.items[existingItemIndex].quantity = quantity;
        cart.items[existingItemIndex].price = variant.price;
      }
    } else if (quantity > 0) {
      // Add new item
      cart.items.push({
        product: productId,
        variantId: variantId,
        quantity,
        price: variant.price
      });
    }

    // Calculate total
    cart.calculateTotal();
    await cart.save();

    // Populate and return
    await cart.populate('items.product');

    // Emit socket event
    if (req.io) {
      const room = userId || sessionId;
      req.io.to(room).emit('cartUpdated', { cart });
    }

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    let cart;
    if (userId) {
      cart = await Cart.findOne({ user: userId });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId });
    }

    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Merge guest cart to user cart after login
export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return res.json({
        success: true,
        message: 'No guest cart to merge'
      });
    }

    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      // Transfer guest cart to user
      guestCart.user = userId;
      guestCart.sessionId = undefined;
      await guestCart.save();
      userCart = guestCart;
    } else {
      // Merge items
      for (const guestItem of guestCart.items) {
        const existingIndex = userCart.items.findIndex(
          item => item.product.toString() === guestItem.product.toString() &&
                  item.variantId.toString() === guestItem.variantId.toString()
        );

        if (existingIndex > -1) {
          userCart.items[existingIndex].quantity += guestItem.quantity;
        } else {
          userCart.items.push(guestItem);
        }
      }

      userCart.calculateTotal();
      await userCart.save();

      // Delete guest cart
      await Cart.deleteOne({ _id: guestCart._id });
    }

    await userCart.populate('items.product');

    res.json({
      success: true,
      cart: userCart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
