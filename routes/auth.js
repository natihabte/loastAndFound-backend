const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendVerificationEmail } = require('../utils/email');
const { protect } = require('../middleware/auth');

// Mock verification codes storage (in-memory for development)
let mockVerificationCodes = {};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test route
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone } = req.body;

    // Check if user exists in database
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Create user in database
    user = await User.create({
      name,
      email,
      password,
      phone,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isVerified: false,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    // Log registration activity
    await ActivityLog.logActivity(
      user._id,
      'user_registered',
      `New user registered: ${name} (${email})`,
      {
        email,
        name,
        phone,
        registrationMethod: 'email'
      },
      req
    );

    // Try to send email verification code
    try {
      await sendVerificationEmail(email, verificationCode);
      console.log(`📧 Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.log(`📧 Verification code for ${email}: ${verificationCode}`);
    }

    // Also store in mock codes for development mode
    mockVerificationCodes[email] = {
      code: verificationCode,
      expires: Date.now() + 10 * 60 * 1000
    };

    console.log(`📧 Verification code for ${email}: ${verificationCode}`);
    console.log(`💡 User can also use any 6-digit code in development mode (like 123456)`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification code sent to email.',
      userId: user._id
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify email with code
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user in database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Development mode: accept any 6-digit code
    const isValidCode = process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code);
    const storedCode = mockVerificationCodes[email];
    const isStoredCodeValid = storedCode && storedCode.code === code && storedCode.expires > Date.now();

    if (!isValidCode && !isStoredCodeValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    if (isValidCode) {
      console.log(`🔧 Development mode: Accepting verification code ${code} for ${email}`);
    }

    // Update user in database
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Log verification activity
    await ActivityLog.logActivity(
      user._id,
      'user_verified',
      `User verified email: ${email}`,
      {
        email,
        verificationMethod: isValidCode ? 'development_mode' : 'email_code'
      },
      req
    );

    // Clean up mock storage
    delete mockVerificationCodes[email];

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Use actual role for consistency
        roleLevel: user.roleLevel,
        organization: user.organization
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user in database with organization populated
    const user = await User.findOne({ email }).select('+password').populate('organization');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if verified (skip in development mode)
    if (!user.isVerified && process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ success: false, message: 'Please verify your email first' });
    }

    // Record login activity in user model
    await user.recordLogin(req.ip || req.connection.remoteAddress, req.get('User-Agent'));

    // Log login activity
    await ActivityLog.logActivity(
      user._id,
      user.role === 'admin' ? 'admin_login' : 'user_login',
      `${user.role === 'admin' ? 'Admin' : 'User'} logged in: ${email}`,
      {
        email,
        role: user.role,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin
      },
      req
    );

    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Use actual role for consistency
        roleLevel: user.roleLevel,
        organization: user.organization, // Include organization data
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-code
// @desc    Resend verification code
// @access  Public
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    const verificationCode = generateVerificationCode();
    
    // Update user with new verification code
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    // Store in mock codes for development mode
    mockVerificationCodes[email] = {
      code: verificationCode,
      expires: Date.now() + 10 * 60 * 1000
    };

    // Try to send email verification code
    try {
      await sendVerificationEmail(email, verificationCode);
      console.log(`📧 Verification email resent to ${email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      console.log(`📧 Verification code for ${email}: ${verificationCode}`);
    }

    // Log resend code activity
    await ActivityLog.logActivity(
      user._id,
      'user_action',
      `Verification code resent for: ${email}`,
      { email, action: 'resend_verification_code' },
      req
    );

    console.log(`📧 New verification code for ${email}: ${verificationCode}`);

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password for authenticated user
// @access  Private
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Get user with password (req.user is set by protect middleware)
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    // Log password change activity
    await ActivityLog.logActivity(
      user._id,
      'password_changed',
      `Password changed for user: ${user.email}`,
      { email: user.email, role: user.role },
      req
    );
    
    console.log(`🔑 Password changed successfully for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset code
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset code has been sent.' 
      });
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    
    // Update user with reset code
    user.verificationCode = resetCode;
    user.verificationCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();
    
    // Store in mock codes for development mode
    mockVerificationCodes[email] = {
      code: resetCode,
      expires: Date.now() + 15 * 60 * 1000,
      type: 'password_reset'
    };

    // Try to send password reset email
    const { sendPasswordResetEmail } = require('../utils/email');
    try {
      await sendPasswordResetEmail(email, resetCode);
      console.log(`📧 Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      console.log(`📧 Password reset code for ${email}: ${resetCode}`);
    }

    // Log password reset request
    await ActivityLog.logActivity(
      user._id,
      'password_reset_requested',
      `Password reset requested for: ${email}`,
      { email },
      req
    );

    console.log(`🔑 Password reset code for ${email}: ${resetCode}`);

    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset code has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with code
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, code, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Development mode: accept any 6-digit code
    const isValidCode = process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code);
    const storedCode = mockVerificationCodes[email];
    const isStoredCodeValid = storedCode && 
                              storedCode.code === code && 
                              storedCode.expires > Date.now() &&
                              storedCode.type === 'password_reset';

    // Check database code
    const isDbCodeValid = user.verificationCode === code && 
                          user.verificationCodeExpires > Date.now();

    if (!isValidCode && !isStoredCodeValid && !isDbCodeValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    if (isValidCode) {
      console.log(`🔧 Development mode: Accepting reset code ${code} for ${email}`);
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Clean up mock storage
    delete mockVerificationCodes[email];

    // Log password reset activity
    await ActivityLog.logActivity(
      user._id,
      'password_reset_completed',
      `Password reset completed for: ${email}`,
      { 
        email,
        resetMethod: isValidCode ? 'development_mode' : 'email_code'
      },
      req
    );

    console.log(`🔑 Password reset successfully for user: ${email}`);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-reset-code
// @desc    Verify reset code before allowing password reset
// @access  Public
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and code are required' 
      });
    }

    const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Development mode: accept any 6-digit code
    const isValidCode = process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code);
    const storedCode = mockVerificationCodes[email];
    const isStoredCodeValid = storedCode && 
                              storedCode.code === code && 
                              storedCode.expires > Date.now() &&
                              storedCode.type === 'password_reset';

    // Check database code
    const isDbCodeValid = user.verificationCode === code && 
                          user.verificationCodeExpires > Date.now();

    if (!isValidCode && !isStoredCodeValid && !isDbCodeValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;