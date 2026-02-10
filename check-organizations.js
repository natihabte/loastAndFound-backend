const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const User = require('./models/User');

// Load environment variables
require('dotenv').config({ path: __dirname + '/.env' });

const checkOrganizations = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${organizations.length} organizations:\n`);

    if (organizations.length === 0) {
      console.log('❌ No organizations found in database');
      console.log('\nPossible reasons:');
      console.log('1. Registration failed due to validation errors');
      console.log('2. Database connection issues during registration');
      console.log('3. Organizations were created in a different database');
      console.log('4. Registration form is not properly connected to backend');
    } else {
      organizations.forEach((org, index) => {
        console.log(`${index + 1}. Organization: ${org.name}`);
        console.log(`   ID: ${org.organizationId}`);
        console.log(`   Type: ${org.type}`);
        console.log(`   Status: ${org.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Verification: ${org.verificationStatus || 'pending'}`);
        console.log(`   Email: ${org.contact?.email}`);
        console.log(`   Admin: ${org.createdBy?.name} (${org.createdBy?.email})`);
        console.log(`   Created: ${org.createdAt || org.registrationDate}`);
        console.log(`   Slug: ${org.slug}`);
        console.log('   ---');
      });
    }

    // Check for users with org_admin role
    const orgAdmins = await User.find({ role: 'org_admin' }).sort({ createdAt: -1 });
    console.log(`\n👥 Found ${orgAdmins.length} organization admins:\n`);
    
    orgAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Admin: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Status: ${admin.status || 'active'}`);
      console.log(`   Verified: ${admin.isVerified ? 'Yes' : 'No'}`);
      console.log(`   Organization: ${admin.organization}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log('   ---');
    });

    // Check database connection info
    console.log(`\n🔗 Database Info:`);
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);

  } catch (error) {
    console.error('❌ Error checking organizations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkOrganizations();