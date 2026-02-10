const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./models/Organization');
const User = require('./models/User');

async function debugOrganizationVisibility() {
  try {
    console.log('🔍 DEBUGGING ORGANIZATION VISIBILITY ISSUE');
    console.log('=' .repeat(60));
    
    // 1. Check all organizations in database
    console.log('\n1. ALL ORGANIZATIONS IN DATABASE:');
    const allOrgs = await Organization.find({}).populate('adminId', 'name email role');
    
    if (allOrgs.length === 0) {
      console.log('❌ NO ORGANIZATIONS FOUND IN DATABASE!');
      console.log('   This means organizations are not being saved properly.');
      return;
    }
    
    allOrgs.forEach((org, index) => {
      console.log(`\n   ${index + 1}. ${org.name}`);
      console.log(`      ID: ${org._id}`);
      console.log(`      Organization ID: ${org.organizationId}`);
      console.log(`      Type: ${org.type}`);
      console.log(`      Status: ${org.isActive ? 'Active' : 'Inactive'}`);
      console.log(`      Verification: ${org.verificationStatus || 'Not set'}`);
      console.log(`      Admin: ${org.adminId ? org.adminId.name + ' (' + org.adminId.email + ')' : 'No admin assigned'}`);
      console.log(`      Created: ${org.createdAt}`);
    });
    
    // 2. Check organizations by status
    console.log('\n2. ORGANIZATIONS BY STATUS:');
    const activeOrgs = await Organization.find({ isActive: true });
    const inactiveOrgs = await Organization.find({ isActive: false });
    const pendingOrgs = await Organization.find({ verificationStatus: 'pending' });
    const verifiedOrgs = await Organization.find({ verificationStatus: 'verified' });
    
    console.log(`   ✅ Active: ${activeOrgs.length}`);
    console.log(`   ❌ Inactive: ${inactiveOrgs.length}`);
    console.log(`   ⏳ Pending Verification: ${pendingOrgs.length}`);
    console.log(`   ✅ Verified: ${verifiedOrgs.length}`);
    
    // 3. Check admin users
    console.log('\n3. ADMIN USERS:');
    const adminUsers = await User.find({ 
      role: { $in: ['hallAdmin', 'orgAdmin', 'admin'] } 
    }).populate('organization', 'name');
    
    adminUsers.forEach((user, index) => {
      console.log(`\n   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Organization: ${user.organization ? user.organization.name : 'None'}`);
      console.log(`      Active: ${user.isActive ? 'Yes' : 'No'}`);
    });
    
    // 4. Check for specific organizations mentioned by user
    console.log('\n4. CHECKING SPECIFIC ORGANIZATIONS (HP, Bunna Bank, Abay Bank):');
    const specificOrgs = ['hp', 'bunna bank', 'abay bank'];
    
    for (const orgName of specificOrgs) {
      const org = await Organization.findOne({ 
        name: { $regex: new RegExp(orgName, 'i') } 
      });
      
      if (org) {
        console.log(`   ✅ Found: ${org.name}`);
        console.log(`      Status: ${org.isActive ? 'Active' : 'Inactive'}`);
        console.log(`      Verification: ${org.verificationStatus || 'Not set'}`);
      } else {
        console.log(`   ❌ Not Found: ${orgName}`);
      }
    }
    
    // 5. Provide recommendations
    console.log('\n5. RECOMMENDATIONS:');
    
    if (inactiveOrgs.length > 0) {
      console.log('   ⚠️  Some organizations are INACTIVE - they won\'t show in normal views');
      console.log('      Solution: Activate them or check why they\'re inactive');
    }
    
    if (pendingOrgs.length > 0) {
      console.log('   ⚠️  Some organizations are PENDING verification');
      console.log('      Solution: Verify them through admin panel or manually update status');
    }
    
    if (allOrgs.length > 0 && activeOrgs.length === 0) {
      console.log('   ❌ ALL organizations are inactive!');
      console.log('      Solution: Activate organizations by setting isActive: true');
    }
    
    console.log('\n6. QUICK FIXES:');
    console.log('   To activate all organizations:');
    console.log('   > In MongoDB: db.organizations.updateMany({}, {$set: {isActive: true, verificationStatus: "verified"}})');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugOrganizationVisibility();