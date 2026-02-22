const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/me
// @desc    Update user profile
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Log profile update activity
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.logActivity(
      user._id,
      'profile_updated',
      `Profile updated for user: ${user.email}`,
      {
        email: user.email,
        changes: updateData,
        previousEmail: req.user.email
      },
      req
    );

    console.log(`👤 Profile updated for user: ${user.email}`);

    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/me/items
// @desc    Get current user's items
// @access  Private
router.get('/me/items', protect, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin (superAdmin, admin)
router.get('/', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    // If admin (org admin), only return users from their organization
    let query = {};
    if (req.user.role === 'admin' && req.user.organization) {
      query.organization = req.user.organization._id;
    }
    
    const users = await User.find(query).select('-password').populate('organization', 'name organizationId');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin (superAdmin, admin)
router.delete('/:id', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If admin (org admin), only allow deleting users from their organization
    if (req.user.role === 'admin') {
      if (!req.user.organization || !user.organization || 
          user.organization.toString() !== req.user.organization._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only delete users from your organization' 
        });
      }
      
      // Org admins cannot delete superAdmins
      if (user.role === 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Cannot delete superAdmin users.'
        });
      }
    }

    // Delete user's items
    await Item.deleteMany({ owner: req.params.id });
    
    await user.deleteOne();

    res.json({ success: true, message: 'User and their items deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin (superAdmin, admin)
router.put('/:id', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If admin (org admin), only allow updating users from their organization
    if (req.user.role === 'admin') {
      if (!req.user.organization || !user.organization || 
          user.organization.toString() !== req.user.organization._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update users from your organization' 
        });
      }
      
      // Org admins cannot change user roles to superAdmin
      if (req.body.role === 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Cannot assign superAdmin role.'
        });
      }
    }

    const { name, email, phone, role, status } = req.body;
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create user (Admin only)
// @access  Private/Admin (superAdmin, admin)
router.post('/', protect, authorize('admin', 'superAdmin'), async (req, res) => {
  try {
    const { name, email, password, phone, role, organization } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // If admin (org admin), set organization to their organization
    let userOrganization = organization;
    if (req.user.role === 'admin') {
      userOrganization = req.user.organization._id;
      
      // Org admins cannot create superAdmin users
      if (role === 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Cannot create superAdmin users.'
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user',
      organization: userOrganization,
      status: 'active',
      isVerified: true
    });

    // Return user without password
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({ 
      success: true, 
      data: userData, 
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
