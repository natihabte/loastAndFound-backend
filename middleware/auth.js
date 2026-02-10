const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token with organization populated
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('organization', 'name slug status isActive');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if user is active
    if (req.user.status === 'banned' || req.user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Account suspended' });
    }

    // Check if organization is active (except for hall admin)
    if (req.user.role !== 'hallAdmin' && req.user.organization) {
      if (!req.user.organization.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: 'Organization access suspended or not approved' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Hall Admin only access
exports.hallAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'hallAdmin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Hall Admin privileges required.' 
    });
  }
  next();
};

// Organization Admin or higher access
exports.orgAdminOrHigher = (req, res, next) => {
  if (!req.user || !['hallAdmin', 'orgAdmin'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Organization Admin privileges required.' 
    });
  }
  next();
};

// Role level based access (1=user, 2=orgAdmin, 3=hallAdmin)
exports.requireRoleLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user || req.user.roleLevel < minLevel) {
      const roleNames = { 1: 'User', 2: 'Organization Admin', 3: 'Hall Admin' };
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Minimum role required: ${roleNames[minLevel]}` 
      });
    }
    next();
  };
};

// Organization-scoped access control
exports.requireOrganizationAccess = (req, res, next) => {
  // Hall admin can access any organization
  if (req.user.role === 'hallAdmin') {
    return next();
  }

  // Get organization ID from request (params, body, or query)
  const requestedOrgId = req.params.organizationId || 
                        req.body.organizationId || 
                        req.query.organizationId ||
                        req.params.orgId;

  // If no specific organization requested, use user's organization
  if (!requestedOrgId) {
    if (!req.user.organization) {
      return res.status(403).json({
        success: false,
        message: 'No organization access'
      });
    }
    req.organizationId = req.user.organization._id.toString();
    return next();
  }

  // Check if user has access to requested organization
  if (req.user.organization._id.toString() !== requestedOrgId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this organization'
    });
  }

  req.organizationId = requestedOrgId;
  next();
};

// Role-based authorization with organization scope
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Hall admin has access to everything
    if (req.user.role === 'hallAdmin') {
      return next();
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Permission-based authorization
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Hall admin has all permissions
    if (req.user.role === 'hallAdmin') {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required permission: ${permission}` 
      });
    }

    next();
  };
};

// Organization data isolation middleware
exports.enforceOrganizationScope = (req, res, next) => {
  // Hall admin can access all data
  if (req.user.role === 'hallAdmin') {
    return next();
  }

  // Ensure organization context is set
  if (!req.user.organization) {
    return res.status(403).json({
      success: false,
      message: 'No organization context'
    });
  }

  // Add organization filter to query
  req.organizationFilter = { organization: req.user.organization._id };
  
  // Add organization to body for create operations
  if (req.method === 'POST' && req.body) {
    req.body.organization = req.user.organization._id;
  }

  next();
};

// Middleware to log admin actions
exports.logAdminAction = (action) => {
  return async (req, res, next) => {
    // Store action info for post-processing
    req.adminAction = {
      action,
      user: req.user._id,
      organization: req.user.organization?._id,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    next();
  };
};

module.exports = exports;
