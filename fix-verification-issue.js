const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Organization = require('./models/Organization');

async function fixVerificationIssue() {
  try {
    console.log('🔧 Fixing Email Verification Issue...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/findit';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check for organizations with pending verification
    console.log('📋 Step 1: Checking organizations with pending verification...');
    const pendingOrgs = await Organization.find({ 
      verificationStatus: 'pending',
      isActive: false 
    }).populate('adminId', 'name email isVerified status');

    console.log(`Found ${pendingOrgs.length} organizations with pending verification:`);
    
    for (const org of pendingOrgs) {
      console.log(`\n🏢 Organization: ${org.name}`);
      console.log(`   ID: ${org.organizationId}`);
      console.log(`   Email: ${org.contact.email}`);
      console.log(`   Status: ${org.verificationStatus}`);
      console.log(`   Active: ${org.isActive}`);
      
      if (org.adminId) {
        console.log(`   Admin: ${org.adminId.name} (${org.adminId.email})`);
        console.log(`   Admin Verified: ${org.adminId.isVerified}`);
        console.log(`   Admin Status: ${org.adminId.status}`);
      } else {
        console.log('   ❌ No admin user linked!');
      }
    }

    // 2. Check for orphaned admin users (users without proper organization link)
    console.log('\n👥 Step 2: Checking for orphaned admin users...');
    const orphanedAdmins = await User.find({ 
      role: 'orgAdmin',
      $or: [
        { organization: { $exists: false } },
        { organization: null }
      ]
    });

    console.log(`Found ${orphanedAdmins.length} orphaned admin users:`);
    for (const admin of orphanedAdmins) {
      console.log(`   - ${admin.name} (${admin.email}) - Status: ${admin.status}`);
    }

    // 3. Fix the most recent organization (hp)
    console.log('\n🔧 Step 3: Fixing the most recent organization...');
    const recentOrg = await Organization.findOne({ name: 'hp' });
    
    if (recentOrg) {
      console.log(`Found recent organization: ${recentOrg.name}`);
      
      // Check if there's an admin user for this organization
      let adminUser = await User.findOne({ email: 'yab12@gmail.com' });
      
      if (!adminUser) {
        console.log('❌ Admin user not found, creating one...');
        
        // Create the missing admin user
        adminUser = await User.create({
          name: 'yab',
          email: 'yab12@gmail.com',
          password: 'defaultPassword123!', // User should change this
          organization: recentOrg._id,
          role: 'orgAdmin',
          roleLevel: 2,
          permissions: User.getRolePermissions('orgAdmin'),
          status: 'pending',
          isVerified: false,
          preferences: {
            language: 'en',
            timezone: 'Africa/Addis_Ababa'
          }
        });
        
        console.log('✅ Admin user created');
      } else {
        console.log('✅ Admin user found, updating organization link...');
        adminUser.organization = recentOrg._id;
        await adminUser.save();
      }
      
      // Update organization with admin reference
      recentOrg.adminId = adminUser._id;
      await recentOrg.save();
      
      console.log('✅ Organization-Admin link updated');
      
      // 4. Generate verification token for the admin
      console.log('\n🔑 Step 4: Generating verification token...');
      
      const verificationToken = jwt.sign(
        { 
          userId: adminUser._id, 
          organizationId: recentOrg._id,
          type: 'email_verification'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('✅ Verification token generated');
      
      // 5. Create verification link
      const verificationLink = `http://localhost:3000/organization-verification?token=${verificationToken}`;
      
      console.log('\n🔗 Step 5: Verification link created:');
      console.log(`${verificationLink}`);
      
      // 6. Manual verification option
      console.log('\n⚡ Step 6: Manual verification option...');
      console.log('Would you like to manually verify this organization? (y/n)');
      
      // For now, let's auto-verify for testing
      console.log('Auto-verifying for testing purposes...');
      
      adminUser.isVerified = true;
      adminUser.status = 'active';
      await adminUser.save();
      
      recentOrg.verificationStatus = 'verified';
      recentOrg.isActive = true;
      await recentOrg.save();
      
      console.log('✅ Organization and admin manually verified');
    }

    // 7. Summary
    console.log('\n📊 VERIFICATION FIX SUMMARY:');
    console.log('═══════════════════════════════════════');
    
    const allOrgs = await Organization.find({}).populate('adminId', 'name email isVerified');
    console.log(`\nTotal organizations: ${allOrgs.length}`);
    
    for (const org of allOrgs) {
      const status = org.isActive ? '✅ Active' : '⏳ Pending';
      const verification = org.verificationStatus === 'verified' ? '✅ Verified' : '⏳ Pending';
      const adminStatus = org.adminId ? 
        (org.adminId.isVerified ? '✅ Verified' : '⏳ Pending') : 
        '❌ No Admin';
      
      console.log(`\n🏢 ${org.name}:`);
      console.log(`   Organization: ${status}`);
      console.log(`   Verification: ${verification}`);
      console.log(`   Admin: ${adminStatus}`);
      
      if (org.adminId) {
        console.log(`   Admin Email: ${org.adminId.email}`);
        
        // Generate fresh verification link for pending admins
        if (!org.adminId.isVerified) {
          const token = jwt.sign(
            { userId: org.adminId._id, organizationId: org._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
          const link = `http://localhost:3000/organization-verification?token=${token}`;
          console.log(`   Verification Link: ${link}`);
        }
      }
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Use the verification links above to verify pending organizations');
    console.log('2. Or access the verification page directly with the token');
    console.log('3. Test the verification process in your application');
    console.log('4. Check that verified admins can login successfully');

  } catch (error) {
    console.error('❌ Error fixing verification issue:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixVerificationIssue();
}

module.exports = fixVerificationIssue;