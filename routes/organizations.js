const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { 
  extractOrganization, 
  requireOrganization, 
  checkSubscription,
  checkFeature,
  ensureOrganizationMember 
} = require('../middleware/multiTenant');

// @route   POST /api/organizations
// @desc    Public Sector Organization Registration - MERN Stack SaaS
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      // Organization Information (as specified in requirements)
      organizationName,
      organizationType,
      sectorLevel,
      officialEmail,
      phoneNumber,
      physicalAddress,
      // Admin Account Information (as specified in requirements)
      adminFullName,
      adminEmail,
      password,
      // System Fields (as specified in requirements)
      organizationId,
      defaultLanguage,
      subscriptionPlan,
      // Security
      captchaVerified
    } = req.body;

    // Comprehensive validation as per requirements
    const validationErrors = [];

    // Required field validation
    if (!organizationName?.trim()) validationErrors.push('Organization name is required');
    if (!organizationType) validationErrors.push('Organization type is required');
    if (!sectorLevel) validationErrors.push('Sector level is required');
    if (!officialEmail?.trim()) validationErrors.push('Official email address is required');
    if (!phoneNumber?.trim()) validationErrors.push('Phone number is required');
    if (!adminFullName?.trim()) validationErrors.push('Admin full name is required');
    if (!adminEmail?.trim()) validationErrors.push('Admin email is required');
    if (!password) validationErrors.push('Password is required');
    if (!organizationId?.trim()) validationErrors.push('Organization ID is required');
    if (!captchaVerified) validationErrors.push('CAPTCHA verification is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (officialEmail && !emailRegex.test(officialEmail)) {
      validationErrors.push('Invalid official email format');
    }
    if (adminEmail && !emailRegex.test(adminEmail)) {
      validationErrors.push('Invalid admin email format');
    }

    // Phone number validation
    const phoneRegex = /^(\+251|0)?[0-9]{9}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''))) {
      validationErrors.push('Invalid phone number format');
    }

    // Strong password rules validation (as specified in requirements)
    if (password) {
      const minLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!minLength) validationErrors.push('Password must be at least 8 characters');
      if (!hasUppercase) validationErrors.push('Password must contain uppercase letter');
      if (!hasLowercase) validationErrors.push('Password must contain lowercase letter');
      if (!hasNumber) validationErrors.push('Password must contain number');
      if (!hasSpecialChar) validationErrors.push('Password must contain special character');
    }

    // Organization type validation (as specified in requirements)
    const validOrgTypes = ['university', 'municipality', 'hospital', 'transport', 'government', 'other'];
    if (organizationType && !validOrgTypes.includes(organizationType)) {
      validationErrors.push('Invalid organization type');
    }

    // Sector level validation (as specified in requirements)
    const validSectorLevels = ['federal', 'regional', 'city', 'local'];
    if (sectorLevel && !validSectorLevels.includes(sectorLevel)) {
      validationErrors.push('Invalid sector level');
    }

    // Default language validation (as specified in requirements)
    const validLanguages = ['en', 'am', 'om', 'ti'];
    if (defaultLanguage && !validLanguages.includes(defaultLanguage)) {
      validationErrors.push('Invalid default language');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check for existing organization name
    const existingOrgByName = await Organization.findOne({ 
      name: { $regex: new RegExp(`^${organizationName.trim()}$`, 'i') }
    });
    if (existingOrgByName) {
      return res.status(400).json({
        success: false,
        message: 'An organization with this name already exists'
      });
    }

    // Check for existing organization ID (auto-generated should be unique)
    const existingOrgById = await Organization.findOne({ organizationId });
    if (existingOrgById) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID already exists. Please refresh and try again.'
      });
    }

    // Check for existing emails
    const existingOfficialEmail = await Organization.findOne({ 'contact.email': officialEmail });
    if (existingOfficialEmail) {
      return res.status(400).json({
        success: false,
        message: 'Official email is already registered'
      });
    }

    const existingAdminEmail = await User.findOne({ email: adminEmail });
    if (existingAdminEmail) {
      return res.status(400).json({
        success: false,
        message: 'Admin email is already registered'
      });
    }

    // Generate organization slug for URL-friendly identifier
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    // Ensure slug uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create a temporary organization first (with hall admin as temporary admin)
    const hallAdmin = await User.findOne({ role: 'hallAdmin' });
    if (!hallAdmin) {
      return res.status(500).json({
        success: false,
        message: 'System error: No hall admin found. Please contact support.'
      });
    }

    const organization = await Organization.create({
      name: organizationName.trim(),
      organizationId: organizationId.trim(),
      slug,
      type: organizationType,
      sectorLevel,
      description: `${organizationType} organization - ${sectorLevel} level`,
      adminId: hallAdmin._id, // Temporary assignment to hall admin
      contact: {
        email: officialEmail.trim(),
        phone: phoneNumber.trim(),
        address: {
          street: physicalAddress?.street || '',
          city: physicalAddress?.city || '',
          region: physicalAddress?.region || '',
          country: physicalAddress?.country || 'Ethiopia',
          postalCode: physicalAddress?.postalCode || ''
        }
      },
      settings: {
        language: defaultLanguage || 'en',
        timezone: 'Africa/Addis_Ababa',
        allowPublicSearch: true,
        requireApproval: true
      },
      subscription: {
        plan: subscriptionPlan || 'free', // Default subscription plan (Free)
        status: 'trial',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        maxUsers: 10,
        maxItems: 100,
        features: {
          customBranding: false,
          advancedReports: false,
          apiAccess: false,
          prioritySupport: false,
          multiLanguage: true
        }
      },
      isActive: false, // Requires email verification and approval
      registrationDate: new Date(),
      verificationStatus: 'pending'
    });

    // Create admin user with organization reference
    const admin = await User.create({
      name: adminFullName.trim(),
      email: adminEmail.trim(),
      password, // Secure password hashing handled by pre-save middleware
      organization: organization._id,
      role: 'orgAdmin', // Assign Organization Admin role (fixed role name)
      roleLevel: 2,
      permissions: User.getRolePermissions('orgAdmin'),
      status: 'pending',
      isVerified: false,
      preferences: {
        language: defaultLanguage || 'en',
        timezone: 'Africa/Addis_Ababa',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    });

    // Update organization with proper admin reference
    organization.adminId = admin._id;
    organization.createdBy = admin._id;
    await organization.save();

    // Create subscription record for SaaS billing
    await Subscription.create({
      organization: organization._id,
      plan: subscriptionPlan || 'free',
      status: 'trialing',
      billing: {
        interval: 'monthly',
        amount: 0,
        currency: 'USD'
      },
      features: Subscription.getPlanFeatures('free'),
      trial: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      history: [{
        action: 'created',
        toPlan: 'free',
        amount: 0,
        reason: 'Public sector organization registration',
        timestamp: new Date()
      }]
    });

    // Email verification after registration (as specified in requirements)
    const jwt = require('jsonwebtoken');
    const verificationToken = jwt.sign(
      { 
        userId: admin._id, 
        organizationId: organization._id,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    try {
      const { sendOrganizationVerificationEmail } = require('../utils/email');
      await sendOrganizationVerificationEmail(
        adminEmail, 
        verificationToken, 
        organizationName,
        organizationId,
        adminFullName
      );
      console.log(`📧 Verification email sent to ${adminEmail}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Log registration activity for audit trail
    await ActivityLog.logActivity(
      admin._id,
      'organization_created',
      `Public sector organization "${organizationName}" registered with ID: ${organizationId}`,
      {
        organizationId: organization._id,
        organizationType,
        sectorLevel,
        plan: subscriptionPlan || 'free',
        trialDays: 14,
        adminEmail,
        registrationMethod: 'public_sector_form'
      },
      req,
      {
        organization: organization._id,
        severity: 'medium',
        category: 'registration'
      }
    );

    // Success response with onboarding steps (as specified in requirements)
    res.status(201).json({
      success: true,
      message: 'Public sector organization registered successfully! Please check your email for verification instructions.',
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          organizationId: organization.organizationId,
          slug: organization.slug,
          type: organization.type,
          sectorLevel: organization.sectorLevel,
          status: 'pending'
        },
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role // Organization Admin role assigned
        },
        subscription: {
          plan: 'free',
          trialDays: 14,
          endDate: organization.subscription.endDate
        },
        // Show onboarding steps (as specified in requirements)
        onboardingSteps: [
          {
            step: 1,
            title: 'Email Verification',
            description: 'Check your email and click the verification link',
            status: 'pending'
          },
          {
            step: 2,
            title: 'Organization Approval',
            description: 'Wait for organization approval (24-48 hours)',
            status: 'pending'
          },
          {
            step: 3,
            title: 'Dashboard Setup',
            description: 'Complete your organization dashboard setup',
            status: 'pending'
          },
          {
            step: 4,
            title: 'Team Invitation',
            description: 'Invite team members to your workspace',
            status: 'pending'
          },
          {
            step: 5,
            title: 'System Configuration',
            description: 'Configure lost & found system settings',
            status: 'pending'
          }
        ],
        // Redirect to organization dashboard (after verification)
        redirectUrl: '/organization-dashboard',
        verificationRequired: true,
        approvalRequired: true
      }
    });

  } catch (error) {
    console.error('Public sector organization registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different value.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error. Please try again later.'
    });
  }
});

// @route   GET /api/organizations/public
// @desc    Get all active organizations (PUBLIC - no auth required)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      type
    } = req.query;

    const query = { isActive: true }; // Only show active organizations
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }

    const organizations = await Organization.find(query)
      .select('name organizationId type sectorLevel description contact isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Organization.countDocuments(query);

    console.log(`📊 Public organizations query - Found ${organizations.length} active organizations`);

    // Transform to match frontend expected format
    const transformedOrgs = organizations.map(org => ({
      id: org._id.toString(),
      name: org.name,
      organizationId: org.organizationId,
      type: org.type,
      sectorLevel: org.sectorLevel,
      logo: `https://placehold.co/100x100/3b82f6/white?text=${org.name.charAt(0)}`,
      location: `${org.contact?.address?.city || 'Ethiopia'}`,
      description: org.description || `${org.type} organization`,
      activeItems: 0, // TODO: Calculate from items
      totalItems: 0,
      rating: 4.5,
      verified: org.isActive,
      contact: {
        phone: org.contact?.phone || '',
        email: org.contact?.email || '',
        website: org.website || ''
      },
      stats: {
        lostItems: 0,
        foundItems: 0,
        returnedItems: 0
      }
    }));

    res.json({
      success: true,
      data: transformedOrgs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get public organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations'
    });
  }
});

