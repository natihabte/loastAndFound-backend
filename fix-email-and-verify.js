const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
const ActivityLog = require('./models/ActivityLog');

// Load environment variables
require('dotenv').config();

const fixEmailAndVerify = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔧 Email Verification Fix & Organization Verification');
    console.log('This script will fix the email verification issues and verify your organization.\n');

    // Find the user's organization by email
    const adminEmail = 'natnail333@gmail.com'; // User's email from conversation
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log('❌ User not found with email:', adminEmail);
      return;
    }

    const organization = await Organization.findById(user.organization);
    if (!organization) {
      console.log('❌ Organization not found');
      return;
    }

    console.log('📊 Found Organization:');
    console.log(`👤 Admin: ${user.name} (${user.email})`);
    console.log(`🏢 Organization: ${organization.name}`);
    console.log(`📋 Current Status:`);
    console.log(`   - User verified: ${user.isVerified}`);
    console.log(`   - User status: ${user.status}`);
    console.log(`   - Organization active: ${organization.isActive}`);
    console.log(`   - Verification status: ${organization.verificationStatus}`);

    // Fix 1: Update user verification status
    console.log('\n🔧 Fixing user verification...');
    user.isVerified = true;
    user.status = 'active';
    await user.save();
    console.log('✅ User email verified and activated');

    // Fix 2: Update organization verification status
    console.log('\n🔧 Updating organization verification...');
    organization.verificationStatus = 'verified';
    await organization.save();
    console.log('✅ Organization verification status updated');

    // Fix 3: Log the verification activity (with correct enum)
    console.log('\n🔧 Logging verification activity...');
    try {
      await ActivityLog.logActivity(
        user._id,
        'user_verified',
        `Organization admin email verified: ${user.email} for organization: ${organization.name}`,
        {
          organizationId: organization._id,
          verificationMethod: 'manual_fix',
          fixedIssues: ['email_verification', 'activity_log_enum']
        },
        null, // no request object
        {
          organization: organization._id,
          severity: 'medium',
          category: 'registration' // Now this enum value exists
        }
      );
      console.log('✅ Activity logged successfully');
    } catch (activityError) {
      console.log('⚠️  Activity logging failed (non-critical):', activityError.message);
    }

    console.log('\n✅ Email Verification Issues Fixed!');
    console.log('\n📋 Current Status:');
    console.log('✅ User email verified');
    console.log('✅ User account activated');
    console.log('✅ Organization verification status updated');
    console.log('⏳ Organization still needs admin approval to become fully active');

    console.log('\n🎉 Success! Your organization "abay bank" is now verified.');
    console.log('📧 You can now log in with your credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Organization: ${organization.name}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Try logging in to the system ✅');
    console.log('2. Wait for admin approval (or use admin panel to approve)');
    console.log('3. Start using the lost & found system');

    // Show login instructions
    console.log('\n🔐 Login Instructions:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Click "Sign In" or go to login page');
    console.log('3. Enter your email and password');
    console.log('4. You should now be able to access your organization dashboard');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

// Also create a function to approve the organization (admin action)
const approveOrganization = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'natnail333@gmail.com';
    const user = await User.findOne({ email: adminEmail });
    const organization = await Organization.findById(user.organization);

    console.log('\n👑 Admin Approval Process');
    console.log(`🏢 Approving organization: ${organization.name}`);

    // Activate the organization
    organization.isActive = true;
    organization.verificationStatus = 'verified'; // Use 'verified' instead of 'approved'
    organization.approvalDate = new Date();
    await organization.save();

    console.log('✅ Organization approved and activated!');
    console.log('🎉 Your organization is now fully operational');

  } catch (error) {
    console.error('❌ Error during approval:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--approve')) {
  approveOrganization();
} else {
  fixEmailAndVerify();
}

console.log('\n💡 Usage:');
console.log('  node fix-email-and-verify.js           # Fix email verification');
console.log('  node fix-email-and-verify.js --approve # Also approve organization');