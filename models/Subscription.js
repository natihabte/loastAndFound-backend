const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'unpaid', 'trialing'],
    default: 'trialing'
  },
  billing: {
    interval: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    nextBillingDate: Date,
    lastBillingDate: Date
  },
  trial: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  features: {
    maxUsers: {
      type: Number,
      required: true
    },
    maxItems: {
      type: Number,
      required: true
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    advancedReports: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    multiLanguage: {
      type: Boolean,
      default: true
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal', 'stripe']
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'payment_failed']
    },
    fromPlan: String,
    toPlan: String,
    date: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ organization: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'billing.nextBillingDate': 1 });
subscriptionSchema.index({ 'trial.endDate': 1 });

// Virtual for trial days remaining
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trial.isActive) return 0;
  const now = new Date();
  const endDate = new Date(this.trial.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Static method to get plan features
subscriptionSchema.statics.getPlanFeatures = function(plan) {
  const plans = {
    free: {
      maxUsers: 10,
      maxItems: 100,
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      multiLanguage: true,
      price: 0
    },
    basic: {
      maxUsers: 50,
      maxItems: 500,
      customBranding: true,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      multiLanguage: true,
      price: 29
    },
    premium: {
      maxUsers: 200,
      maxItems: 2000,
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: false,
      multiLanguage: true,
      price: 99
    },
    enterprise: {
      maxUsers: -1, // Unlimited
      maxItems: -1, // Unlimited
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      multiLanguage: true,
      price: 299
    }
  };
  
  return plans[plan] || plans.free;
};

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  if (this.status === 'active') return true;
  if (this.status === 'trialing' && this.trialDaysRemaining > 0) return true;
  return false;
};

// Method to add history entry
subscriptionSchema.methods.addHistory = function(action, data = {}) {
  this.history.push({
    action,
    fromPlan: data.fromPlan,
    toPlan: data.toPlan,
    amount: data.amount,
    reason: data.reason
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);