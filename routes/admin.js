const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationPermissions = require('../models/OrganizationPermissions');
const ActivityLog = require('../models/ActivityLog');
const Item = require('../models/Item');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/activities
// @desc    Get recent user activities (Admin only)
// @access  Private/Admin
router.get('/activities', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50, action, userId } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    
    const activities = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name email role status');
    
    res.json({ 
      success: true, 
      count: activities.length,
      data: activities 
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/organizations
// @desc    Get all organizations with admin controls (Super Admin only)
// @access  Private/Super Admin
router.get('/organizations', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { organizationId: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('subscription.plan'),
      Organization.countDocuments(query)
    ]);

    // Get permissions for each organization
    const orgIds = organizations.map(org => org._id);
    const permissions = await OrganizationPermissions.find({
      organization: { $in: orgIds }
    });

    const permissionsMap = permissions.reduce((acc, perm) => {
      acc[perm.organization.toString()] = perm;
      return acc;
    }, {});

    // Combine data
    const enrichedOrganizations = organizations.map(org => ({
      ...org.toObject(),
      permissions: permissionsMap[org._id.toString()] || null
    }));

    res.json({
      success: true,
      data: enrichedOrganizations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/organizations
// @desc    Create organization (Super Admin only)
// @access  Private/Super Admin
router.post('/organizations', protect, authorize('super_admin'), async (req, res) => {
  try {
    const {
      name,
      organizationId,
      type,
      sectorLevel,
      contact,
      adminUser,
      subscriptionPlan = 'free'
    } = req.body;

    // Validation
    if (!name || !organizationId || !type || !sectorLevel || !contact?.email || !adminUser) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if organization ID already exists
    const existingOrg = await Organization.findOne({ organizationId });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID already exists'
      });
    }

    // Create organization
    const organization = await Organization.create({
      name,
      organizationId,
      slug: organizationId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      type,
      sectorLevel,
      contact,
      status: 'active', // Admin-created orgs are immediately active
      verifiedAt: new Date(),
      createdBy: req.user._id,
      subscription: {
        plan: subscriptionPlan,
        status: 'active',
        startDate: new Date(),
        features: {}
      }
    });

    // Create organization permissions
    const permissions = await OrganizationPermissions.create({
      organization: organization._id,
      ...OrganizationPermissions.getDefaultPermissions(subscriptionPlan),
      createdBy: req.user._id
    });

    // Create admin user for organization
    const adminUserData = await User.create({
      name: adminUser.name,
      email: adminUser.email,
      password: adminUser.password,
      role: 'org_admin',
      roleLevel: 3,
      organization: organization._id,
      isVerified: true,
      verifiedAt: new Date(),
      permissions: ['manage_organization', 'manage_users', 'manage_items', 'view_reports']
    });

    // Log activity
    await ActivityLog.create({
      organization: organization._id,
      user: req.user._id,
      action: 'organization_created',
      description: `Organization "${name}" created by super admin`,
      metadata: {
        organizationId: organization._id,
        adminUserId: adminUserData._id,
        subscriptionPlan
      },
      severity: 'medium',
      category: 'organization'
    });

    res.status(201).json({
      success: true,
      data: {
        organization,
        permissions,
        adminUser: {
          id: adminUserData._id,
          name: adminUserData.name,
          email: adminUserData.email,
          role: adminUserData.role
        }
      }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/organizations/:id
// @desc    Update organization (Super Admin only)
// @access  Private/Super Admin
router.put('/organizations/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find organization
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update organization
    const updatedOrg = await Organization.findByIdAndUpdate(
      id,
      { ...updates, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    // Update permissions if provided
    if (updates.permissions) {
      await OrganizationPermissions.findOneAndUpdate(
        { organization: id },
        { ...updates.permissions, updatedBy: req.user._id },
        { new: true, upsert: true }
      );
    }

    // Log activity
    await ActivityLog.create({
      organization: id,
      user: req.user._id,
      action: 'organization_updated',
      description: `Organization "${organization.name}" updated by super admin`,
      metadata: {
        organizationId: id,
        updates: Object.keys(updates)
      },
      severity: 'medium',
      category: 'organization'
    });

    res.json({
      success: true,
      data: updatedOrg
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/organizations/:id/status
// @desc    Update organization status (Super Admin only)
// @access  Private/Super Admin
router.put('/organizations/:id/status', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['pending', 'active', 'suspended', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const oldStatus = organization.status;
    
    // Update status
    organization.status = status;
    organization.updatedBy = req.user._id;
    
    if (status === 'active' && oldStatus === 'pending') {
      organization.verifiedAt = new Date();
    }
    
    if (status === 'suspended' || status === 'rejected') {
      organization.suspendedAt = new Date();
      organization.suspensionReason = reason;
    }

    await organization.save();

    // Log activity
    await ActivityLog.create({
      organization: id,
      user: req.user._id,
      action: `organization_${status}`,
      description: `Organization "${organization.name}" status changed from ${oldStatus} to ${status}`,
      metadata: {
        organizationId: id,
        oldStatus,
        newStatus: status,
        reason
      },
      severity: status === 'suspended' ? 'high' : 'medium',
      category: 'organization'
    });

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/organizations/:id/permissions
// @desc    Update organization permissions (Super Admin only)
// @access  Private/Super Admin
router.put('/organizations/:id/permissions', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const permissionUpdates = req.body;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update or create permissions
    const permissions = await OrganizationPermissions.findOneAndUpdate(
      { organization: id },
      { 
        ...permissionUpdates, 
        updatedBy: req.user._id,
        lastModified: new Date()
      },
      { new: true, upsert: true }
    );

    // Log activity
    await ActivityLog.create({
      organization: id,
      user: req.user._id,
      action: 'organization_permissions_updated',
      description: `Permissions updated for organization "${organization.name}"`,
      metadata: {
        organizationId: id,
        updatedPermissions: Object.keys(permissionUpdates)
      },
      severity: 'medium',
      category: 'organization'
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Update organization permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/organizations/:id
// @desc    Delete organization (Super Admin only)
// @access  Private/Super Admin
router.delete('/organizations/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { transferData, confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'Delete confirmation required'
      });
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check for existing data
    const [userCount, itemCount] = await Promise.all([
      User.countDocuments({ organization: id }),
      Item.countDocuments({ organization: id })
    ]);

    if ((userCount > 0 || itemCount > 0) && !transferData) {
      return res.status(400).json({
        success: false,
        message: 'Organization has existing data. Please specify transfer options.',
        data: { userCount, itemCount }
      });
    }

    // If transferring data, handle it here
    if (transferData && transferData.targetOrganizationId) {
      // Transfer users and items to target organization
      await Promise.all([
        User.updateMany(
          { organization: id },
          { organization: transferData.targetOrganizationId }
        ),
        Item.updateMany(
          { organization: id },
          { organization: transferData.targetOrganizationId }
        )
      ]);
    } else {
      // Delete all related data
      await Promise.all([
        User.deleteMany({ organization: id }),
        Item.deleteMany({ organization: id }),
        ActivityLog.deleteMany({ organization: id }),
        OrganizationPermissions.deleteOne({ organization: id })
      ]);
    }

    // Delete organization
    await Organization.findByIdAndDelete(id);

    // Log activity (without organization reference since it's deleted)
    await ActivityLog.create({
      user: req.user._id,
      action: 'organization_deleted',
      description: `Organization "${organization.name}" deleted by super admin`,
      metadata: {
        organizationId: id,
        organizationName: organization.name,
        dataTransferred: !!transferData,
        targetOrganization: transferData?.targetOrganizationId
      },
      severity: 'high',
      category: 'organization'
    });

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/organizations/:id/stats
// @desc    Get organization statistics (Super Admin only)
// @access  Private/Super Admin
router.get('/organizations/:id/stats', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get statistics
    const [
      totalUsers,
      activeUsers,
      totalItems,
      lostItems,
      foundItems,
      claimedItems,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ organization: id }),
      User.countDocuments({ 
        organization: id, 
        lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      Item.countDocuments({ organization: id }),
      Item.countDocuments({ organization: id, type: 'lost', status: 'active' }),
      Item.countDocuments({ organization: id, type: 'found', status: 'active' }),
      Item.countDocuments({ organization: id, status: 'claimed' }),
      ActivityLog.find({ organization: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email')
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      items: {
        total: totalItems,
        lost: lostItems,
        found: foundItems,
        claimed: claimedItems,
        resolutionRate: totalItems > 0 ? Math.round((claimedItems / totalItems) * 100) : 0
      },
      activity: recentActivity
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get admin dashboard statistics (Super Admin only)
// @access  Private/Super Admin
router.get('/dashboard/stats', protect, authorize('super_admin'), async (req, res) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      pendingOrganizations,
      suspendedOrganizations,
      totalUsers,
      totalItems,
      recentRegistrations
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'pending' }),
      Organization.countDocuments({ status: 'suspended' }),
      User.countDocuments(),
      Item.countDocuments(),
      Organization.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name organizationId type createdAt contact.email')
    ]);

    const stats = {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        pending: pendingOrganizations,
        suspended: suspendedOrganizations
      },
      platform: {
        totalUsers,
        totalItems,
        averageUsersPerOrg: activeOrganizations > 0 ? Math.round(totalUsers / activeOrganizations) : 0,
        averageItemsPerOrg: activeOrganizations > 0 ? Math.round(totalItems / activeOrganizations) : 0
      },
      recentRegistrations
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;