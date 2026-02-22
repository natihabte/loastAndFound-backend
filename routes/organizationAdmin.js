const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

// Middleware to check if user is super admin or hall admin
const canManageOrgAdmins = (req, res, next) => {
  if (req.user.role === 'hallAdmin' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    message: 'Only super admins and hall admins can manage organization admins' 
  });
};

// @route   POST /api/organization-admin/create
// @desc    Create a new organization admin
// @access  Private/Hall Admin or Super Admin
router.post('/create', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      organizationId,
      department,
      position
    } = req.body;

    // Validation
    if (!name || !email || !password || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and organization are required'
      });
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create organization admin user
    const orgAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      organization: organizationId,
      role: 'orgAdmin',
      roleLevel: 2,
      permissions: User.getRolePermissions('orgAdmin'),
      department: department || '',
      position: position || 'Organization Administrator',
      status: 'active',
      isVerified: true, // Auto-verify admin accounts
      invitedBy: req.user._id,
      invitedAt: Date.now(),
      acceptedAt: Date.now()
    });

    // Update organization admin reference if not set
    if (!organization.adminId) {
      organization.adminId = orgAdmin._id;
      await organization.save();
    }

    // Update organization stats
    organization.stats.totalUsers += 1;
    organization.stats.lastActivity = Date.now();
    await organization.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user._id,
      'org_admin_created',
      `Organization admin created: ${orgAdmin.name} for ${organization.name}`,
      {
        adminId: orgAdmin._id,
        adminEmail: orgAdmin.email,
        organizationId: organization._id,
        organizationName: organization.name
      },
      req,
      {
        organization: organizationId,
        category: 'user_management',
        severity: 'high'
      }
    );

    // Try to send welcome email
    try {
      await sendWelcomeEmail(orgAdmin.email, orgAdmin.name, organization.name);
      console.log(`📧 Welcome email sent to ${orgAdmin.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    console.log(`✅ Organization admin created: ${orgAdmin.email} for ${organization.name}`);

    // Return admin data without password
    const adminData = orgAdmin.toObject();
    delete adminData.password;

    res.status(201).json({
      success: true,
      message: 'Organization admin created successfully',
      data: adminData
    });
  } catch (error) {
    console.error('Create organization admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/organization-admin/list
// @desc    Get all organization admins
// @access  Private/Hall Admin or Super Admin
router.get('/list', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const { organizationId, status, page = 1, limit = 20 } = req.query;

    const query = { role: 'orgAdmin' };
    
    if (organizationId) {
      query.organization = organizationId;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const admins = await User.find(query)
      .select('-password -verificationCode -twoFactorSecret')
      .populate('organization', 'name slug type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: admins.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: admins
    });
  } catch (error) {
    console.error('List organization admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/organization-admin/:id
// @desc    Get organization admin by ID
// @access  Private/Hall Admin or Super Admin
router.get('/:id', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const admin = await User.findOne({
      _id: req.params.id,
      role: 'orgAdmin'
    })
      .select('-password -verificationCode -twoFactorSecret')
      .populate('organization', 'name slug type contact settings');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Organization admin not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get organization admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/organization-admin/:id
// @desc    Update organization admin
// @access  Private/Hall Admin or Super Admin
router.put('/:id', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const { name, email, phone, department, position, status } = req.body;

    const admin = await User.findOne({
      _id: req.params.id,
      role: 'orgAdmin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Organization admin not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== admin._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update fields
    if (name) admin.name = name.trim();
    if (email) admin.email = email.toLowerCase().trim();
    if (phone !== undefined) admin.phone = phone;
    if (department !== undefined) admin.department = department;
    if (position !== undefined) admin.position = position;
    if (status) admin.status = status;

    await admin.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user._id,
      'org_admin_updated',
      `Organization admin updated: ${admin.name}`,
      {
        adminId: admin._id,
        changes: { name, email, phone, department, position, status }
      },
      req,
      {
        organization: admin.organization,
        category: 'user_management',
        severity: 'medium'
      }
    );

    console.log(`✅ Organization admin updated: ${admin.email}`);

    const adminData = admin.toObject();
    delete adminData.password;

    res.json({
      success: true,
      message: 'Organization admin updated successfully',
      data: adminData
    });
  } catch (error) {
    console.error('Update organization admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/organization-admin/:id
// @desc    Delete organization admin
// @access  Private/Hall Admin or Super Admin
router.delete('/:id', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const admin = await User.findOne({
      _id: req.params.id,
      role: 'orgAdmin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Organization admin not found'
      });
    }

    const organizationId = admin.organization;
    const adminName = admin.name;
    const adminEmail = admin.email;

    // Check if this is the only admin for the organization
    const organization = await Organization.findById(organizationId);
    if (organization && organization.adminId.toString() === admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the primary admin of an organization. Assign a new admin first.'
      });
    }

    await admin.deleteOne();

    // Update organization stats
    if (organization) {
      organization.stats.totalUsers = Math.max(0, organization.stats.totalUsers - 1);
      await organization.save();
    }

    // Log activity
    await ActivityLog.logActivity(
      req.user._id,
      'org_admin_deleted',
      `Organization admin deleted: ${adminName}`,
      {
        adminId: admin._id,
        adminEmail,
        organizationId
      },
      req,
      {
        organization: organizationId,
        category: 'user_management',
        severity: 'high'
      }
    );

    console.log(`✅ Organization admin deleted: ${adminEmail}`);

    res.json({
      success: true,
      message: 'Organization admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/organization-admin/:id/reset-password
// @desc    Reset organization admin password
// @access  Private/Hall Admin or Super Admin
router.post('/:id/reset-password', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const admin = await User.findOne({
      _id: req.params.id,
      role: 'orgAdmin'
    }).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Organization admin not found'
      });
    }

    admin.password = newPassword;
    await admin.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user._id,
      'org_admin_password_reset',
      `Password reset for organization admin: ${admin.name}`,
      {
        adminId: admin._id,
        adminEmail: admin.email
      },
      req,
      {
        organization: admin.organization,
        category: 'security',
        severity: 'high'
      }
    );

    console.log(`✅ Password reset for organization admin: ${admin.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/organization-admin/:id/toggle-status
// @desc    Activate/deactivate organization admin
// @access  Private/Hall Admin or Super Admin
router.post('/:id/toggle-status', protect, canManageOrgAdmins, async (req, res) => {
  try {
    const admin = await User.findOne({
      _id: req.params.id,
      role: 'orgAdmin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Organization admin not found'
      });
    }

    // Toggle status
    admin.status = admin.status === 'active' ? 'inactive' : 'active';
    await admin.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user._id,
      'org_admin_status_changed',
      `Organization admin status changed to ${admin.status}: ${admin.name}`,
      {
        adminId: admin._id,
        adminEmail: admin.email,
        newStatus: admin.status
      },
      req,
      {
        organization: admin.organization,
        category: 'user_management',
        severity: 'medium'
      }
    );

    console.log(`✅ Organization admin status changed to ${admin.status}: ${admin.email}`);

    const adminData = admin.toObject();
    delete adminData.password;

    res.json({
      success: true,
      message: `Organization admin ${admin.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: adminData
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
