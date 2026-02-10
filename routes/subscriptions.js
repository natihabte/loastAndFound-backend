const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { 
  extractOrganization, 
  requireOrganization, 
  ensureOrganizationMember 
} = require('../middleware/multiTenant');

// Apply organization context middleware
router.use(extractOrganization);

// @route   GET /api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', (req, res) => {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      interval: 'monthly',
      features: {
        maxUsers: 10,
        maxItems: 100,
        customBranding: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        multiLanguage: true
      },
      description: 'Perfect for small organizations getting started',
      popular: false
    },
    basic: {
      name: 'Basic',
      price: 29,
      interval: 'monthly',
      features: {
        maxUsers: 50,
        maxItems: 500,
        customBranding: true,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        multiLanguage: true
      },
      description: 'Great for growing organizations',
      popular: true
    },
    premium: {
      name: 'Premium',
      price: 99,
      interval: 'monthly',
      features: {
        maxUsers: 200,
        maxItems: 2000,
        customBranding: true,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: false,
        multiLanguage: true
      },
      description: 'Advanced features for large organizations',
      popular: false
    },
    enterprise: {
      name: 'Enterprise',
      price: 299,
      interval: 'monthly',
      features: {
        maxUsers: -1, // Unlimited
        maxItems: -1, // Unlimited
        customBranding: true,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: true,
        multiLanguage: true
      },
      description: 'Everything you need for enterprise-scale operations',
      popular: false
    }
  };

  res.json({
    success: true,
    data: plans
  });
});

// @route   GET /api/subscriptions/current
// @desc    Get current organization subscription
// @access  Private (Organization members)
router.get('/current', protect, requireOrganization, ensureOrganizationMember, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      organization: req.organizationId 
    }).populate('organization', 'name slug');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...subscription.toObject(),
        trialDaysRemaining: subscription.trialDaysRemaining,
        isActive: subscription.isActive()
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    });
  }
});

