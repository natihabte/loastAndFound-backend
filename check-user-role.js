const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

async function checkUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found');
    console.log('✅ Connected to MongoDB');

    // Find the organization admin user
    const user = await User.findOne({ email: 'natnail333@gmail.com' }).populate('organization');
    
    if (!user) {
      console.log('❌ User not found with email: natnail333@gmail.com');
      return;
    }

    console.log('\n📋 USER DETAILS:');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Is Verified:', user.isVerified);
    console.log('Organization ID:', user.organization?._id);
    console.log('Organization Name:', user.organization?.name);
    console.log('Permissions:', user.permissions);

    console.log('\n🔍 ROLE ANALYSIS:');
    console.log('Role type:', typeof user.role);
    console.log('Role value:', JSON.stringify(user.role));
    console.log('Is org_admin?', user.role === 'org_admin');
    console.log('Is admin?', user.role === 'admin');

    // Check what the login response would look like
    console.log('\n📤 LOGIN RESPONSE WOULD BE:');
    const loginResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization?._id,
      organizationName: user.organization?.name
    };
    console.log(JSON.stringify(loginResponse, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUserRole();