/**
 * Script to make an existing user an admin
 * Usage: node make-user-admin.js <email>
 * Example: node make-user-admin.js user@example.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const makeUserAdmin = async () => {
  try {
    // Get email from command line argument
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Please provide an email address');
      console.log('Usage: node make-user-admin.js <email>');
      console.log('Example: node make-user-admin.js user@example.com');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\nTo see all users, run:');
      console.log('  node check-users.js');
      console.log('\nTo create a new admin user:');
      console.log('  node create-admin-user.js');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Show current user info
    console.log('Found user:');
    console.log('═══════════════════════════════════════');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Current Role: ${user.role || 'user'}`);
    console.log(`Verified: ${user.isVerified ? '✅' : '❌'}`);
    console.log(`Status: ${user.status || 'active'}`);
    console.log('═══════════════════════════════════════\n');

    // Update user to admin
    user.role = 'hallAdmin'; // Use hallAdmin for full system access
    user.roleLevel = 3;
    user.isVerified = true;
    user.status = 'active';
    await user.save();

    console.log('✅ User updated successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`New Role: ${user.role}`);
    console.log(`Role Level: ${user.roleLevel}`);
    console.log(`Verified: ${user.isVerified ? '✅' : '❌'}`);
    console.log(`Status: ${user.status}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🎉 You can now login as admin with this account!');
    console.log(`   Email: ${user.email}`);
    console.log('   Password: (use the password you set when creating this account)');
    console.log('\nTo test login, run:');
    console.log(`   node test-login.js ${user.email} <your-password>`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

makeUserAdmin();
