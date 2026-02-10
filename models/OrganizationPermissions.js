const mongoose = require('mongoose');

const organizationPermissionsSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  // Core permissions
  canPostLostItems: {
    type: Boolean,
    default: true
  },
  canPostFoundItems: {
    type: Boolean,
    default: true
  },
  canVerifyFoundItems: {
    type: Boolean,
    default: false // Requires admin approval
  },
  canManageClaims: {
    type: Boolean,
    default: true
  },
  canExportData: {
    type: Boolean,
    default: false
  },
  canAccessReports: {
    type: Boolean,
    default: false
  },
  canCustomizeBranding: {
    type: Boolean,
    default: false
  },
  canUseAPI: {
    type: Boolean,
    default: false
  },
  // Limits
  maxUsers: {
    type: Number,
    default: 10
  },
  maxItems: {
    type: Number,
    default: 100
  },
  maxStorageGB: {
    type: Number,
    default: 1
  },
  // Feature flags
  features: {
    advancedSearch: { type: Boolean, default: false },
    bulkOperations: { type: Boolean, default: false },
    customFields: { type: Boolean, default: false },
    integrations: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false }
  },
  // Restrictions
  restrictions: {
    ipWhitelist: [String],
    allowedDomains: [String],
    requireApproval: { type: Boolean, default: true },
    autoArchiveDays: { type: Number, default: 30 }
  },
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
organizationPermissionsSchema.index({ organization: 1 });

// Methods
organizationPermissionsSchema.methods.hasPermission = function(permission) {
  return this[permission] === true;
};

organizationPermissionsSchema.methods.hasFeature = function(feature) {
  return this.features[feature] === true;
};

organizationPermissionsSchema.methods.isWithinLimit = function(type, currentCount) {
  const limitField = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;
  return currentCount < this[limitField];
};

// Static methods
organizationPermissionsSchema.statics.getDefaultPermissions = function(subscriptionPlan = 'free') {
  const defaults = {
    free: {
      canPostLostItems: true,
      canPostFoundItems: true,
      canVerifyFoundItems: false,
      canManageClaims: true,
      canExportData: false,
      canAccessReports: false,
      canCustomizeBranding: false,
      canUseAPI: false,
      maxUsers: 10,
      maxItems: 100,
      maxStorageGB: 1,
      features: {
        advancedSearch: false,
        bulkOperations: false,
        customFields: false,
        integrations: false,
        prioritySupport: false,
        whiteLabel: false
      }
    },
    basic: {
      canPostLostItems: true,
      canPostFoundItems: true,
      canVerifyFoundItems: true,
      canManageClaims: true,
      canExportData: true,
      canAccessReports: true,
      canCustomizeBranding: true,
      canUseAPI: false,
      maxUsers: 50,
      maxItems: 500,
      maxStorageGB: 5,
      features: {
        advancedSearch: true,
        bulkOperations: false,
        customFields: false,
        integrations: false,
        prioritySupport: false,
        whiteLabel: false
      }
    },
    premium: {
      canPostLostItems: true,
      canPostFoundItems: true,
      canVerifyFoundItems: true,
      canManageClaims: true,
      canExportData: true,
      canAccessReports: true,
      canCustomizeBranding: true,
      canUseAPI: true,
      maxUsers: 200,
      maxItems: 2000,
      maxStorageGB: 20,
      features: {
        advancedSearch: true,
        bulkOperations: true,
        customFields: true,
        integrations: true,
        prioritySupport: false,
        whiteLabel: false
      }
    },
    enterprise: {
      canPostLostItems: true,
      canPostFoundItems: true,
      canVerifyFoundItems: true,
      canManageClaims: true,
      canExportData: true,
      canAccessReports: true,
      canCustomizeBranding: true,
      canUseAPI: true,
      maxUsers: -1, // Unlimited
      maxItems: -1, // Unlimited
      maxStorageGB: -1, // Unlimited
      features: {
        advancedSearch: true,
        bulkOperations: true,
        customFields: true,
        integrations: true,
        prioritySupport: true,
        whiteLabel: true
      }
    }
  };
  
  return defaults[subscriptionPlan] || defaults.free;
};

module.exports = mongoose.model('OrganizationPermissions', organizationPermissionsSchema);