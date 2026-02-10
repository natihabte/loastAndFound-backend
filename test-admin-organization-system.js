const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Organization = require('./models/Organization');
const OrganizationPermissions = require('./models/OrganizationPermissions');
const ActivityLog = require('./models/ActivityLog');

// Test data
const testData = {
  superAdmin: {
    name: 'Super Administrator',
    email: 'superadmin@lostandfound.com',
    password: 'SuperAdmin123!',
    role: 'super_admin',
    roleLevel: 4,
    isVerified: true,
    permissions: ['*']
  },
  organizations: [
    {
      name: 'Addis Ababa University',
      organizationId: 'AAU001',
      type: 'university',
      sectorLevel: 'federal',
      contact: {
        email: 'admin@aau.edu.et',
        phone: '+251911123456',
        address: 'Addis Ababa, Ethiopia'
      },
      adminUser: {
        name: 'AAU Administrator',
        email: 'admin@aau.edu.et',
        password: 'AAUAdmin123!'
      }
    },
    {
      name: 'Addis Ababa City Administration',
      organizationId: 'AACA001',
      type: 'municipality',
      sectorLevel: 'city',
      contact: {
        email: 'admin@addisababa.gov.et',
        phone: '+251911654321',
        address: 'Addis Ababa City Hall, Ethiopia'
      },
      adminUser: {
        name: 'City Administrator',
        email: 'admin@addisababa.gov.et',
        password: 'CityAdmin123!'
      }
    },
    {
      name: 'Black Lion Hospital',
      organizationId: 'BLH001',
      type: 'hospital',
      sectorLevel: 'federal',
      contact: {
        email: 'admin@blacklion.gov.et',
        phone: '+251911789012',
        address: 'Addis Ababa, Ethiopia'
      },
      adminUser: {
        name: 'Hospital Administrator',
        email: 'admin@blacklion.gov.et',
        password: 'HospitalAdmin123!'
      }
    }
  ]
};

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound-test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function clearTestData() {
  try {
    await Promise.all([
      User.deleteMany({ email: { $regex: /@(aau\.edu\.et|addisababa\.gov\.et|blacklion\.gov\.et|lostandfound\.com)$/ } }),
      Organization.deleteMany({ organizationId: { $in: ['AAU001', 'AACA001', 'BLH001'] } }),
      OrganizationPermissions.deleteMany({}),
      ActivityLog.deleteMany({ description: { $regex: /test/i } })
    ]);
    console.log('🧹 Cleared existing test data');
  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
  }
}

async function createSuperAdmin() {
  try {
    const existingSuperAdmin = await User.findOne({ email: testData.superAdmin.email });
    if (existingSuperAdmin) {
      console.log('ℹ️  Super admin already exists');
      return existingSuperAdmin;
    }

    const hashedPassword = await bcrypt.hash(testData.superAdmin.password, 12);
    const superAdmin = await User.create({
      ...testData.superAdmin,
      password: hashedPassword
    });

    console.log('✅ Created Super Admin:', superAdmin.email);
    return superAdmin;
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    throw error;
  }
}

