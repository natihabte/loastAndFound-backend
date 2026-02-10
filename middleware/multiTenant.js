const Organization = require('../models/Organization');
const User = require('../models/User');

// Middleware to extract organization context from request
exports.extractOrganization = async (req, res, next) => {
  try {
    let organizationId = null;
    let organization = null;

    // Method 1: From subdomain (e.g., university.lostandfound.com)
    if (req.headers.host) {
      const subdomain = req.headers.host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        organization = await Organization.findOne({ 
          slug: subdomain, 
          isActive: true 
        });
        if (organization) {
          organizationId = organization._id;
        }
      }
    }

    // Method 2: From custom header (for API clients)
    if (!organizationId && req.headers['x-organization-id']) {
      organizationId = req.headers['x-organization-id'];
      organization = await Organization.findById(organizationId);
    }

    // Method 3: From query parameter (fallback)
    if (!organizationId && req.query.org) {
      organization = await Organization.findOne({ 
        slug: req.query.org, 
        isActive: true 
      });
      if (organization) {
        organizationId = organization._id;
      }
    }

    // Method 4: From authenticated user's organization
    if (!organizationId && req.user && req.user.organization) {
      organizationId = req.user.organization;
      organization = await Organization.findById(organizationId);
    }

    // Attach to request object
    req.organizationId = organizationId;
    req.organization = organization;

    next();
  } catch (error) {
    console.error('Organization extraction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to determine organization context' 
    });
  }
};

// Middleware to require organization context
exports.requireOrganization = (req, res, next) => {
  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      message: 'Organization context is required. Please specify organization via subdomain, header, or query parameter.'
    });
  }

  if (!req.organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found or inactive'
    });
  }

  next();
};

// Middleware to check organization subscription status
exports.checkSubscription = (req, res, next) => {
  if (!req.organization) {
    return res.status(400).json({
      success: false,
      message: 'Organization context required'
    });
  }

  const org = req.organization;
  
  // Check if organization is active
  if (!org.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Organization account is suspended'
    });
  }

  // Check subscription status
  if (org.subscription.status === 'cancelled' || org.subscription.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Organization subscription is not active'
    });
  }

  // Check trial expiration
  if (org.subscription.status === 'trial' && org.subscription.endDate < new Date()) {
    return res.status(403).json({
      success: false,
      message: 'Organization trial has expired. Please upgrade your subscription.'
    });
  }

  next();
};

// Middleware to check feature access based on subscription
exports.checkFeature = (feature) => {
  return (req, res, next) => {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required'
      });
    }

    const hasFeature = req.organization.subscription.features[feature];
    
    if (!hasFeature) {
      return res.status(403).json({
        success: false,
        message: `This feature requires a subscription upgrade. Feature: ${feature}`
      });
    }

    next();
  };
};

// Middleware to check usage limits
exports.checkUsageLimit = (type) => {
  return async (req, res, next) => {
    try {
      if (!req.organization) {
        return res.status(400).json({
          success: false,
          message: 'Organization context required'
        });
      }

      const canProceed = await Organization.checkLimits(req.organization._id, type);
      
      if (!canProceed) {
        const limits = {
          free: { users: 10, items: 100 },
          basic: { users: 50, items: 500 },
          premium: { users: 200, items: 2000 },
          enterprise: { users: 'Unlimited', items: 'Unlimited' }
        };
        
        const currentPlan = req.organization.subscription.plan;
        const limit = limits[currentPlan][type];
        
        return res.status(403).json({
          success: false,
          message: `${type} limit reached for ${currentPlan} plan (${limit}). Please upgrade your subscription.`
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check usage limits'
      });
    }
  };
};

// Middleware to ensure user belongs to organization
exports.ensureOrganizationMember = async (req, res, next) => {
  try {
    if (!req.user || !req.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User and organization context required'
      });
    }

    // Super admin can access any organization
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user belongs to the organization
    if (req.user.organization.toString() !== req.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User does not belong to this organization.'
      });
    }

    next();
  } catch (error) {
    console.error('Organization membership check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify organization membership'
    });
  }
};

// Middleware to add organization filter to queries
exports.addOrganizationFilter = (req, res, next) => {
  if (req.organizationId && req.user.role !== 'super_admin') {
    // Add organization filter to query
    req.organizationFilter = { organization: req.organizationId };
  } else {
    req.organizationFilter = {};
  }
  
  next();
};

// Utility function to get organization from various sources
exports.getOrganizationContext = async (req) => {
  // Try different methods to get organization
  let org = null;

  // From subdomain
  if (req.headers.host) {
    const subdomain = req.headers.host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      org = await Organization.findOne({ slug: subdomain, isActive: true });
    }
  }

  // From header
  if (!org && req.headers['x-organization-id']) {
    org = await Organization.findById(req.headers['x-organization-id']);
  }

  // From query
  if (!org && req.query.org) {
    org = await Organization.findOne({ slug: req.query.org, isActive: true });
  }

  // From user
  if (!org && req.user && req.user.organization) {
    org = await Organization.findById(req.user.organization);
  }

  return org;
};