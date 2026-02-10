const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
const ActivityLog = require('./models/ActivityLog');

// Load environment variables
require('dotenv').config();

const demoAdminControl = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🎯 ADMIN ORGANIZATION CONTROL DEMONSTRATION');
    console.log('=' .repeat(60));

    // 1. Show all organizations (admin view)
    console.log('\n📊 1. ADMIN VIEW: All Organizations in System');
    console.log('-'.repeat(50));
    
    const organizations = await Organization.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    if (organizations.length === 0) {
      console.log('❌ No organizations found in system');
      return;
    }

    organizations.forEach((org, index) => {
      console.log(`\n${index + 1}. 🏢 ${org.name}`);
      console.log(`   📋 ID: ${org.organizationId}`);
      console.log(`   📧 Email: ${org.contact.email}`);
      console.log(`   📱 Phone: ${org.contact.phone}`);
      console.log(`   🏷️  Type: ${org.type}`);
      console.log(`   📍 Level: ${org.sectorLevel}`);
      console.log(`   ✅ Status: ${org.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   🔍 Verification: ${org.verificationStatus}`);
      console.log(`   👤 Admin: ${org.createdBy?.name} (${org.createdBy?.email})`);
      console.log(`   📅 Registered: ${org.createdAt.toLocaleDateString()}`);
      console.log(`   💳 Plan: ${org.subscription.plan} (${org.subscription.status})`);
    });

    // 2. Show admin control capabilities
    console.log('\n\n🛠️  2. ADMIN CONTROL CAPABILITIES');
    console.log('-'.repeat(50));
    
    console.log('✅ ORGANIZATION APPROVAL CONTROL:');
    console.log('   • View all pending registrations');
    console.log('   • Approve legitimate organizations');
    console.log('   • Reject invalid applications');
    console.log('   • Send approval/rejection notifications');

    console.log('\n✅ ORGANIZATION STATUS MANAGEMENT:');
    console.log('   • Activate approved organizations');
    console.log('   • Suspend problematic organizations');
    console.log('   • Reactivate suspended organizations');
    console.log('   • Permanently deactivate if needed');

    console.log('\n✅ MONITORING & OVERSIGHT:');
    console.log('   • Track organization statistics');
    console.log('   • Monitor user activity within orgs');
    console.log('   • Review subscription usage');
    console.log('   • Audit compliance and security');

    // 3. Show specific organization details (admin perspective)
    const targetOrg = organizations.find(org => org.name.toLowerCase().includes('abay'));
    if (targetOrg) {
      console.log('\n\n🔍 3. DETAILED ORGANIZATION VIEW (Admin Perspective)');
      console.log('-'.repeat(50));
      console.log(`🏢 Organization: ${targetOrg.name}`);
      console.log(`📋 Organization ID: ${targetOrg.organizationId}`);
      console.log(`🏷️  Type: ${targetOrg.type} (${targetOrg.sectorLevel} level)`);
      console.log(`📧 Official Email: ${targetOrg.contact.email}`);
      console.log(`📱 Phone: ${targetOrg.contact.phone}`);
      
      if (targetOrg.contact.address) {
        console.log(`📍 Address: ${targetOrg.contact.address.street}, ${targetOrg.contact.address.city}`);
      }

      console.log(`\n👤 ADMINISTRATOR ACCOUNT:`);
      console.log(`   Name: ${targetOrg.createdBy?.name}`);
      console.log(`   Email: ${targetOrg.createdBy?.email}`);
      console.log(`   Role: Organization Admin`);

      console.log(`\n📊 ORGANIZATION STATUS:`);
      console.log(`   Active: ${targetOrg.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Verification: ${targetOrg.verificationStatus}`);
      console.log(`   Registration Date: ${targetOrg.createdAt.toLocaleDateString()}`);
      if (targetOrg.approvalDate) {
        console.log(`   Approval Date: ${targetOrg.approvalDate.toLocaleDateString()}`);
      }

      console.log(`\n💳 SUBSCRIPTION DETAILS:`);
      console.log(`   Plan: ${targetOrg.subscription.plan}`);
      console.log(`   Status: ${targetOrg.subscription.status}`);
      console.log(`   Max Users: ${targetOrg.subscription.maxUsers}`);
      console.log(`   Max Items: ${targetOrg.subscription.maxItems}`);
      if (targetOrg.subscription.endDate) {
        const daysRemaining = Math.ceil((targetOrg.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`   Trial Days Remaining: ${daysRemaining > 0 ? daysRemaining : 'Expired'}`);
      }

      // Get user count for this organization
      const userCount = await User.countDocuments({ organization: targetOrg._id });
      console.log(`\n👥 USAGE STATISTICS:`);
      console.log(`   Total Users: ${userCount}/${targetOrg.subscription.maxUsers}`);
      console.log(`   Usage: ${((userCount / targetOrg.subscription.maxUsers) * 100).toFixed(1)}%`);
    }

    // 4. Show admin actions available
    console.log('\n\n⚡ 4. ADMIN ACTIONS AVAILABLE');
    console.log('-'.repeat(50));
    
    console.log('🎯 FOR PENDING ORGANIZATIONS:');
    console.log('   • ✅ Approve Organization');
    console.log('   • ❌ Reject Application');
    console.log('   • 📝 Request More Information');
    console.log('   • 📧 Contact Organization Admin');

    console.log('\n🎯 FOR ACTIVE ORGANIZATIONS:');
    console.log('   • 📊 View Detailed Statistics');
    console.log('   • 👥 Manage Organization Users');
    console.log('   • ⏸️  Suspend Organization');
    console.log('   • 🔧 Modify Settings');
    console.log('   • 📈 Upgrade/Downgrade Plan');

    console.log('\n🎯 FOR SUSPENDED ORGANIZATIONS:');
    console.log('   • ▶️  Reactivate Organization');
    console.log('   • 🗑️  Permanently Delete');
    console.log('   • 📋 Review Suspension Reason');
    console.log('   • 📞 Contact for Resolution');

    // 5. Show recent admin activities
    console.log('\n\n📋 5. RECENT ADMIN ACTIVITIES');
    console.log('-'.repeat(50));
    
    const recentActivities = await ActivityLog.find({
      action: { $in: ['organization_created', 'user_verified', 'organization_activated'] }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    if (recentActivities.length > 0) {
      recentActivities.forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.action.replace(/_/g, ' ').toUpperCase()}`);
        console.log(`   👤 User: ${activity.user?.name} (${activity.user?.email})`);
        console.log(`   📝 Description: ${activity.description}`);
        console.log(`   📅 Date: ${activity.createdAt.toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No recent activities found');
    }

    // 6. Show admin dashboard summary
    console.log('\n📊 6. ADMIN DASHBOARD SUMMARY');
    console.log('-'.repeat(50));
    
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter(org => org.isActive).length;
    const pendingOrgs = organizations.filter(org => org.verificationStatus === 'pending').length;
    const inactiveOrgs = totalOrgs - activeOrgs;

    console.log(`📈 ORGANIZATION STATISTICS:`);
    console.log(`   Total Organizations: ${totalOrgs}`);
    console.log(`   Active Organizations: ${activeOrgs}`);
    console.log(`   Pending Approval: ${pendingOrgs}`);
    console.log(`   Inactive/Suspended: ${inactiveOrgs}`);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    
    console.log(`\n👥 USER STATISTICS:`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Average Users per Org: ${(totalUsers / totalOrgs).toFixed(1)}`);

    console.log('\n🎉 ADMIN CONTROL DEMONSTRATION COMPLETE!');
    console.log('=' .repeat(60));
    console.log('✅ Admins have FULL CONTROL over all organizations');
    console.log('✅ Can approve, suspend, monitor, and manage all aspects');
    console.log('✅ Complete visibility into organization activities');
    console.log('✅ Comprehensive tools for platform management');

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

demoAdminControl();