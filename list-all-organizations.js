const mongoose = require('mongoose');
require('dotenv').config();

const Organization = require('./models/Organization');
const User = require('./models/User');

async function listAllOrganizations() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all organizations
    const organizations = await Organization.find({})
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${organizations.length} organizations:\n`);

    organizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`);
      console.log(`   ID: ${org._id}`);
      console.log(`   Organization ID: ${org.organizationId}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Sector Level: ${org.sectorLevel}`);
      console.log(`   Status: ${org.isActive ? '✅ Active' : '⏳ Pending'}`);
      console.log(`   Email: ${org.contact?.email || 'N/A'}`);
      console.log(`   Phone: ${org.contact?.phone || 'N/A'}`);
      console.log(`   Admin: ${org.adminId?.name || 'N/A'} (${org.adminId?.email || 'N/A'})`);
      console.log(`   Created: ${org.createdAt?.toLocaleString() || 'N/A'}`);
      console.log('');
    });

    // Get all users with orgAdmin role
    const orgAdmins = await User.find({ role: 'orgAdmin' })
      .populate('organization', 'name organizationId')
      .sort({ createdAt: -1 });

    console.log(`\n👥 Found ${orgAdmins.length} organization admins:\n`);

    orgAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Organization: ${admin.organization?.name || 'N/A'}`);
      console.log(`   Verified: ${admin.isVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Status: ${admin.status}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listAllOrganizations();
