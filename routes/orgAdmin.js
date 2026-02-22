const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const ActivityLog = require('../models/ActivityLog');
const { 
  protect, 
  orgAdminOrHigher, 
  requireOrganizationAccess, 
  enforceOrganizationScope,
  logAdminAction 
} = require('../middleware/auth');

// @route   GET /api/org-admin/dashboard/stats
// @desc    Get Organization Admin dashboard statistics
// @access  Private/Organization Admin
router.get('/dashboard/stats', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const [
      totalUsers,
      activeUsers,
      totalLostItems,
      pendingLostItems,
      approvedLostItems,
      totalFoundItems,
      pendingFoundItems,
      verifiedFoundItems,
      totalClaims,
      pendingClaims,
      approvedClaims,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ organization: organizationId, role: 'user' }),
      User.countDocuments({ 
        organization: organizationId, 
        role: 'user',
        lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      LostItem.countDocuments({ organization: organizationId }),
      LostItem.countDocuments({ organization: organizationId, status: 'pending' }),
      LostItem.countDocuments({ organization: organizationId, status: 'approved' }),
      FoundItem.countDocuments({ organization: organizationId }),
      FoundItem.countDocuments({ organization: organizationId, status: 'pending' }),
      FoundItem.countDocuments({ organization: organizationId, status: 'verified' }),
      Claim.countDocuments({ organization: organizationId }),
      Claim.countDocuments({ organization: organizationId, status: 'pending' }),
      Claim.countDocuments({ organization: organizationId, status: 'approved' }),
      ActivityLog.find({ organization: organizationId })
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
      lostItems: {
        total: totalLostItems,
        pending: pendingLostItems,
        approved: approvedLostItems,
        approvalRate: totalLostItems > 0 ? Math.round((approvedLostItems / totalLostItems) * 100) : 0
      },
      foundItems: {
        total: totalFoundItems,
        pending: pendingFoundItems,
        verified: verifiedFoundItems,
        verificationRate: totalFoundItems > 0 ? Math.round((verifiedFoundItems / totalFoundItems) * 100) : 0
      },
      claims: {
        total: totalClaims,
        pending: pendingClaims,
        approved: approvedClaims,
        approvalRate: totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0
      },
      recentActivity
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Organization Admin dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/org-admin/users
// @desc    Get organization users
// @access  Private/Organization Admin
router.get('/users', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const organizationId = req.organizationId;

    // Build query
    let query = { 
      organization: organizationId,
      role: 'user' // Only regular users, not org admins
    };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -verificationCode -verificationCodeExpires')
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
    console.error('Get organization users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/org-admin/users/:id/status
// @desc    Update user status within organization
// @access  Private/Organization Admin
router.put('/users/:id/status', protect, orgAdminOrHigher, requireOrganizationAccess, logAdminAction('update_user_status'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const organizationId = req.organizationId;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, inactive, or banned'
      });
    }

    const user = await User.findOne({ 
      _id: id, 
      organization: organizationId,
      role: 'user' // Can only manage regular users
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in your organization'
      });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Log activity
    await ActivityLog.create({
      organization: organizationId,
      user: req.user._id,
      action: `user_${status}`,
      description: `User ${user.name} (${user.email}) status changed from ${oldStatus} to ${status}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        targetUserId: id,
        oldStatus,
        newStatus: status,
        reason
      },
      severity: status === 'banned' ? 'high' : 'medium',
      category: 'user_management'
    });

    res.json({
      success: true,
      data: user,
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/org-admin/lost-items
// @desc    Get organization lost items with approval management
// @access  Private/Organization Admin
router.get('/lost-items', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const organizationId = req.organizationId;

    // Build query
    let query = { organization: organizationId };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [lostItems, total] = await Promise.all([
      LostItem.find(query)
        .populate('reportedBy', 'name email phone')
        .populate('approvedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      LostItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: lostItems,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get lost items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/org-admin/lost-items/:id/approve
// @desc    Approve or reject lost item
// @access  Private/Organization Admin
router.put('/lost-items/:id/approve', protect, orgAdminOrHigher, requireOrganizationAccess, logAdminAction('approve_lost_item'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'
    const organizationId = req.organizationId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: approve or reject'
      });
    }

    const lostItem = await LostItem.findOne({ 
      _id: id, 
      organization: organizationId 
    }).populate('reportedBy', 'name email');

    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found in your organization'
      });
    }

    if (lostItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Item is not pending approval'
      });
    }

    lostItem.status = action === 'approve' ? 'approved' : 'rejected';
    lostItem.approvedBy = req.user._id;
    lostItem.approvedAt = new Date();
    if (action === 'reject') {
      lostItem.rejectionReason = reason;
    }

    await lostItem.save();

    // Log activity
    await ActivityLog.create({
      organization: organizationId,
      user: req.user._id,
      action: `lost_item_${action}d`,
      description: `Lost item "${lostItem.title}" ${action}d by ${req.user.name}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        lostItemId: id,
        reportedBy: lostItem.reportedBy._id,
        action,
        reason
      },
      severity: 'medium',
      category: 'content'
    });

    res.json({
      success: true,
      data: await LostItem.findById(id)
        .populate('reportedBy', 'name email phone')
        .populate('approvedBy', 'name'),
      message: `Lost item ${action}d successfully`
    });
  } catch (error) {
    console.error('Approve lost item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/org-admin/found-items
// @desc    Get organization found items with verification management
// @access  Private/Organization Admin
router.get('/found-items', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const organizationId = req.organizationId;

    // Build query
    let query = { organization: organizationId };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [foundItems, total] = await Promise.all([
      FoundItem.find(query)
        .populate('foundBy', 'name email phone')
        .populate('verifiedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      FoundItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: foundItems,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get found items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/org-admin/found-items/:id/verify
// @desc    Verify or reject found item
// @access  Private/Organization Admin
router.put('/found-items/:id/verify', protect, orgAdminOrHigher, requireOrganizationAccess, logAdminAction('verify_found_item'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, storageLocation } = req.body; // action: 'verify' or 'reject'
    const organizationId = req.organizationId;

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: verify or reject'
      });
    }

    const foundItem = await FoundItem.findOne({ 
      _id: id, 
      organization: organizationId 
    }).populate('foundBy', 'name email');

    if (!foundItem) {
      return res.status(404).json({
        success: false,
        message: 'Found item not found in your organization'
      });
    }

    if (foundItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Item is not pending verification'
      });
    }

    foundItem.status = action === 'verify' ? 'verified' : 'rejected';
    foundItem.verifiedBy = req.user._id;
    foundItem.verifiedAt = new Date();
    
    if (action === 'verify' && storageLocation) {
      foundItem.storageLocation = storageLocation;
    }
    
    if (action === 'reject') {
      foundItem.rejectionReason = reason;
    }

    await foundItem.save();

    // Log activity
    await ActivityLog.create({
      organization: organizationId,
      user: req.user._id,
      action: `found_item_${action === 'verify' ? 'verified' : 'rejected'}`,
      description: `Found item "${foundItem.title}" ${action === 'verify' ? 'verified' : 'rejected'} by ${req.user.name}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        foundItemId: id,
        foundBy: foundItem.foundBy._id,
        action,
        reason,
        storageLocation
      },
      severity: 'medium',
      category: 'content'
    });

    res.json({
      success: true,
      data: await FoundItem.findById(id)
        .populate('foundBy', 'name email phone')
        .populate('verifiedBy', 'name'),
      message: `Found item ${action === 'verify' ? 'verified' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Verify found item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/org-admin/claims
// @desc    Get organization claims for approval
// @access  Private/Organization Admin
router.get('/claims', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      claimType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const organizationId = req.organizationId;

    // Build query
    let query = { organization: organizationId };
    if (status) query.status = status;
    if (claimType) query.claimType = claimType;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('claimedBy', 'name email phone')
        .populate('reviewedBy', 'name')
        .populate('lostItem', 'title category dateLost')
        .populate('foundItem', 'title category dateFound')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Claim.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: claims,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/org-admin/claims/:id/review
// @desc    Approve or reject claim
// @access  Private/Organization Admin
router.put('/claims/:id/review', protect, orgAdminOrHigher, requireOrganizationAccess, logAdminAction('review_claim'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, meetingDetails } = req.body; // action: 'approve' or 'reject'
    const organizationId = req.organizationId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: approve or reject'
      });
    }

    const claim = await Claim.findOne({ 
      _id: id, 
      organization: organizationId 
    })
    .populate('claimedBy', 'name email')
    .populate('lostItem', 'title')
    .populate('foundItem', 'title');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found in your organization'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Claim is not pending review'
      });
    }

    claim.status = action === 'approve' ? 'approved' : 'rejected';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.reviewNotes = reason;
    
    if (action === 'approve' && meetingDetails) {
      claim.meetingDetails = meetingDetails;
    }
    
    if (action === 'reject') {
      claim.rejectionReason = reason;
    }

    await claim.save();

    // Update related item status if claim is approved
    if (action === 'approve') {
      if (claim.lostItem) {
        await LostItem.findByIdAndUpdate(claim.lostItem._id, { 
          status: 'claimed',
          resolvedBy: req.user._id,
          resolvedAt: new Date()
        });
      } else if (claim.foundItem) {
        await FoundItem.findByIdAndUpdate(claim.foundItem._id, { 
          status: 'claimed',
          returnedBy: req.user._id,
          returnedAt: new Date()
        });
      }
    }

    // Log activity
    await ActivityLog.create({
      organization: organizationId,
      user: req.user._id,
      action: `claim_${action}d`,
      description: `Claim for "${claim.lostItem?.title || claim.foundItem?.title}" ${action}d by ${req.user.name}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        claimId: id,
        claimedBy: claim.claimedBy._id,
        itemType: claim.lostItem ? 'lost' : 'found',
        itemId: claim.lostItem?._id || claim.foundItem?._id,
        action,
        reason
      },
      severity: 'medium',
      category: 'content'
    });

    res.json({
      success: true,
      data: await Claim.findById(id)
        .populate('claimedBy', 'name email phone')
        .populate('reviewedBy', 'name')
        .populate('lostItem', 'title category dateLost')
        .populate('foundItem', 'title category dateFound'),
      message: `Claim ${action}d successfully`
    });
  } catch (error) {
    console.error('Review claim error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/org-admin/reports
// @desc    Get organization reports and analytics
// @access  Private/Organization Admin
router.get('/reports', protect, orgAdminOrHigher, requireOrganizationAccess, async (req, res) => {
  try {
    const { period = '30d', type = 'overview' } = req.query;
    const organizationId = req.organizationId;

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
      userStats,
      itemStats,
      claimStats,
      activityStats,
      categoryBreakdown,
      statusBreakdown
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        { $match: { organization: organizationId, role: 'user' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $gte: ['$lastActive', startDate] },
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
          { $match: { organization: organizationId } },
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
          { $match: { organization: organizationId } },
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
        { $match: { organization: organizationId } },
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
            },
            pending: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'pending'] },
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
        { $match: { organization: organizationId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Category breakdown
      LostItem.aggregate([
        { $match: { organization: organizationId } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Status breakdown
      Promise.all([
        LostItem.aggregate([
          { $match: { organization: organizationId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        FoundItem.aggregate([
          { $match: { organization: organizationId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
      ])
    ]);

    const report = {
      period,
      organizationId,
      generatedAt: new Date(),
      users: userStats[0] || { total: 0, active: 0, newUsers: 0 },
      items: {
        lost: itemStats[0][0] || { total: 0, recent: 0, approved: 0 },
        found: itemStats[1][0] || { total: 0, recent: 0, verified: 0 }
      },
      claims: claimStats[0] || { total: 0, recent: 0, approved: 0, pending: 0 },
      activity: activityStats,
      categoryBreakdown,
      statusBreakdown: {
        lost: statusBreakdown[0],
        found: statusBreakdown[1]
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get organization reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;