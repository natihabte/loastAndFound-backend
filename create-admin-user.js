/**
 * Script to create an admin user in the database
 * Usage: node create-admin-user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin user details
    const adminData = {
      name: 'Platform Administrator',
      email: 'admin@platform.com',
      password: 'admin123', // Change this to a secure password
      role: 'hallAdmin', // Use hallAdmin for full system access
      roleLevel: 3,
      isVerified: true,
      status: 'active'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminData.email);
      console.log('User details:', {
        id: existingAdmin._id,
        name: existingAdmin.name,
        email: existingAdmin.email,
        role: existingAdmin.role,
        isVerified: existingAdmin.isVerified
      });
      
      // Update password if needed
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Do you want to reset the password? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          existingAdmin.password = adminData.password;
          await existingAdmin.save();
          console.log('✅ Password updated successfully');
        }
        readline.close();
        await mongoose.connection.close();
        process.exit(0);
      });
      return;
    }

    // Create new admin user
    console.log('Creating admin user...');
    const admin = await User.create(adminData);
    
    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email:', admin.email);
    console.log('Password:', adminData.password);
    console.log('Role:', admin.role);
    console.log('Role Level:', admin.roleLevel);
    console.log('Verified:', admin.isVerified);
    console.log('Status:', admin.status);
    console.log('ID:', admin._id);
    console.log('-----------------------------------');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('\n🔍 Testing login credentials...');
    
    // Test password comparison
    const testUser = await User.findById(admin._id).select('+password');
    const passwordMatch = await testUser.comparePassword(adminData.password);
    
    if (passwordMatch) {
      console.log('✅ Password verification successful - you can login with these credentials');
    } else {
      console.log('❌ Password verification failed - there may be an issue');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdminUser();
