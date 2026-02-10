const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Organization = require('./models/Organization');

async function checkUserOrganization() {
  try {
    console.log('🔍 Checking User-Organization Relationships...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/findit';
    console.log('🔗 Connecting to MongoDB...');
    console.log('📡 URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check all organizations
    console.log('📊 Step 1: All Organizations in Database');
    console.log('═══════════════════════════════════════');
    
    const allOrgs = await Organization.find({}).populate('adminId', 'name email role');
    console.log(`Found ${allOrgs.length} organizations:\n`);
    
    allOrgs.forEach((org, index) => {
      console.log(`${index + 1}. 🏢 ${org.name}`);
      console.log(`   ID: ${org.organizationId}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Status: ${org.isActive ? '✅ Active' : '⏳ Inactive'}`);
      console.log(`   Verification: ${org.verificationStatus}`);
      console.log(`   Email: ${org.contact?.email}`);
      console.log(`   Created: ${new Date(org.createdAt || org.registrationDate).toLocaleString()}`);
      
      if (org.adminId) {
        console.log(`   Admin: ${org.adminId.name} (${org.adminId.email}) - Role: ${org.adminId.role}`);
      } else {
        console.log(`   Admin: ❌ No admin linked`);
      }
      console.log('');
    });

    // 2. Check all admin users
    console.log('👥 Step 2: All Admin Users in Database');
    console.log('═══════════════════════════════════════');
    
    const adminUsers = await User.find({ 
      role: { $in: ['hallAdmin', 'orgAdmin'] } 
    }).populate('organization', 'name organizationId');
    
    console.log(`Found ${adminUsers.length} admin users:\n`);
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role} (Level: ${user.roleLevel})`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Verified: ${user.isVerified ? '✅ Yes' : '❌ No'}`);
      
      if (user.organization) {
        console.log(`   Organization: ${user.organization.name} (${user.organization.organizationId})`);
      } else {
        console.log(`   Organization: ❌ None assigned`);
      }
      console.log('');
    });

    // 3. Test API access for each admin user
    console.log('🧪 Step 3: Testing API Access for Admin Users');
    console.log('═══════════════════════════════════════');
    
    for (const user of adminUsers) {
      console.log(`\n🔐 Testing access for ${user.name} (${user.role}):`);
      
      // Simulate what the API would return for this user
      let query = {};
      
      if (user.role === 'orgAdmin') {
        query._id = user.organization?._id;
        console.log(`   Query (Org Admin): Find organization with ID ${user.organization?._id}`);
      } else if (user.role === 'hallAdmin') {
        console.log(`   Query (Hall Admin): Find all organizations`);
      }
      
      const accessibleOrgs = await Organization.find(query).populate('adminId', 'name email');
      console.log(`   Result: ${accessibleOrgs.length} organizations accessible`);
      
      accessibleOrgs.forEach(org => {
        console.log(`     - ${org.name} (${org.organizationId})`);
      });
      
      if (accessibleOrgs.length === 0 && user.role === 'orgAdmin') {
        console.log(`   ⚠️  WARNING: Org Admin ${user.name} cannot access any organizations!`);
        console.log(`   This means their organization reference is broken or missing.`);
      }
    }

    // 4. Check for recent organizations (created in last 24 hours)
    console.log('\n📅 Step 4: Recent Organizations (Last 24 Hours)');
    console.log('═══════════════════════════════════════');
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrgs = await Organization.find({
      $or: [
        { createdAt: { $gte: yesterday } },
        { registrationDate: { $gte: yesterday } }
      ]
    }).populate('adminId', 'name email');
    
    console.log(`Found ${recentOrgs.length} organizations created in the last 24 hours:\n`);
    
    recentOrgs.forEach((org, index) => {
      console.log(`${index + 1}. 🆕 ${org.name}`);
      console.log(`   Created: ${new Date(org.createdAt || org.registrationDate).toLocaleString()}`);
      console.log(`   Status: ${org.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Admin: ${org.adminId?.name || 'No admin'} (${org.adminId?.email || 'No email'})`);
      console.log('');
    });

    // 5. Identify issues and provide solutions
    console.log('🔧 Step 5: Issue Analysis & Solutions');
    console.log('═══════════════════════════════════════');
    
    const issues = [];
    const solutions = [];
    
    // Check for organizations without admins
    const orgsWithoutAdmins = allOrgs.filter(org => !org.adminId);
    if (orgsWithoutAdmins.length > 0) {
      issues.push(`${orgsWithoutAdmins.length} organizations have no admin assigned`);
      solutions.push('Run fix script to assign admins to organizations');
    }
    
    // Check for admins without organizations
    const adminsWithoutOrgs = adminUsers.filter(user => user.role === 'orgAdmin' && !user.organization);
    if (adminsWithoutOrgs.length > 0) {
      issues.push(`${adminsWithoutOrgs.length} organization admins have no organization assigned`);
      solutions.push('Run fix script to assign organizations to admins');
    }
    
    // Check for inactive organizations
    const inactiveOrgs = allOrgs.filter(org => !org.isActive);
    if (inactiveOrgs.length > 0) {
      issues.push(`${inactiveOrgs.length} organizations are inactive`);
      solutions.push('Activate organizations or verify email addresses');
    }
    
    // Check for unverified admins
    const unverifiedAdmins = adminUsers.filter(user => !user.isVerified);
    if (unverifiedAdmins.length > 0) {
      issues.push(`${unverifiedAdmins.length} admin users are not verified`);
      solutions.push('Verify admin email addresses');
    }
    
    if (issues.length === 0) {
      console.log('✅ No issues found! All organizations and admins are properly configured.');
    } else {
      console.log('❌ Issues Found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 Recommended Solutions:');
      solutions.forEach((solution, index) => {
        console.log(`   ${index + 1}. ${solution}`);
      });
    }

    // 6. Provide specific login instructions
    console.log('\n🎯 Step 6: Login Instructions');
    console.log('═══════════════════════════════════════');
    
    console.log('To see organizations in the admin panel, login with these credentials:\n');
    
    const verifiedAdmins = adminUsers.filter(user => user.isVerified && user.status === 'active');
    
    if (verifiedAdmins.length === 0) {
      console.log('❌ No verified admin users found!');
      console.log('Run: node backend/fix-verification-issue.js');
    } else {
      verifiedAdmins.forEach((user, index) => {
        console.log(`${index + 1}. 👤 ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        
        if (user.role === 'hallAdmin') {
          console.log(`   Access: Can see all ${allOrgs.length} organizations`);
          console.log(`   Password: admin123 (if this is the system admin)`);
        } else if (user.role === 'orgAdmin') {
          const orgCount = user.organization ? 1 : 0;
          console.log(`   Access: Can see ${orgCount} organization (their own)`);
          console.log(`   Organization: ${user.organization?.name || 'None assigned'}`);
        }
        console.log('');
      });
    }

    console.log('🚀 NEXT STEPS:');
    console.log('1. Login with one of the verified admin accounts above');
    console.log('2. Go to Admin Dashboard → Manage Organizations');
    console.log('3. You should see the organizations listed');
    console.log('4. If still not visible, check browser console for errors');

  } catch (error) {
    console.error('❌ Error checking user-organization relationships:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
if (require.main === module) {
  checkUserOrganization();
}

module.exports = checkUserOrganization;