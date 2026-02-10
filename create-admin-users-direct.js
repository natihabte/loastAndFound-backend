const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Organization = require('./models/Organization');

async function createAdminUsersDirectly() {
  try {
    console.log('🔧 Creating Admin Users Directly...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/findit';
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 URI: ${mongoUri.substring(0, 50)}...`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully!\n');

    // Clear existing data
    await User.deleteMany({});
    await Organization.deleteMany({});

    // 1. Create Hall Admin (System Administrator) first
    console.log('👑 Creating Hall Admin...');
    
    const hallAdmin = new User({
      name: 'System Administrator',
      email: 'admin@system.com',
      password: 'admin123', // Will be hashed by pre-save middleware
      role: 'hallAdmin',
      roleLevel: 3,
      status: 'active',
      isVerified: true,
      permissions: [
        'manage_organization',
        'manage_users',
        'manage_items',
        'view_reports',
        'manage_settings',
        'approve_items',
        'export_data',
        'manage_subscriptions'
      ]
    });

    await hallAdmin.save();
    console.log('✅ Hall Admin created successfully');
    console.log(`   Email: ${hallAdmin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${hallAdmin.role}\n`);

    // 2. Create temporary Organization Admins (without organizations first)
    console.log('👨‍💼 Creating temporary Organization Admin users...');
    
    const tempOrgAdmins = [];
    const orgAdminData = [
      {
        name: 'Dr. Teshome Kebede',
        email: 'admin@aau.edu.et',
        password: 'aau123456',
        phone: '+251911123456'
      },
      {
        name: 'Dr. Alemayehu Tadesse',
        email: 'admin@hu.edu.et',
        password: 'hu123456',
        phone: '+251911654321'
      }
    ];

    // Create temporary users as regular users first
    for (let i = 0; i < orgAdminData.length; i++) {
      const adminData = orgAdminData[i];
      const tempUser = new User({
        ...adminData,
        role: 'user', // Temporary role
        roleLevel: 1,
        status: 'active',
        isVerified: true,
        permissions: []
      });
      
      // We'll create a dummy organization for now
      const dummyOrg = new Organization({
        name: `Temp Org ${i + 1}`,
        organizationId: `TEMP${i + 1}`,
        slug: `temp-org-${i + 1}`,
        type: 'university',
        sectorLevel: 'federal',
        adminId: tempUser._id, // This will be updated later
        contact: {
          email: adminData.email,
          phone: adminData.phone,
          address: {
            street: 'Temporary Address',
            city: 'Temp City',
            region: 'Temp Region',
            country: 'Ethiopia'
          }
        },
        verificationStatus: 'verified',
        isActive: true,
        approvalDate: new Date(),
        createdBy: hallAdmin._id
      });
      
      await dummyOrg.save();
      tempUser.organization = dummyOrg._id;
      await tempUser.save();
      
      tempOrgAdmins.push({ user: tempUser, org: dummyOrg });
      console.log(`✅ Temporary user ${i + 1} created: ${tempUser.name}`);
    }

    // 3. Create actual Organizations
    console.log('\n🏢 Creating actual Organizations...');
    
    const organizations = [
      {
        name: 'Addis Ababa University',
        organizationId: 'AAU001',
        slug: 'addis-ababa-university',
        type: 'university',
        sectorLevel: 'federal',
        description: 'Leading university in Ethiopia',
        adminId: tempOrgAdmins[0].user._id,
        contact: {
          email: 'admin@aau.edu.et',
          phone: '+251911123456',
          address: {
            street: 'Arat Kilo Campus',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
            country: 'Ethiopia'
          }
        },
        verificationStatus: 'verified',
        isActive: true,
        approvalDate: new Date(),
        createdBy: hallAdmin._id
      },
      {
        name: 'Hawassa University',
        organizationId: 'HU001',
        slug: 'hawassa-university',
        type: 'university',
        sectorLevel: 'regional',
        description: 'University in Southern Ethiopia',
        adminId: tempOrgAdmins[1].user._id,
        contact: {
          email: 'admin@hu.edu.et',
          phone: '+251911654321',
          address: {
            street: 'Main Campus',
            city: 'Hawassa',
            region: 'SNNPR',
            country: 'Ethiopia'
          }
        },
        verificationStatus: 'verified',
        isActive: true,
        approvalDate: new Date(),
        createdBy: hallAdmin._id
      }
    ];

    // Delete temporary organizations
    await Organization.deleteMany({ organizationId: { $in: ['TEMP1', 'TEMP2'] } });
    
    // Create actual organizations
    const createdOrgs = await Organization.insertMany(organizations);
    
    console.log(`✅ Created ${createdOrgs.length} organizations`);
    createdOrgs.forEach((org, index) => {
      console.log(`   - ${org.name} (${org.organizationId})`);
    });

    // 4. Update users to be Organization Admins with correct organizations
    console.log('\n🔗 Converting to Organization Admins...');
    
    for (let i = 0; i < tempOrgAdmins.length; i++) {
      const user = tempOrgAdmins[i].user;
      
      // Update user to be orgAdmin with correct organization
      user.role = 'orgAdmin';
      user.roleLevel = 2;
      user.organization = createdOrgs[i]._id;
      user.permissions = [
        'manage_users',
        'manage_items',
        'view_reports',
        'manage_settings',
        'approve_items',
        'export_data'
      ];
      
      await user.save();
      
      console.log(`✅ Organization Admin ${i + 1} updated:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${orgAdminData[i].password}`);
      console.log(`   Organization: ${createdOrgs[i].name}\n`);
    }

    // 5. Create Public Users
    console.log('\n👤 Creating Public Users...');
    
    const publicUsers = [
      {
        name: 'Abebe Kebede',
        email: 'user@aau.edu.et',
        password: 'user123',
        phone: '+251911111111',
        role: 'user',
        roleLevel: 1,
        organization: createdOrgs[0]._id, // AAU
        status: 'active',
        isVerified: true,
        permissions: []
      },
      {
        name: 'Almaz Tadesse',
        email: 'user@hu.edu.et',
        password: 'user123',
        phone: '+251911222222',
        role: 'user',
        roleLevel: 1,
        organization: createdOrgs[1]._id, // HU
        status: 'active',
        isVerified: true,
        permissions: []
      }
    ];

    for (let i = 0; i < publicUsers.length; i++) {
      const userData = publicUsers[i];
      const user = new User(userData);
      await user.save();
      
      console.log(`✅ Public User ${i + 1} created:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: user123`);
      console.log(`   Organization: ${createdOrgs[i].name}\n`);
    }

    // Summary
    console.log('🎉 ALL ADMIN USERS CREATED SUCCESSFULLY IN DATABASE!\n');
    console.log('📋 LOGIN CREDENTIALS SUMMARY:');
    console.log('═══════════════════════════════════════');
    
    console.log('\n👑 HALL ADMIN (System Administrator):');
    console.log('   Email: admin@system.com');
    console.log('   Password: admin123');
    console.log('   Access: Full system control');
    
    console.log('\n👨‍💼 ORGANIZATION ADMIN #1 (AAU):');
    console.log('   Email: admin@aau.edu.et');
    console.log('   Password: aau123456');
    console.log('   Access: Addis Ababa University only');
    
    console.log('\n👨‍💼 ORGANIZATION ADMIN #2 (HU):');
    console.log('   Email: admin@hu.edu.et');
    console.log('   Password: hu123456');
    console.log('   Access: Hawassa University only');
    
    console.log('\n👤 PUBLIC USER #1 (AAU):');
    console.log('   Email: user@aau.edu.et');
    console.log('   Password: user123');
    console.log('   Access: Public user features');
    
    console.log('\n👤 PUBLIC USER #2 (HU):');
    console.log('   Email: user@hu.edu.et');
    console.log('   Password: user123');
    console.log('   Access: Public user features');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Admin users are now in the database');
    console.log('2. 🌐 Go to your app login page');
    console.log('3. 🛡️ Click the purple "Admin Login" button');
    console.log('4. 🔑 Enter any of the credentials above');
    console.log('5. 🎯 Access the appropriate dashboard');

    console.log('\n✅ Ready to test admin login with real database!');

    // Verify users were created
    const userCount = await User.countDocuments();
    const orgCount = await Organization.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`   Users created: ${userCount}`);
    console.log(`   Organizations created: ${orgCount}`);

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
    if (error.code === 11000) {
      console.log('💡 Duplicate key error - users may already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
createAdminUsersDirectly();