// @route   GET /api/organizations
// @desc    Get organizations (Hall Admin sees all, Org Admin sees own)
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      plan
    } = req.query;

    // Check user permissions
    if (!['hallAdmin', 'orgAdmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const query = {};
    
    // Organization admins can only see their own organization
    if (req.user.role === 'orgAdmin') {
      query._id = req.user.organization;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (status) query.isActive = status === 'active';
    if (plan) query['subscription.plan'] = plan;

    const organizations = await Organization.find(query)
      .populate('adminId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Organization.countDocuments(query);

    console.log(`Organizations query for ${req.user.role}:`, query);
    console.log(`Found ${organizations.length} organizations`);

    res.json({
      success: true,
      data: organizations,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      userRole: req.user.role,
      userOrganization: req.user.organization
    });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations'
    });
  }
});

// @route   GET /api/organizations/:id
// @desc    Get organization details
// @access  Private (Organization members + Super Admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && 
        req.user.organization.toString() !== organization._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: organization
    });

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization'
    });
  }
});

// @route   PUT /api/organizations/:id
// @desc    Update organization
// @access  Private (Organization Admin + Super Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'super_admin' || 
                     (req.user.organization.toString() === organization._id.toString() && 
                      req.user.hasPermission('manage_organization'));

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      name,
      description,
      website,
      contact,
      settings
    } = req.body;

    // Update allowed fields
    if (name) organization.name = name;
    if (description) organization.description = description;
    if (website) organization.website = website;
    if (contact) organization.contact = { ...organization.contact, ...contact };
    if (settings) organization.settings = { ...organization.settings, ...settings };

    await organization.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'organization_updated',
      `Organization "${organization.name}" updated`,
      { changes: req.body },
      req,
      {
        organization: organization._id,
        severity: 'low',
        category: 'system'
      }
    );

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization'
    });
  }
});

