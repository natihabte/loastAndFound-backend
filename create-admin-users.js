const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Organization = require('./models/Organization');

// Script to create admin users for the system
async function createAdminUsers() {
  try {
    console.log('🔧 Creating Admin Users...\n');

    // Connect to MongoDB (if available)
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found-system');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.log('⚠️  MongoDB not available, will create mock data');
      console.log('📝 Use these credentials in your system:\n');
    }

    // 1. Create Hall Admin
    console.log('👑 Creating Hall Admin...');
    const hallAdminData = {
      name: 'System Administrator',
      email: 'admin@system.com',
      password: await bcrypt.hash('admin123', 12),
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
        'manage_subscriptions',
        'system_admin'
      ]
    };

    console.log('✅ Hall Admin Credentials:');
    console.log('   Email: admin@system.com');
    console.log('   Password: admin123');
    console.log('   Role: hallAdmin\n');

    // 2. Create Organizations
    console.log('🏢 Creating Organizations...');
    const organizations = [
      {
        name: 'Addis Ababa University',
        organizationId: 'AAU001',
        slug: 'addis-ababa-university',
        type: 'university',
        sectorLevel: 'federal',
        description: 'Leading university in Ethiopia',
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
        approvalDate: new Date()
      },
      {
        name: 'Hawassa University',
        organizationId: 'HU001',
        slug: 'hawassa-university',
        type: 'university',
        sectorLevel: 'regional',
        description: 'University in Southern Ethiopia',
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
        approvalDate: new Date()
      }
    ];

    let orgIds = {};
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i];
      console.log(`✅ Organization ${i + 1}: ${org.name} (${org.organizationId})`);
      orgIds[org.organizationId] = `ORG_${i + 1}_ID`; // Mock ID for demo
    }

    // 3. Create Organization Admins
    console.log('\n👨‍💼 Creating Organization Admins...');
    const orgAdmins = [
      {
        name: 'Dr. Teshome Kebede',
        email: 'admin@aau.edu.et',
        password: await bcrypt.hash('aau123', 12),
        phone: '+251911123456',
        role: 'orgAdmin',
        roleLevel: 2,
        organization: orgIds['AAU001'],
        status: 'active',
        isVerified: true,
        permissions: [
          'manage_users',
          'manage_items',
          'view_reports',
          'manage_settings',
          'approve_items',
          'export_data'
        ]
      },
      {
        name: 'Dr. Alemayehu Tadesse',
        email: 'admin@hu.edu.et',
        password: await bcrypt.hash('hu123', 12),
        phone: '+251911654321',
        role: 'orgAdmin',
        roleLevel: 2,
        organization: orgIds['HU001'],
        status: 'active',
        isVerified: true,
        permissions: [
          'manage_users',
          'manage_items',
          'view_reports',
          'manage_settings',
          'approve_items',
          'export_data'
        ]
      }
    ];

    orgAdmins.forEach((admin, index) => {
      console.log(`✅ Organization Admin ${index + 1}:`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.email.includes('aau') ? 'aau123' : 'hu123'}`);
      console.log(`   Role: orgAdmin`);
      console.log(`   Organization: ${admin.email.includes('aau') ? 'Addis Ababa University' : 'Hawassa University'}\n`);
    });

    // 4. Create Public Users
    console.log('👤 Creating Public Users...');
    const publicUsers = [
      {
        name: 'Abebe Kebede',
        email: 'user@aau.edu.et',
        password: await bcrypt.hash('user123', 12),
        phone: '+251911111111',
        role: 'user',
        roleLevel: 1,
        organization: orgIds['AAU001'],
        status: 'active',
        isVerified: true,
        permissions: []
      },
      {
        name: 'Almaz Tadesse',
        email: 'user@hu.edu.et',
        password: await bcrypt.hash('user123', 12),
        phone: '+251911222222',
        role: 'user',
        roleLevel: 1,
        organization: orgIds['HU001'],
        status: 'active',
        isVerified: true,
        permissions: []
      }
    ];

    publicUsers.forEach((user, index) => {
      console.log(`✅ Public User ${index + 1}:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: user123`);
      console.log(`   Role: user\n`);
    });

    // Summary
    console.log('🎉 ADMIN USERS CREATED SUCCESSFULLY!\n');
    console.log('📋 LOGIN CREDENTIALS SUMMARY:');
    console.log('═══════════════════════════════════════');
    
    console.log('\n👑 HALL ADMIN (System Administrator):');
    console.log('   Email: admin@system.com');
    console.log('   Password: admin123');
    console.log('   Access: Full system control');
    
    console.log('\n👨‍💼 ORGANIZATION ADMIN #1 (AAU):');
    console.log('   Email: admin@aau.edu.et');
    console.log('   Password: aau123');
    console.log('   Access: Addis Ababa University only');
    
    console.log('\n👨‍💼 ORGANIZATION ADMIN #2 (HU):');
    console.log('   Email: admin@hu.edu.et');
    console.log('   Password: hu123');
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
    console.log('1. Use any of the above credentials to login');
    console.log('2. Go to your app login page');
    console.log('3. Click the purple "🛡️ Admin Login" button');
    console.log('4. Enter the credentials above');
    console.log('5. Access the appropriate dashboard');

    console.log('\n✅ Ready to test the admin login!');

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
if (require.main === module) {
  createAdminUsers();
}

module.exports = createAdminUsers;