const mongoose = require('mongoose');

const PlatformSettingsSchema = new mongoose.Schema({
  support: {
    enabled: {
      type: Boolean,
      default: true
    },
    phoneNumber: {
      type: String,
      default: '+1-800-555-0123'
    },
    is24x7: {
      type: Boolean,
      default: true
    },
    supportEmail: {
      type: String,
      default: 'support@platform.com'
    },
    flutterAppEnabled: {
      type: Boolean,
      default: true
    }
  },
  system: {
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    registrationEnabled: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    autoApproval: {
      type: Boolean,
      default: false
    },
    maxFileSize: {
      type: Number,
      default: 5
    },
    sessionTimeout: {
      type: Number,
      default: 24
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Ensure only one settings document exists
PlatformSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

PlatformSettingsSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.getSettings();
  
  if (updates.support) {
    // Properly update nested object fields
    Object.keys(updates.support).forEach(key => {
      settings.support[key] = updates.support[key];
    });
    settings.markModified('support');
  }
  
  if (updates.system) {
    // Properly update nested object fields
    Object.keys(updates.system).forEach(key => {
      settings.system[key] = updates.system[key];
    });
    settings.markModified('system');
  }
  
  settings.updatedAt = Date.now();
  settings.updatedBy = userId;
  
  await settings.save();
  return settings;
};

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
