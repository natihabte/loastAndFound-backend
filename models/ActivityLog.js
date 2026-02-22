const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // Multi-tenant field
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: function() {
      // Make organization optional for user registration and authentication activities
      const optionalOrgActions = [
        'super_admin_action',
        'user_registered',
        'user_verified',
        'user_action',
        'password_reset_requested',
        'password_reset_completed',
        'platform_settings_changed',
        'profile_updated',
        'password_changed'
      ];
      return !optionalOrgActions.includes(this.action);
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'user_registered',
      'user_verified',
      'user_login',
      'user_logout',
      'user_invited',
      'user_accepted_invitation',
      'user_action',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      'profile_updated',
      'two_factor_enabled',
      'two_factor_disabled',
      
      // Item actions
      'item_created',
      'item_updated',
      'item_deleted',
      'item_claimed',
      'item_resolved',
      'item_archived',
      'item_approved',
      'item_rejected',
      
      // Organization actions
      'organization_created',
      'organization_updated',
      'organization_settings_changed',
      'subscription_changed',
      'subscription_cancelled',
      'subscription_renewed',
      
      // Admin actions
      'admin_login',
      'admin_action',
      'user_role_changed',
      'user_permissions_changed',
      'user_status_changed',
      'bulk_action_performed',
      
      // Super admin actions
      'super_admin_action',
      'organization_approved',
      'organization_suspended',
      'platform_settings_changed'
    ]
  },
  description: {
    type: String,
    required: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Related entities
  relatedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  // Metadata and context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  category: {
    type: String,
    enum: ['security', 'user_management', 'content', 'system', 'billing', 'registration'],
    default: 'system'
  },
  // Request information
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestId: String,
  sessionId: String,
  // Additional tracking
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'system', 'admin'],
    default: 'web'
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for multi-tenant queries and performance
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, user: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });
activityLogSchema.index({ relatedItem: 1 });
activityLogSchema.index({ relatedUser: 1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(userId, action, description, metadata = {}, req = null, options = {}) {
  try {
    const logData = {
      user: userId,
      action,
      description,
      metadata,
      severity: options.severity || 'low',
      category: options.category || 'system',
      source: options.source || 'web'
    };

    // Add organization context
    if (options.organization) {
      logData.organization = options.organization;
    }

    // Add related entities
    if (options.relatedItem) logData.relatedItem = options.relatedItem;
    if (options.relatedUser) logData.relatedUser = options.relatedUser;
    if (options.relatedOrganization) logData.relatedOrganization = options.relatedOrganization;

    // Add request context
    if (req) {
      logData.ipAddress = req.ip || req.connection.remoteAddress;
      logData.userAgent = req.get('User-Agent');
      logData.requestId = req.id;
      logData.sessionId = req.sessionID;
    }

    // Add tags
    if (options.tags) logData.tags = options.tags;

    const log = new this(logData);
    await log.save();
    
    console.log(`📊 Activity logged: ${action} for user ${userId} in org ${options.organization || 'N/A'}`);
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Static method to get organization activities
activityLogSchema.statics.getOrganizationActivities = async function(organizationId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action,
    severity,
    category,
    startDate,
    endDate,
    userId
  } = options;

  const query = { organization: organizationId };
  
  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (category) query.category = category;
  if (userId) query.user = userId;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email role')
    .populate('relatedUser', 'name email')
    .populate('relatedItem', 'title type status');
};

// Static method to get user activities within organization
activityLogSchema.statics.getUserActivities = async function(userId, organizationId, limit = 50) {
  const query = { user: userId };
  if (organizationId) query.organization = organizationId;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email')
    .populate('relatedItem', 'title type status');
};

// Static method for super admin to get all activities
activityLogSchema.statics.getAllActivities = async function(options = {}) {
  const {
    limit = 100,
    skip = 0,
    action,
    severity,
    organizationId,
    startDate,
    endDate
  } = options;

  const query = {};
  
  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (organizationId) query.organization = organizationId;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email role')
    .populate('organization', 'name slug')
    .populate('relatedUser', 'name email')
    .populate('relatedItem', 'title type status');
};

// Static method to get activity statistics
activityLogSchema.statics.getActivityStats = async function(organizationId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const query = organizationId ? { organization: organizationId } : {};
  query.createdAt = { $gte: startDate };

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          action: '$action',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        totalCount: { $sum: '$count' },
        dailyStats: {
          $push: {
            date: '$_id.date',
            count: '$count'
          }
        }
      }
    },
    { $sort: { totalCount: -1 } }
  ]);

  return stats;
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);