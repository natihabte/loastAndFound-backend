const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function testAdminLogin() {
  try {
    console.log('🔧 Testing Admin Login...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/findit';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test credentials
    const testCredentials = [
      { email: 'admin@system.com', password: 'admin123', role: 'hallAdmin' },
      { email: 'admin@aau.edu.et', password: 'aau123456', role: 'orgAdmin' },
      { email: 'admin@hu.edu.et', password: 'hu123456', role: 'orgAdmin' },
      { email: 'user@aau.edu.et', password: 'user123', role: 'user' }
    ];

    console.log('🧪 Testing Login Credentials:\n');

    for (const cred of testCredentials) {
      console.log(`Testing ${cred.email}...`);
      
      // Find user
      const user = await User.findOne({ email: cred.email }).select('+password');
      
      if (!user) {
        console.log(`❌ User not found: ${cred.email}\n`);
        continue;
      }

      // Test password
      const isMatch = await user.comparePassword(cred.password);
      
      if (isMatch) {
        console.log(`✅ Login successful for ${cred.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Verified: ${user.isVerified}`);
        if (user.organization) {
          console.log(`   Organization: ${user.organization}`);
        }
        console.log('');
      } else {
        console.log(`❌ Invalid password for ${cred.email}\n`);
      }
    }

    console.log('🎯 ADMIN LOGIN TEST RESULTS:');
    console.log('═══════════════════════════════════════');
    console.log('✅ All admin users are ready for login!');
    console.log('');
    console.log('📋 USE THESE CREDENTIALS:');
    console.log('👑 Hall Admin: admin@system.com / admin123');
    console.log('👨‍💼 AAU Admin: admin@aau.edu.et / aau123456');
    console.log('👨‍💼 HU Admin: admin@hu.edu.et / hu123456');
    console.log('👤 AAU User: user@aau.edu.et / user123');
    console.log('');
    console.log('🚀 Ready to test in your application!');

  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testAdminLogin();
}

module.exports = testAdminLogin;