const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Organization = require('./models/Organization');

// Load environment variables
require('dotenv').config();

const generateVerificationLink = async () => {
  try {
    // Connect to MongoDB
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

    console.log('\n🔗 Generate Verification Link');
    console.log('This will generate a verification link for your organization.\n');

    const email = await askQuestion('Enter your admin email address: ');

    // Find user by email
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
    console.log(`📋 Status: User verified: ${user.isVerified}, Org active: ${organization.isActive}`);

    // Generate verification token
    const verificationToken = jwt.sign(
      { 
        userId: user._id, 
        organizationId: organization._id,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate verification URL
    const verificationUrl = `http://localhost:3000/organization-verification?token=${verificationToken}`;

    console.log('\n🔗 Verification Link Generated:');
    console.log('─'.repeat(80));
    console.log(verificationUrl);
    console.log('─'.repeat(80));

    console.log('\n📋 Instructions:');
    console.log('1. Copy the verification link above');
    console.log('2. Open it in your browser');
    console.log('3. It will verify your organization automatically');
    console.log('4. After verification, wait for admin approval');

    console.log('\n💡 Alternative: You can also use the manual verification script:');
    console.log('   node manual-verify-organization.js --email');

    rl.close();

  } catch (error) {
    console.error('❌ Error generating verification link:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

generateVerificationLink();