// @route   GET /api/organizations/:id/stats
// @desc    Get organization statistics
// @access  Private (Organization members + Super Admin)
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && 
        req.user.organization.toString() !== organization._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get detailed statistics
    const [userCount, itemCount, activityStats] = await Promise.all([
      User.countDocuments({ organization: organization._id }),
      require('../models/Item').countDocuments({ organization: organization._id }),
      ActivityLog.getActivityStats(organization._id, 30)
    ]);

    const stats = {
      users: {
        total: userCount,
        limit: organization.subscription.maxUsers,
        percentage: organization.subscription.maxUsers > 0 ? 
                   (userCount / organization.subscription.maxUsers) * 100 : 0
      },
      items: {
        total: itemCount,
        limit: organization.subscription.maxItems,
        percentage: organization.subscription.maxItems > 0 ? 
                   (itemCount / organization.subscription.maxItems) * 100 : 0
      },
      subscription: {
        plan: organization.subscription.plan,
        status: organization.subscription.status,
        daysRemaining: organization.subscription.endDate ? 
                      Math.ceil((organization.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)) : null
      },
      activity: activityStats
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization statistics'
    });
  }
});

// @route   POST /api/organizations/:id/suspend
// @desc    Suspend organization (Super Admin only)
// @access  Private/Super Admin
router.post('/:id/suspend', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const organization = await Organization.findById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    organization.isActive = false;
    organization.subscription.status = 'suspended';
    await organization.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'organization_suspended',
      `Organization "${organization.name}" suspended`,
      { reason },
      req,
      {
        relatedOrganization: organization._id,
        severity: 'high',
        category: 'system'
      }
    );

    res.json({
      success: true,
      message: 'Organization suspended successfully'
    });

  } catch (error) {
    console.error('Suspend organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend organization'
    });
  }
});

// @route   POST /api/organizations/:id/activate
// @desc    Activate organization (Super Admin only)
// @access  Private/Super Admin
router.post('/:id/activate', protect, authorize('super_admin'), async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    organization.isActive = true;
    organization.subscription.status = 'active';
    await organization.save();

    // Log activity
    await ActivityLog.logActivity(
      req.user.id,
      'organization_activated',
      `Organization "${organization.name}" activated`,
      {},
      req,
      {
        relatedOrganization: organization._id,
        severity: 'medium',
        category: 'system'
      }
    );

    res.json({
      success: true,
      message: 'Organization activated successfully'
    });

  } catch (error) {
    console.error('Activate organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate organization'
    });
  }
});

// @route   POST /api/organizations/verify-email
// @desc    Verify organization admin email
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, organizationId } = decoded;

    // Find user and organization
    const user = await User.findById(userId);
    const organization = await Organization.findById(organizationId);

    if (!user || !organization) {
      return res.status(404).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.status = 'active';
    await user.save();

    // Log activity
    await ActivityLog.logActivity(
      user._id,
      'user_verified',
      `Organization admin email verified: ${user.email}`,
      {
        organizationId: organization._id,
        verificationMethod: 'email_token'
      },
      req,
      {
        organization: organization._id,
        severity: 'low',
        category: 'security'
      }
    );

    res.json({
      success: true,
      message: 'Email verified successfully. Your organization is now pending approval.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: true
        },
        organization: {
          id: organization._id,
          name: organization.name,
          status: organization.isActive ? 'active' : 'pending_approval'
        }
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new one.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

// @route   POST /api/organizations/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email }).populate('organization');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const jwt = require('jsonwebtoken');
    const verificationToken = jwt.sign(
      { userId: user._id, organizationId: user.organization._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    try {
      const { sendOrganizationVerificationEmail } = require('../utils/email');
      await sendOrganizationVerificationEmail(user.email, verificationToken, user.organization.name);
      console.log(`📧 Verification email resent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
});


module.exports = router;
