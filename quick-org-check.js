// Quick check of organizations and admin users
const mongoose = require('mongoose');
require('dotenv').config();

const Organization = require('./models/Organization');
const User = require('./models/User');

async function quickCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const orgs = await Organization.find({}).populate('adminId', 'name email role');
    const admins = await User.find({ role: { $in: ['hallAdmin', 'orgAdmin', 'admin'] } });
    
    console.log(`\n📊 Organizations: ${orgs.length}`);
    orgs.forEach((org, i) => {
      console.log(`${i+1}. ${org.name} (${org.organizationId}) - ${org.isActive ? 'Active' : 'Inactive'}`);
    });
    
    console.log(`\n👥 Admin Users: ${admins.length}`);
    admins.forEach((user, i) => {
      console.log(`${i+1}. ${user.email} - ${user.role} - ${user.isVerified ? 'Verified' : 'Unverified'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

quickCheck();