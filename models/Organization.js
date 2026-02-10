const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  organizationId: {
    type: String,
    required: [true, 'Organization ID is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Organization ID cannot exceed 50 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  type: {
    type: String,
    required: true,
    enum: ['university', 'government', 'hospital', 'municipality', 'transport', 'other'],
    default: 'university'
  },
  sectorLevel: {
    type: String,
    required: [true, 'Sector level is required'],
    enum: ['federal', 'regional', 'city', 'local']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  logo: {
    type: String, // URL to logo image
  },
  website: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  // Organization Admin Assignment
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contact: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function(v) {
          return /^(\+251|0)?[0-9]{9}$/.test(v.replace(/[\s-]/g, ''));
        },
        message: 'Please enter a valid Ethiopian phone number'
      }
    },
    address: {
      street: String,
      city: String,
      region: String,
      country: {
        type: String,
        default: 'Ethiopia'
      },
      postalCode: String
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'Africa/Addis_Ababa'
    },
    language: {
      type: String,
      enum: ['en', 'am', 'om', 'ti'],
      default: 'en'
    },
    allowPublicSearch: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    autoArchiveDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    maxUsers: {
      type: Number,
      default: 10 // Free plan limit
    },
    maxItems: {
      type: Number,
      default: 100 // Free plan limit
    },
    features: {
      customBranding: { type: Boolean, default: false },
      advancedReports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      multiLanguage: { type: Boolean, default: true }
    }
  },
  stats: {
    totalUsers: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    totalClaims: { type: Number, default: 0 },
    lastActivity: Date
  },
  isActive: {
    type: Boolean,
    default: false // Requires verification and approval
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (slug index is automatically created by unique: true)
organizationSchema.index({ type: 1 });
organizationSchema.index({ 'subscription.plan': 1 });
organizationSchema.index({ 'subscription.status': 1 });
organizationSchema.index({ isActive: 1 });

// Virtual for full address
organizationSchema.virtual('fullAddress').get(function() {
  const addr = this.contact.address;
  if (!addr) return '';
  return [addr.street, addr.city, addr.state, addr.country, addr.zipCode]
    .filter(Boolean)
    .join(', ');
});

// Pre-save middleware to generate slug
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Static method to check subscription limits
organizationSchema.statics.checkLimits = async function(organizationId, type) {
  const org = await this.findById(organizationId);
  if (!org) throw new Error('Organization not found');
  
  const limits = {
    free: { users: 10, items: 100 },
    basic: { users: 50, items: 500 },
    premium: { users: 200, items: 2000 },
    enterprise: { users: -1, items: -1 } // Unlimited
  };
  
  const planLimits = limits[org.subscription.plan];
  const currentCount = type === 'users' ? org.stats.totalUsers : org.stats.totalItems;
  const limit = type === 'users' ? planLimits.users : planLimits.items;
  
  return limit === -1 || currentCount < limit;
};

module.exports = mongoose.model('Organization', organizationSchema);