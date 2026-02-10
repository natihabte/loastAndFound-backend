const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('👤 Test user already exists');
      console.log('Email:', existingUser.email);
      console.log('Name:', existingUser.name);
      console.log('Role:', existingUser.role);
      return;
    }

    // Create test user
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123', // Will be hashed automatically
      phone: '+1234567890',
      role: 'user',
      isVerified: true, // Skip verification for testing
      status: 'active'
    });

    console.log('🎉 Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('👤 Name: Test User');
    console.log('📱 Phone: +1234567890');
    console.log('');
    console.log('🧪 You can now:');
    console.log('1. Login with these credentials');
    console.log('2. Update the profile (name, email, phone)');
    console.log('3. Change the password');
    console.log('4. Logout and login again to verify changes persist');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Also create admin user if it doesn't exist
async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const existingAdmin = await User.findOne({ email: 'admin@platform.com' });
    if (existingAdmin) {
      console.log('👑 Admin user already exists');
      return;
    }

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@platform.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      status: 'active'
    });

    console.log('👑 Admin user created successfully!');
    console.log('📧 Email: admin@platform.com');
    console.log('🔑 Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  console.log('🚀 Creating test users...\n');
  
  await createTestUser();
  console.log('');
  await createAdminUser();
  
  console.log('\n✅ Setup complete!');
  console.log('\n📋 Test Instructions:');
  console.log('1. Start your backend: npm start');
  console.log('2. Start your frontend: npm start');
  console.log('3. Login as test user: test@example.com / password123');
  console.log('4. Go to User Settings and change name/password');
  console.log('5. Logout and login again to verify changes persist');
  console.log('6. Login as admin to see user activities: admin@platform.com / admin123');
}

main();