const mongoose = require('mongoose');
require('dotenv').config();

const Organization = require('./models/Organization');
const User = require('./models/User');

async function activateOrganizations() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get pending organizations
    const pendingOrgs = await Organization.find({ isActive: false });
    
    console.log(`📊 Found ${pendingOrgs.length} pending organizations\n`);

    for (const org of pendingOrgs) {
      console.log(`✅ Activating: ${org.name}`);
      
      // Activate organization
      org.isActive = true;
      org.verificationStatus = 'verified';
      org.subscription.status = 'active';
      await org.save();
      
      // Verify and activate admin user
      const admin = await User.findById(org.adminId);
      if (admin) {
        admin.isVerified = true;
        admin.status = 'active';
        await admin.save();
        console.log(`   ✅ Admin verified: ${admin.email}`);
      }
      
      console.log(`   ✅ Organization activated!\n`);
    }

    console.log('🎉 All organizations activated!');
    console.log('\n📝 You can now:');
    console.log('   1. Login with your admin email');
    console.log('   2. View your organization in the Organizations Dashboard');
    console.log('   3. Start managing your lost & found items\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateOrganizations();
