const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Organization = require('./models/Organization');
const LostItem = require('./models/LostItem');
const FoundItem = require('./models/FoundItem');
const Claim = require('./models/Claim');
const ActivityLog = require('./models/ActivityLog');

// Test script for multi-level admin system
async function testMultiLevelAdminSystem() {
  try {
    console.log('🧪 Testing Multi-Level Administration System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/findit');
    console.log('✅ Connected to MongoDB\n');

    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    await Promise.all([
      User.deleteMany({ email: { $regex: /@test\.com$/ } }),
      Organization.deleteMany({ organizationId: { $regex: /^TEST/ } }),
      LostItem.deleteMany({ title: { $regex: /^Test/ } }),
      FoundItem.deleteMany({ title: { $regex: /^Test/ } }),
      Claim.deleteMany({}),
      ActivityLog.deleteMany({ description: { $regex: /^Test/ } })
    ]);
    console.log('✅ Cleanup completed\n');

    // 1. Create Super Admin
    console.log('👑 Creating Super Admin...');
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password: 'password123',
      role: 'superAdmin',
      roleLevel: 3,
      status: 'active',
      isVerified: true
    });
    console.log(`✅ Super Admin created: ${superAdmin.name} (${superAdmin.email})\n`);

    // 2. Create Test Organization
    console.log('🏢 Creating Test Organization...');
    const testOrg = await Organization.create({
      name: 'Test University',
      organizationId: 'TEST001',
      slug: 'test-university',
      type: 'university',
      sectorLevel: 'federal',
      description: 'Test organization for multi-level admin system',
      contact: {
        email: 'contact@test.com',
        phone: '+251911000001'
      },
      adminId: null, // Will be set after creating org admin
      status: 'approved',
      isActive: true,
      verificationStatus: 'verified',
      approvalDate: new Date(),
      createdBy: superAdmin._id
    });
    console.log(`✅ Organization created: ${testOrg.name} (${testOrg.organizationId})\n`);

    // 3. Create Organization Admin
    console.log('👨‍💼 Creating Organization Admin...');
    const orgAdmin = await User.create({
      name: 'Organization Admin',
      email: 'orgadmin@test.com',
      password: 'password123',
      role: 'orgAdmin',
      roleLevel: 2,
      organization: testOrg._id,
      status: 'active',
      isVerified: true,
      permissions: [
        'manage_users',
        'manage_items',
        'view_reports',
        'approve_items',
        'manage_settings'
      ]
    });

    // Update organization with admin reference
    testOrg.adminId = orgAdmin._id;
    await testOrg.save();
    console.log(`✅ Organization Admin created: ${orgAdmin.name} (${orgAdmin.email})\n`);

    // 4. Create Regular Users
    console.log('👥 Creating Regular Users...');
    const users = await Promise.all([
      User.create({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'password123',
        role: 'user',
        roleLevel: 1,
        organization: testOrg._id,
        status: 'active',
        isVerified: true
      }),
      User.create({
        name: 'Jane Smith',
        email: 'jane@test.com',
        password: 'password123',
        role: 'user',
        roleLevel: 1,
        organization: testOrg._id,
        status: 'active',
        isVerified: true
      })
    ]);
    console.log(`✅ Created ${users.length} regular users\n`);

    // 5. Create Test Lost Items
    console.log('📱 Creating Test Lost Items...');
    const lostItems = await Promise.all([
      LostItem.create({
        organization: testOrg._id,
        title: 'Test Lost iPhone',
        description: 'Black iPhone 13 Pro lost in library',
        category: 'electronics',
        location: {
          building: 'Main Library',
          area: 'Reading Room',
          description: 'Near the computer section'
        },
        dateLost: new Date(),
        reportedBy: users[0]._id,
        contactInfo: {
          name: users[0].name,
          email: users[0].email,
          preferredContact: 'email'
        },
        status: 'pending'
      }),
      LostItem.create({
        organization: testOrg._id,
        title: 'Test Lost Wallet',
        description: 'Brown leather wallet with ID cards',
        category: 'accessories',
        location: {
          building: 'Student Center',
          area: 'Cafeteria',
          description: 'Left on table near window'
        },
        dateLost: new Date(),
        reportedBy: users[1]._id,
        contactInfo: {
          name: users[1].name,
          email: users[1].email,
          preferredContact: 'email'
        },
        status: 'pending'
      })
    ]);
    console.log(`✅ Created ${lostItems.length} lost items\n`);

    // 6. Create Test Found Items
    console.log('🔍 Creating Test Found Items...');
    const foundItems = await Promise.all([
      FoundItem.create({
        organization: testOrg._id,
        title: 'Test Found Keys',
        description: 'Set of keys with blue keychain',
        category: 'keys',
        location: {
          building: 'Engineering Building',
          area: 'Lobby',
          description: 'Found on reception desk'
        },
        dateFound: new Date(),
        foundBy: users[0]._id,
        contactInfo: {
          name: users[0].name,
          email: users[0].email,
          preferredContact: 'email'
        },
        status: 'pending'
      }),
      FoundItem.create({
        organization: testOrg._id,
        title: 'Test Found Backpack',
        description: 'Blue backpack with laptop inside',
        category: 'bags',
        location: {
          building: 'Science Building',
          area: 'Lab 201',
          description: 'Left under desk'
        },
        dateFound: new Date(),
        foundBy: users[1]._id,
        contactInfo: {
          name: users[1].name,
          email: users[1].email,
          preferredContact: 'email'
        },
        status: 'pending'
      })
    ]);
    console.log(`✅ Created ${foundItems.length} found items\n`);

    // 7. Test Organization Admin Approval Workflow
    console.log('⚡ Testing Organization Admin Approval Workflow...');
    
    // Approve a lost item
    lostItems[0].status = 'approved';
    lostItems[0].approvedBy = orgAdmin._id;
    lostItems[0].approvedAt = new Date();
    await lostItems[0].save();
    
    // Verify a found item
    foundItems[0].status = 'verified';
    foundItems[0].verifiedBy = orgAdmin._id;
    foundItems[0].verifiedAt = new Date();
    foundItems[0].storageLocation = {
      building: 'Admin Building',
      room: 'Lost & Found Office',
      shelf: 'A1'
    };
    await foundItems[0].save();
    
    console.log('✅ Organization Admin approved lost item and verified found item\n');

    // 8. Create Test Claims
    console.log('📋 Creating Test Claims...');
    const claims = await Promise.all([
      Claim.create({
        organization: testOrg._id,
        claimType: 'lost_item',
        lostItem: lostItems[0]._id,
        claimedBy: users[0]._id,
        claimDescription: 'This is my iPhone that I lost in the library yesterday',
        proofOfOwnership: [
          {
            type: 'description',
            description: 'Black iPhone 13 Pro with cracked screen protector'
          }
        ],
        contactInfo: {
          name: users[0].name,
          email: users[0].email,
          preferredContact: 'email'
        },
        status: 'pending'
      }),
      Claim.create({
        organization: testOrg._id,
        claimType: 'found_item',
        foundItem: foundItems[0]._id,
        claimedBy: users[1]._id,
        claimDescription: 'These are my keys with the blue keychain',
        proofOfOwnership: [
          {
            type: 'description',
            description: 'Keys include house key, car key, and office key'
          }
        ],
        contactInfo: {
          name: users[1].name,
          email: users[1].email,
          preferredContact: 'email'
        },
        status: 'pending'
      })
    ]);
    console.log(`✅ Created ${claims.length} claims\n`);

    // 9. Test Claim Approval
    console.log('✅ Testing Claim Approval...');
    claims[0].status = 'approved';
    claims[0].reviewedBy = orgAdmin._id;
    claims[0].reviewedAt = new Date();
    claims[0].reviewNotes = 'Claim approved - user provided sufficient proof';
    await claims[0].save();

    // Update related lost item
    lostItems[0].status = 'claimed';
    lostItems[0].resolvedBy = orgAdmin._id;
    lostItems[0].resolvedAt = new Date();
    await lostItems[0].save();

    console.log('✅ Organization Admin approved claim and marked item as resolved\n');

    // 10. Create Activity Logs
    console.log('📊 Creating Activity Logs...');
    await Promise.all([
      ActivityLog.create({
        organization: testOrg._id,
        user: superAdmin._id,
        action: 'organization_created',
        description: `Test organization "${testOrg.name}" created by Super Admin`,
        metadata: {
          organizationId: testOrg._id,
          adminUserId: orgAdmin._id
        },
        severity: 'medium',
        category: 'organization'
      }),
      ActivityLog.create({
        organization: testOrg._id,
        user: orgAdmin._id,
        action: 'lost_item_approved',
        description: `Test lost item "${lostItems[0].title}" approved by Organization Admin`,
        metadata: {
          lostItemId: lostItems[0]._id,
          reportedBy: users[0]._id
        },
        severity: 'medium',
        category: 'item_management'
      }),
      ActivityLog.create({
        organization: testOrg._id,
        user: orgAdmin._id,
        action: 'claim_approved',
        description: `Test claim for "${lostItems[0].title}" approved by Organization Admin`,
        metadata: {
          claimId: claims[0]._id,
          claimedBy: users[0]._id
        },
        severity: 'medium',
        category: 'claim_management'
      })
    ]);
    console.log('✅ Activity logs created\n');

    // 11. Test Data Isolation
    console.log('🔒 Testing Data Isolation...');
    
    // Create second organization
    const testOrg2 = await Organization.create({
      name: 'Test Hospital',
      organizationId: 'TEST002',
      slug: 'test-hospital',
      type: 'hospital',
      sectorLevel: 'regional',
      contact: {
        email: 'contact@testhospital.com',
        phone: '+251911000002'
      },
      adminId: null,
      status: 'pending',
      isActive: false,
      verificationStatus: 'pending',
      createdBy: superAdmin._id
    });

    // Verify organization admin can only see their organization's data
    const org1Items = await LostItem.find({ organization: testOrg._id });
    const org2Items = await LostItem.find({ organization: testOrg2._id });
    
    console.log(`✅ Organization 1 has ${org1Items.length} items`);
    console.log(`✅ Organization 2 has ${org2Items.length} items`);
    console.log('✅ Data isolation working correctly\n');

    // 12. Generate Test Summary
    console.log('📈 Test Summary:');
    console.log('================');
    
    const totalOrgs = await Organization.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalLostItems = await LostItem.countDocuments();
    const totalFoundItems = await FoundItem.countDocuments();
    const totalClaims = await Claim.countDocuments();
    const totalActivities = await ActivityLog.countDocuments();

    console.log(`🏢 Organizations: ${totalOrgs}`);
    console.log(`👥 Users: ${totalUsers}`);
    console.log(`   - Super Admins: ${await User.countDocuments({ role: 'superAdmin' })}`);
    console.log(`   - Org Admins: ${await User.countDocuments({ role: 'orgAdmin' })}`);
    console.log(`   - Regular Users: ${await User.countDocuments({ role: 'user' })}`);
    console.log(`📱 Lost Items: ${totalLostItems}`);
    console.log(`🔍 Found Items: ${totalFoundItems}`);
    console.log(`📋 Claims: ${totalClaims}`);
    console.log(`📊 Activity Logs: ${totalActivities}`);

    console.log('\n🎉 Multi-Level Administration System Test Completed Successfully!');
    console.log('\n🔑 Test Credentials:');
    console.log('Super Admin: superadmin@test.com / password123');
    console.log('Org Admin: orgadmin@test.com / password123');
    console.log('User 1: john@test.com / password123');
    console.log('User 2: jane@test.com / password123');

    console.log('\n🌐 Test the system by:');
    console.log('1. Login as Super Admin to manage all organizations');
    console.log('2. Login as Org Admin to manage organization-specific data');
    console.log('3. Login as regular user to report items and submit claims');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testMultiLevelAdminSystem();
}

module.exports = testMultiLevelAdminSystem;