// @route   POST /api/subscriptions/upgrade
// @desc    Upgrade subscription plan
// @access  Private (Organization Admin)
router.post('/upgrade', protect, requireOrganization, ensureOrganizationMember, async (req, res) => {
  try {
    // Check if user has permission to manage subscriptions
    if (!req.user.hasPermission('manage_subscriptions') && req.user.role !== 'org_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Subscription management permission required.'
      });
    }

    const { plan, interval = 'monthly', paymentMethod } = req.body;

    // Validate plan
    const validPlans = ['free', 'basic', 'premium', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const subscription = await Subscription.findOne({ 
      organization: req.organizationId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const currentPlan = subscription.plan;
    const planFeatures = Subscription.getPlanFeatures(plan);

    // Calculate pricing
    const pricing = {
      monthly: planFeatures.price,
      yearly: Math.floor(planFeatures.price * 12 * 0.8) // 20% discount for yearly
    };

    // Update subscription
    subscription.plan = plan;
    subscription.status = plan === 'free' ? 'active' : 'active';
    subscription.billing.interval = interval;
    subscription.billing.amount = pricing[interval];
    subscription.billing.nextBillingDate = new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
    subscription.features = planFeatures;

    if (paymentMethod) {
      subscription.paymentMethod = paymentMethod;
    }

    // Add to history
    subscription.addHistory('upgraded', {
      fromPlan: currentPlan,
      toPlan: plan,
      amount: pricing[interval]
    });

    await subscription.save();

    // Update organization subscription info
    await Organization.findByIdAndUpdate(req.organizationId, {
      'subscription.plan': plan,
      'subscription.status': subscription.status,
      'subscription.maxUsers': planFeatures.maxUsers,
      'subscription.maxItems': planFeatures.maxItems,
      'subscription.features': planFeatures
    });

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'subscription_changed',
      `Subscription upgraded from ${currentPlan} to ${plan}`,
      {
        fromPlan: currentPlan,
        toPlan: plan,
        interval,
        amount: pricing[interval]
      },
      req,
      {
        organization: req.organizationId,
        severity: 'medium',
        category: 'billing'
      }
    );

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        plan,
        interval,
        amount: pricing[interval],
        nextBillingDate: subscription.billing.nextBillingDate,
        features: planFeatures
      }
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription'
    });
  }
});

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private (Organization Admin)
router.post('/cancel', protect, requireOrganization, ensureOrganizationMember, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.hasPermission('manage_subscriptions') && req.user.role !== 'org_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Subscription management permission required.'
      });
    }

    const { reason } = req.body;

    const subscription = await Subscription.findOne({ 
      organization: req.organizationId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const currentPlan = subscription.plan;

    // Update subscription
    subscription.status = 'cancelled';
    subscription.addHistory('cancelled', {
      fromPlan: currentPlan,
      toPlan: 'free',
      reason
    });

    await subscription.save();

    // Downgrade to free plan
    const freeFeatures = Subscription.getPlanFeatures('free');
    await Organization.findByIdAndUpdate(req.organizationId, {
      'subscription.plan': 'free',
      'subscription.status': 'cancelled',
      'subscription.maxUsers': freeFeatures.maxUsers,
      'subscription.maxItems': freeFeatures.maxItems,
      'subscription.features': freeFeatures
    });

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'subscription_cancelled',
      `Subscription cancelled, downgraded to free plan`,
      { reason, previousPlan: currentPlan },
      req,
      {
        organization: req.organizationId,
        severity: 'medium',
        category: 'billing'
      }
    );

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Account downgraded to free plan.'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

// @route   GET /api/subscriptions/usage
// @desc    Get current usage statistics
// @access  Private (Organization members)
router.get('/usage', protect, requireOrganization, ensureOrganizationMember, async (req, res) => {
  try {
    const [userCount, itemCount] = await Promise.all([
      require('../models/User').countDocuments({ organization: req.organizationId }),
      require('../models/Item').countDocuments({ organization: req.organizationId })
    ]);

    const organization = req.organization;
    const subscription = organization.subscription;

    const usage = {
      users: {
        current: userCount,
        limit: subscription.maxUsers,
        percentage: subscription.maxUsers > 0 ? (userCount / subscription.maxUsers) * 100 : 0,
        unlimited: subscription.maxUsers === -1
      },
      items: {
        current: itemCount,
        limit: subscription.maxItems,
        percentage: subscription.maxItems > 0 ? (itemCount / subscription.maxItems) * 100 : 0,
        unlimited: subscription.maxItems === -1
      },
      plan: subscription.plan,
      status: subscription.status
    };

    res.json({
      success: true,
      data: usage
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics'
    });
  }
});

// @route   GET /api/subscriptions/history
// @desc    Get subscription history
// @access  Private (Organization Admin)
router.get('/history', protect, requireOrganization, ensureOrganizationMember, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.hasPermission('manage_subscriptions') && req.user.role !== 'org_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Subscription management permission required.'
      });
    }

    const subscription = await Subscription.findOne({ 
      organization: req.organizationId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: subscription.history.sort((a, b) => b.date - a.date)
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history'
    });
  }
});

// @route   POST /api/subscriptions/extend-trial
// @desc    Extend trial period (Super Admin only)
// @access  Private/Super Admin
router.post('/extend-trial', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { organizationId, days } = req.body;

    if (!organizationId || !days) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and days are required'
      });
    }

    const subscription = await Subscription.findOne({ 
      organization: organizationId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Extend trial
    const currentEndDate = subscription.trial.endDate || new Date();
    subscription.trial.endDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);
    subscription.trial.isActive = true;

    subscription.addHistory('trial_extended', {
      reason: `Trial extended by ${days} days by super admin`,
      amount: 0
    });

    await subscription.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'super_admin_action',
      `Trial extended by ${days} days for organization`,
      { organizationId, days },
      req,
      {
        relatedOrganization: organizationId,
        severity: 'medium',
        category: 'billing'
      }
    );

    res.json({
      success: true,
      message: `Trial extended by ${days} days`,
      data: {
        newEndDate: subscription.trial.endDate,
        daysRemaining: subscription.trialDaysRemaining
      }
    });

  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend trial'
    });
  }
});

module.exports = router;