async function createTestOrganizations(superAdmin) {
  const createdOrgs = [];

  for (const orgData of testData.organizations) {
    try {
      // Create organization
      const organization = await Organization.create({
        name: orgData.name,
        organizationId: orgData.organizationId,
        slug: orgData.organizationId.toLowerCase(),
        type: orgData.type,
        sectorLevel: orgData.sectorLevel,
        contact: orgData.contact,
        status: 'active',
        verifiedAt: new Date(),
        createdBy: superAdmin._id,
        subscription: {
          plan: 'basic',
          status: 'active',
          startDate: new Date(),
          features: {}
        }
      });

      // Create organization permissions
      const permissions = await OrganizationPermissions.create({
        organization: organization._id,
        ...OrganizationPermissions.getDefaultPermissions('basic'),
        createdBy: superAdmin._id
      });

      // Create organization admin user
      const hashedPassword = await bcrypt.hash(orgData.adminUser.password, 12);
      const adminUser = await User.create({
        name: orgData.adminUser.name,
        email: orgData.adminUser.email,
        password: hashedPassword,
        role: 'org_admin',
        roleLevel: 3,
        organization: organization._id,
        isVerified: true,
        verifiedAt: new Date(),
        permissions: ['manage_organization', 'manage_users', 'manage_items', 'view_reports']
      });

      // Log activity
      await ActivityLog.create({
        organization: organization._id,
        user: superAdmin._id,
        action: 'organization_created',
        description: `Test organization "${orgData.name}" created`,
        metadata: {
          organizationId: organization._id,
          adminUserId: adminUser._id,
          subscriptionPlan: 'basic'
        },
        severity: 'medium',
        category: 'organization'
      });

      createdOrgs.push({
        organization,
        permissions,
        adminUser
      });

      console.log(`✅ Created organization: ${orgData.name}`);
      console.log(`   - Admin: ${adminUser.email}`);
      console.log(`   - Status: ${organization.status}`);
      console.log(`   - Type: ${organization.type}`);

    } catch (error) {
      console.error(`❌ Error creating organization ${orgData.name}:`, error.message);
    }
  }

  return createdOrgs;
}

async function createTestUsers(organizations) {
  const testUsers = [];

  for (const { organization } of organizations) {
    try {
      // Create staff user
      const staffUser = await User.create({
        name: `${organization.name} Staff`,
        email: `staff@${organization.organizationId.toLowerCase()}.test`,
        password: await bcrypt.hash('StaffUser123!', 12),
        role: 'staff',
        roleLevel: 2,
        organization: organization._id,
        isVerified: true,
        permissions: ['manage_items', 'approve_items']
      });

      // Create regular users
      const regularUsers = [];
      for (let i = 1; i <= 3; i++) {
        const user = await User.create({
          name: `${organization.name} User ${i}`,
          email: `user${i}@${organization.organizationId.toLowerCase()}.test`,
          password: await bcrypt.hash('RegularUser123!', 12),
          role: 'user',
          roleLevel: 1,
          organization: organization._id,
          isVerified: true,
          permissions: ['create_items', 'edit_own_items']
        });
        regularUsers.push(user);
      }

      testUsers.push({
        organization: organization.name,
        staff: staffUser,
        users: regularUsers
      });

      console.log(`✅ Created test users for ${organization.name}`);

    } catch (error) {
      console.error(`❌ Error creating test users for ${organization.name}:`, error.message);
    }
  }

  return testUsers;
}

async function testPermissionSystem(organizations) {
  console.log('\n🧪 Testing Permission System...');

  for (const { organization, permissions } of organizations) {
    try {
      // Test permission checks
      const canPost = permissions.hasPermission('canPostLostItems');
      const canExport = permissions.hasPermission('canExportData');
      const withinUserLimit = permissions.isWithinLimit('Users', 5);
      const withinItemLimit = permissions.isWithinLimit('Items', 100);

      console.log(`📋 ${organization.name} Permissions:`);
      console.log(`   - Can post items: ${canPost}`);
      console.log(`   - Can export data: ${canExport}`);
      console.log(`   - Within user limit (5): ${withinUserLimit}`);
      console.log(`   - Within item limit (100): ${withinItemLimit}`);

    } catch (error) {
      console.error(`❌ Error testing permissions for ${organization.name}:`, error.message);
    }
  }
}

async function generateTestStatistics() {
  console.log('\n📊 Generating Test Statistics...');

  try {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalAdmins
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['super_admin', 'org_admin'] } })
    ]);

    console.log('📈 Platform Statistics:');
    console.log(`   - Total Organizations: ${totalOrganizations}`);
    console.log(`   - Active Organizations: ${activeOrganizations}`);
    console.log(`   - Total Users: ${totalUsers}`);
    console.log(`   - Admin Users: ${totalAdmins}`);

    // Organization-specific stats
    const organizations = await Organization.find({ status: 'active' });
    for (const org of organizations) {
      const [userCount, adminCount] = await Promise.all([
        User.countDocuments({ organization: org._id }),
        User.countDocuments({ organization: org._id, role: { $in: ['org_admin', 'staff'] } })
      ]);

      console.log(`📊 ${org.name}:`);
      console.log(`   - Users: ${userCount}`);
      console.log(`   - Admins: ${adminCount}`);
    }

  } catch (error) {
    console.error('❌ Error generating statistics:', error.message);
  }
}

