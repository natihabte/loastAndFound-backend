const nodemailer = require('nodemailer');

let currentTransporter = null;

// Create transporter using Google OAuth2 or App Password
const createTransporter = async () => {
  try {
    if (!currentTransporter) {
      const hasOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;
      
      if (hasOAuth) {
        currentTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN
          }
        });
      } else {
        currentTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      }
    }
    return currentTransporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    throw error;
  }
};

const getSenderEmail = () => {
  return process.env.EMAIL_USER || 'noreply@lostandfound.com';
};

// Send verification email
exports.sendVerificationEmail = async (email, code) => {
  try {
    const transporter = await createTransporter();
    const senderEmail = getSenderEmail();

    const mailOptions = {
      from: `Public Sector Lost & Found <${senderEmail}>`,
      to: email,
      subject: 'Email Verification - Public Sector Lost & Found Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Public Sector Lost & Found Platform!</h2>
          <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Public Sector Lost & Found Management SaaS Platform</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
};

// Send organization verification email
exports.sendOrganizationVerificationEmail = async (email, token, organizationName) => {
  try {
    const transporter = await createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/organization-verification?token=${token}`;

    const mailOptions = {
      from: `Public Sector Lost & Found <${process.env.EMAIL_USER || 'noreply@lostandfound.com'}>`,
      to: email,
      subject: `Verify Your Organization - ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #2563eb; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">🏛️</span>
            </div>
            <h1 style="color: #1f2937; margin: 0;">Organization Registration</h1>
            <p style="color: #6b7280; margin: 10px 0;">Public Sector Lost & Found Management Platform</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <h2 style="color: #2563eb; margin-top: 0;">Welcome, ${organizationName}!</h2>
            <p style="color: #374151; line-height: 1.6;">
              Thank you for registering your organization with our Public Sector Lost & Found Management Platform. 
              To complete your registration, please verify your email address by clicking the button below.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⏰ Next Steps:</h3>
            <ol style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Click the verification link above</li>
              <li>Wait for organization approval (24-48 hours)</li>
              <li>Complete your organization setup</li>
              <li>Start your 14-day free trial</li>
            </ol>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> This verification link will expire in 24 hours. 
              If you didn't register for this service, please ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Public Sector Lost & Found Management SaaS Platform<br>
              Serving Universities, Government, Healthcare & Municipal Organizations
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Organization verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Organization verification email error:', error);
    throw error;
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, code) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `Public Sector Lost & Found <${process.env.EMAIL_USER || 'noreply@lostandfound.com'}>`,
      to: email,
      subject: 'Password Reset Request - Public Sector Lost & Found',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #dc2626; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">🔒</span>
            </div>
            <h1 style="color: #1f2937; margin: 0;">Password Reset Request</h1>
            <p style="color: #6b7280; margin: 10px 0;">Public Sector Lost & Found Platform</p>
          </div>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              We received a request to reset your password. Use the verification code below to reset your password:
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #dc2626; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> This code will expire in 15 minutes. 
              If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              For security reasons, never share this code with anyone. Our team will never ask for your verification code.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Public Sector Lost & Found Management SaaS Platform<br>
              Secure • Reliable • Trusted
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    throw error;
  }
};

// Send item notification email
exports.sendItemNotification = async (email, itemTitle, itemStatus) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `Public Sector Lost & Found <${process.env.EMAIL_USER || 'noreply@lostandfound.com'}>`,
      to: email,
      subject: `New ${itemStatus} Item Match - Public Sector Lost & Found`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Item Match Found!</h2>
          <p>A new item matching your interests has been posted:</p>
          <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0; color: #1f2937;">${itemTitle}</h3>
            <p style="margin: 5px 0; color: #6b7280;">Status: ${itemStatus}</p>
          </div>
          <p>Visit the platform to view more details and contact the poster.</p>
          <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Item</a>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Public Sector Lost & Found Management SaaS Platform</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL for Ethereal Email
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Item notification email sent successfully!');
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      console.log(`✅ Notification email sent to ${email}`);
    } else {
      console.log(`✅ Notification email sent to ${email}`);
    }
  } catch (error) {
    console.error('❌ Notification email error:', error);
  }
};
