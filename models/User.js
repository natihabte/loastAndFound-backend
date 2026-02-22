const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  // Multi-tenant fields
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: function() {
      // Don't require organization for hallAdmin or during initial registration
      // Users can be assigned to organizations later
      return false;
    }
  },
  role: {
    type: String,
    enum: ['superAdmin', 'admin', 'user'],
    default: 'user'
  },
  // Enhanced role hierarchy for two-level admin system
  roleLevel: {
    type: Number,
    default: 1, // 1=user, 2=admin (orgAdmin), 3=superAdmin (hallAdmin)
    min: 1,
    max: 3
  },
  permissions: [{
    type: String,
    enum: [
      'manage_organization',
      'manage_users',
      'manage_items',
      'view_reports',
      'manage_settings',
      'approve_items',
      'export_data',
      'manage_subscriptions'
    ]
  }],
  // Profile fields
  avatar: String,
  department: String,
  position: String,
  memberId: String, // For organization members
  employeeId: String, // For staff users
  // Verification and security
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    select: false
  },
  verificationCodeExpires: {
    type: Date,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  // Status and activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'pending'],
    default: 'pending'
  },
  lastLogin: {
    type: Date
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  // Session tracking
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'am', 'om', 'ti'],
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  // Invitation tracking
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: Date,
  acceptedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for multi-tenancy
userSchema.index({ organization: 1, email: 1 }, { unique: true });
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ organization: 1, status: 1 });
userSchema.index({ email: 1 }); // For super admin and cross-org lookups

// Virtual for full name with role
userSchema.virtual('displayName').get(function() {
  const roleLabels = {
    superAdmin: 'Super Admin',
    admin: 'Organization Admin',
    user: 'User'
  };
  return `${this.name} (${roleLabels[this.role] || this.role})`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActive = Date.now();
  return this.save();
};

// Record login activity
userSchema.methods.recordLogin = function(ipAddress, userAgent) {
  this.lastLogin = Date.now();
  this.lastActive = Date.now();
  this.loginCount += 1;
  if (ipAddress) this.ipAddress = ipAddress;
  if (userAgent) this.userAgent = userAgent;
  return this.save();
};

// Check if user has permission
userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'superAdmin') return true;
  return this.permissions.includes(permission);
};

// Get role permissions
userSchema.statics.getRolePermissions = function(role) {
  const rolePermissions = {
    superAdmin: [
      'manage_organization',
      'manage_users',
      'manage_items',
      'view_reports',
      'manage_settings',
      'approve_items',
      'export_data',
      'manage_subscriptions',
      'system_admin'
    ],
    admin: [
      'manage_users',
      'manage_items',
      'view_reports',
      'manage_settings',
      'approve_items',
      'export_data'
    ],
    user: []
  };
  
  return rolePermissions[role] || [];
};

// Static method to create user with default permissions
userSchema.statics.createWithRole = async function(userData, role = 'user') {
  const permissions = this.getRolePermissions(role);
  return this.create({
    ...userData,
    role,
    permissions
  });
};

module.exports = mongoose.model('User', userSchema);
