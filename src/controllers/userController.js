import User from '../models/User.js';

// Add address
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const newAddress = req.body;
    
    // If this is the first address or isDefault is true, set as default
    if (user.addresses.length === 0 || newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
      newAddress.isDefault = true;
    }
    
    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update address fields
    Object.assign(address, req.body);

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.id) {
          addr.isDefault = false;
        }
      });
    }

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = address.isDefault;
    address.remove();

    // If deleted address was default, set first remaining as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