async function testAdminWorkflows() {
  console.log('\n🔄 Testing Admin Workflows...');

  try {
    // Test organization status changes
    const testOrg = await Organization.findOne({ organizationId: 'AAU001' });
    if (testOrg) {
      // Suspend organization
      testOrg.status = 'suspended';
      testOrg.suspendedAt = new Date();
      testOrg.suspensionReason = 'Test suspension';
      await testOrg.save();
      console.log('✅ Tested organization suspension');

      // Reactivate organization
      testOrg.status = 'active';
      testOrg.suspendedAt = undefined;
      testOrg.suspensionReason = undefined;
      await testOrg.save();
      console.log('✅ Tested organization reactivation');
    }

    // Test permission updates
    const permissions = await OrganizationPermissions.findOne({ 
      organization: testOrg._id 
    });
    if (permissions) {
      permissions.canExportData = true;
      permissions.maxUsers = 100;
      await permissions.save();
      console.log('✅ Tested permission updates');
    }

  } catch (error) {
    console.error('❌ Error testing admin workflows:', error.message);
  }
}

async function displayLoginCredentials(superAdmin, organizations, testUsers) {
  console.log('\n🔑 LOGIN CREDENTIALS FOR TESTING:');
  console.log('=' .repeat(50));
  
  console.log('\n👑 SUPER ADMIN:');
  console.log(`Email: ${superAdmin.email}`);
  console.log(`Password: ${testData.superAdmin.password}`);
  console.log('Access: Full platform control');

  console.log('\n🏢 ORGANIZATION ADMINS:');
  for (const orgData of testData.organizations) {
    console.log(`\n${orgData.name}:`);
    console.log(`Email: ${orgData.adminUser.email}`);
    console.log(`Password: ${orgData.adminUser.password}`);
    console.log(`Access: ${orgData.name} management`);
  }

  console.log('\n👥 TEST USERS:');
  for (const { organization, staff, users } of testUsers) {
    console.log(`\n${organization}:`);
    console.log(`Staff - Email: ${staff.email} | Password: StaffUser123!`);
    users.forEach((user, index) => {
      console.log(`User ${index + 1} - Email: ${user.email} | Password: RegularUser123!`);
    });
  }

  console.log('\n🌐 FRONTEND ACCESS:');
  console.log('URL: http://localhost:3000');
  console.log('Admin Login: Click "Admin Login" button on login page');
  console.log('Organization Management: Admin Dashboard → Organizations');
}

async function main() {
  console.log('🚀 Starting Admin Organization System Test Setup...\n');

  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    process.exit(1);
  }

  try {
    // Clear existing test data
    await clearTestData();

    // Create super admin
    const superAdmin = await createSuperAdmin();

    // Create test organizations
    const organizations = await createTestOrganizations(superAdmin);

    // Create test users
    const testUsers = await createTestUsers(organizations);

    // Test permission system
    await testPermissionSystem(organizations);

    // Generate statistics
    await generateTestStatistics();

    // Test admin workflows
    await testAdminWorkflows();

    // Display login credentials
    await displayLoginCredentials(superAdmin, organizations, testUsers);

    console.log('\n✅ Admin Organization System Test Setup Complete!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend server: npm start');
    console.log('3. Login with super admin credentials');
    console.log('4. Navigate to Admin Dashboard → Organizations');
    console.log('5. Test organization management features');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test setup
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  connectDatabase,
  createSuperAdmin,
  createTestOrganizations,
  testData
};