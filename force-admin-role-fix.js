const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

async function forceAdminRoleFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found');
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'natnail333@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 BEFORE UPDATE:');
    console.log('Role:', user.role);
    console.log('Permissions:', user.permissions);

    // Force update the user to have admin role AND org_admin role recognition
    // We'll make the user have 'admin' role which the frontend definitely recognizes
    user.role = 'admin';
    user.permissions = [
      'manage_organization',
      'manage_users', 
      'manage_items',
      'view_reports',
      'manage_settings',
      'approve_items',
      'export_data',
      'manage_subscriptions'
    ];
    
    await user.save();

    console.log('\n📋 AFTER UPDATE:');
    console.log('Role:', user.role);
    console.log('Permissions:', user.permissions);
    console.log('\n✅ User role updated to admin');
    console.log('🔄 Please login again to see the changes');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

forceAdminRoleFix();