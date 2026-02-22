const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const ActivityLog = require('../models/ActivityLog');
const { protect, hallAdminOnly, logAdminAction } = require('../middleware/auth');

// @route   GET /api/hall-admin/dashboard/stats
// @desc    Get Hall Admin dashboard statistics (system-wide)
// @access  Private/Hall Admin
router.get('/dashboard/stats', protect, hallAdminOnly, async (req, res) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      pendingOrganizations,
      suspendedOrganizations,
      totalUsers,
      totalOrgAdmins,
      totalPublicUsers,
      totalLostItems,
      totalFoundItems,
      totalClaims,
      recentRegistrations
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ isActive: true, verificationStatus: 'verified' }),
      Organization.countDocuments({ verificationStatus: 'pending' }),
      Organization.countDocuments({ isActive: false }),
      User.countDocuments({ role: { $ne: 'hallAdmin' } }),
      User.countDocuments({ role: 'orgAdmin' }),
      User.countDocuments({ role: 'user' }),
      LostItem.countDocuments(),
      FoundItem.countDocuments(),
      Claim.countDocuments(),
      Organization.find({ verificationStatus: 'pending' })
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const resolvedClaims = await Claim.countDocuments({ status: 'approved' });
    const resolutionRate = totalClaims > 0 ? Math.round((resolvedClaims / totalClaims) * 100) : 0;

    const stats = {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        pending: pendingOrganizations,
        suspended: suspendedOrganizations
      },
      users: {
        totalUsers,
        totalOrgAdmins,
        totalPublicUsers
      },
      items: {
        totalLostItems,
        totalFoundItems,
        totalClaims,
        resolutionRate
      },
      recentRegistrations
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Hall Admin dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hall-admin/organizations
// @desc    Get all organizations with full details (system-wide access)
// @access  Private/Hall Admin
router.get('/organizations', protect, hallAdminOnly, async (req, res) => {
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
    if (status) query.verificationStatus = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { organizationId: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .populate('adminId', 'name email status lastLogin')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Organization.countDocuments(query)
    ]);

    // Get stats for each organization
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const [totalUsers, totalLostItems, totalFoundItems, totalClaims] = await Promise.all([
          User.countDocuments({ organization: org._id, role: 'user' }),
          LostItem.countDocuments({ organization: org._id }),
          FoundItem.countDocuments({ organization: org._id }),
          Claim.countDocuments({ organization: org._id })
        ]);

        return {
          ...org.toObject(),
          stats: {
            totalUsers,
            totalLostItems,
            totalFoundItems,
            totalClaims
          }
        };
      })
    );

    res.json({
      success: true,
      data: organizationsWithStats,
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

// @route   POST /api/hall-admin/organizations
// @desc    Create new organization with Organization Admin
// @access  Private/Hall Admin
router.post('/organizations', protect, hallAdminOnly, logAdminAction('create_organization'), async (req, res) => {
  try {
    const { 
      name, 
      organizationId, 
      type, 
      sectorLevel, 
      description,
      contact, 
      adminUser,
      settings 
    } = req.body;

    // Validate required fields
    if (!name || !organizationId || !type || !sectorLevel || !contact || !adminUser) {
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

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminUser.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Admin email already exists'
      });
    }

    // Create organization first
    const organization = await Organization.create({
      name,
      organizationId,
      type,
      sectorLevel,
      description,
      contact,
      settings: settings || {},
      isActive: true,
      verificationStatus: 'verified', // Hall Admin creates pre-approved orgs
      approvalDate: new Date(),
      createdBy: req.user._id
    });

    // Create organization admin user
    const orgAdmin = await User.create({
      name: adminUser.name,
      email: adminUser.email,
      password: adminUser.password,
      phone: adminUser.phone,
      role: 'orgAdmin',
      roleLevel: 2,
      organization: organization._id,
      status: 'active',
      isVerified: true,
      permissions: User.getRolePermissions('orgAdmin')
    });

    // Update organization with admin ID
    organization.adminId = orgAdmin._id;
    await organization.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'organization_created',
      description: `Organization "${name}" created by Hall Admin ${req.user.name}`,
      metadata: {
        organizationId: organization._id,
        adminUserId: orgAdmin._id,
        organizationType: type
      },
      severity: 'high',
      category: 'system'
    });

    res.status(201).json({
      success: true,
      data: {
        organization: await Organization.findById(organization._id).populate('adminId', 'name email'),
        adminUser: {
          id: orgAdmin._id,
          name: orgAdmin.name,
          email: orgAdmin.email,
          role: orgAdmin.role
        }
      },
      message: 'Organization and admin user created successfully'
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/hall-admin/organizations/:id/status
// @desc    Update organization status (approve, suspend, reject)
// @access  Private/Hall Admin
router.put('/organizations/:id/status', protect, hallAdminOnly, logAdminAction('update_organization_status'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'suspended', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: approved, suspended, or rejected'
      });
    }

    const organization = await Organization.findById(id).populate('adminId', 'name email');
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const oldStatus = organization.verificationStatus;
    organization.verificationStatus = status === 'approved' ? 'verified' : status;
    organization.isActive = status === 'approved';
    
    if (status === 'approved') {
      organization.approvalDate = new Date();
    }

    await organization.save();

    // Update organization admin status
    if (organization.adminId) {
      await User.findByIdAndUpdate(organization.adminId._id, {
        status: status === 'approved' ? 'active' : 'inactive'
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: `organization_${status}`,
      description: `Organization "${organization.name}" ${status} by Hall Admin ${req.user.name}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        organizationId: id,
        oldStatus,
        newStatus: status,
        reason
      },
      severity: 'high',
      category: 'system'
    });

    res.json({
      success: true,
      data: await Organization.findById(id).populate('adminId', 'name email'),
      message: `Organization status updated to ${status}`
    });
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/hall-admin/organizations/:id
// @desc    Delete organization and all associated data
// @access  Private/Hall Admin
router.delete('/organizations/:id', protect, hallAdminOnly, logAdminAction('delete_organization'), async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to delete organization'
      });
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Delete all associated data
    await Promise.all([
      User.deleteMany({ organization: id }),
      LostItem.deleteMany({ organization: id }),
      FoundItem.deleteMany({ organization: id }),
      Claim.deleteMany({ organization: id }),
      ActivityLog.deleteMany({ organization: id })
    ]);

    // Delete organization
    await Organization.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'organization_deleted',
      description: `Organization "${organization.name}" and all associated data deleted by Hall Admin ${req.user.name}`,
      metadata: {
        organizationId: id,
        organizationName: organization.name
      },
      severity: 'critical',
      category: 'system'
    });

    res.json({
      success: true,
      message: 'Organization and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hall-admin/users
// @desc    Get all users across all organizations
// @access  Private/Hall Admin
router.get('/users', protect, hallAdminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      status,
      organizationId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { role: { $ne: 'hallAdmin' } }; // Exclude hall admins
    if (role) query.role = role;
    if (status) query.status = status;
    if (organizationId) query.organization = organizationId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -verificationCode -verificationCodeExpires')
        .populate('organization', 'name organizationId type')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/hall-admin/users/:id/role
// @desc    Update user role (assign/remove organization admin)
// @access  Private/Hall Admin
router.put('/users/:id/role', protect, hallAdminOnly, logAdminAction('update_user_role'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, organizationId } = req.body;

    if (!['user', 'orgAdmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: user or orgAdmin'
      });
    }

    const user = await User.findById(id).populate('organization', 'name');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'hallAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify Hall Admin role'
      });
    }

    const oldRole = user.role;
    user.role = role;
    user.roleLevel = role === 'orgAdmin' ? 2 : 1;
    user.permissions = User.getRolePermissions(role);

    // If assigning to different organization
    if (organizationId && organizationId !== user.organization?._id.toString()) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }
      user.organization = organizationId;
    }

    await user.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'user_role_updated',
      description: `User ${user.name} (${user.email}) role changed from ${oldRole} to ${role} by Hall Admin ${req.user.name}`,
      metadata: {
        targetUserId: id,
        oldRole,
        newRole: role,
        organizationId: user.organization
      },
      severity: 'high',
      category: 'user_management'
    });

    res.json({
      success: true,
      data: await User.findById(id)
        .select('-password -verificationCode -verificationCodeExpires')
        .populate('organization', 'name organizationId type'),
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hall-admin/system/reports
// @desc    Get system-wide reports and analytics
// @access  Private/Hall Admin
router.get('/system/reports', protect, hallAdminOnly, async (req, res) => {
  try {
    const { period = '30d', type = 'overview' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      organizationStats,
      userStats,
      itemStats,
      claimStats,
      activityStats,
      organizationBreakdown
    ] = await Promise.all([
      // Organization statistics
      Organization.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $eq: ['$verificationStatus', 'verified'] }] },
                  1,
                  0
                ]
              }
            },
            pending: {
              $sum: {
                $cond: [
                  { $eq: ['$verificationStatus', 'pending'] },
                  1,
                  0
                ]
              }
            },
            newOrganizations: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', startDate] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // User statistics
      User.aggregate([
        { $match: { role: { $ne: 'hallAdmin' } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            orgAdmins: {
              $sum: {
                $cond: [
                  { $eq: ['$role', 'orgAdmin'] },
                  1,
                  0
                ]
              }
            },
            users: {
              $sum: {
                $cond: [
                  { $eq: ['$role', 'user'] },
                  1,
                  0
                ]
              }
            },
            newUsers: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', startDate] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Item statistics
      Promise.all([
        LostItem.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              recent: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startDate] },
                    1,
                    0
                  ]
                }
              },
              approved: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'approved'] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        FoundItem.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              recent: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startDate] },
                    1,
                    0
                  ]
                }
              },
              verified: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'verified'] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ])
      ]),

      // Claim statistics
      Claim.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            recent: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', startDate] },
                  1,
                  0
                ]
              }
            },
            approved: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'approved'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Activity statistics
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Organization breakdown by type
      Organization.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const report = {
      period,
      generatedAt: new Date(),
      organizations: organizationStats[0] || { total: 0, active: 0, pending: 0, newOrganizations: 0 },
      users: userStats[0] || { total: 0, orgAdmins: 0, users: 0, newUsers: 0 },
      items: {
        lost: itemStats[0][0] || { total: 0, recent: 0, approved: 0 },
        found: itemStats[1][0] || { total: 0, recent: 0, verified: 0 }
      },
      claims: claimStats[0] || { total: 0, recent: 0, approved: 0 },
      activity: activityStats,
      organizationBreakdown
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get system reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;