const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Organization = require('./models/Organization');

// Load environment variables
require('dotenv').config();

const manualVerifyOrganization = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/public-sector-lf');
    console.log('✅ Connected to MongoDB');

    // Get the verification token from the logs
    // You can copy this from the backend logs where it says "Verification token for [email]:"
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    console.log('\n🔐 Manual Organization Verification');
    console.log('This script will manually verify your organization using the token from the backend logs.\n');

    const token = await askQuestion('Enter the verification token from the backend logs: ');
    
    if (!token) {
      console.log('❌ No token provided');
      rl.close();
      return;
    }

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token is valid');
      console.log('📋 Token data:', {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        type: decoded.type
      });
    } catch (error) {
      console.log('❌ Invalid or expired token:', error.message);
      rl.close();
      return;
    }

    // Find the user and organization
    const user = await User.findById(decoded.userId);
    const organization = await Organization.findById(decoded.organizationId);

    if (!user) {
      console.log('❌ User not found');
      rl.close();
      return;
    }

    if (!organization) {
      console.log('❌ Organization not found');
      rl.close();
      return;
    }

    console.log('\n📊 Found:');
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`🏢 Organization: ${organization.name}`);
    console.log(`📋 Current Status: User verified: ${user.isVerified}, Org active: ${organization.isActive}`);

    // Ask for confirmation
    const confirm = await askQuestion('\nDo you want to verify this organization? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Verification cancelled');
      rl.close();
      return;
    }

    // Update user verification status
    user.isVerified = true;
    user.status = 'active';
    await user.save();

    // Update organization verification status
    organization.verificationStatus = 'verified';
    // Note: Organization remains inactive until admin approval
    await organization.save();

    console.log('\n✅ Verification completed successfully!');
    console.log('📧 User email verified: ✅');
    console.log('🏢 Organization verification status: verified');
    console.log('⏳ Organization status: Still pending admin approval');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Your email is now verified ✅');
    console.log('2. Wait for admin approval (24-48 hours)');
    console.log('3. You\'ll be notified when approved');
    console.log('4. Then you can log in and use the system');

    rl.close();

  } catch (error) {
    console.error('❌ Error during manual verification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

// Alternative: Verify by email address
const verifyByEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/public-sector-lf');
    console.log('✅ Connected to MongoDB');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    console.log('\n📧 Verify Organization by Email');
    const email = await askQuestion('Enter your admin email address: ');

    const user = await User.findOne({ email: email });
    if (!user) {
      console.log('❌ User not found with that email');
      rl.close();
      return;
    }

    const organization = await Organization.findById(user.organization);
    if (!organization) {
      console.log('❌ Organization not found');
      rl.close();
      return;
    }

    console.log(`\n📊 Found:`);
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`🏢 Organization: ${organization.name}`);
    console.log(`📋 Current Status: User verified: ${user.isVerified}, Org active: ${organization.isActive}`);

    const confirm = await askQuestion('\nVerify this organization? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Verification cancelled');
      rl.close();
      return;
    }

    // Update verification status
    user.isVerified = true;
    user.status = 'active';
    await user.save();

    organization.verificationStatus = 'verified';
    await organization.save();

    console.log('\n✅ Organization verified successfully!');
    rl.close();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--email')) {
  verifyByEmail();
} else {
  manualVerifyOrganization();
}

console.log('\n💡 Usage:');
console.log('  node manual-verify-organization.js          # Verify using token');
console.log('  node manual-verify-organization.js --email  # Verify using email');