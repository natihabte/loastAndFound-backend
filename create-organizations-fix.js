const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

const createOrganizations = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // First, create admin users for each organization
    const adminUsers = [
      {
        name: 'HP Admin',
        email: 'admin@hp.com',
        password: 'HP@admin123',
        role: 'orgAdmin', // Fixed: using valid enum value
        isVerified: true,
        status: 'active'
      },
      {
        name: 'Bunna Bank Admin',
        email: 'admin@bunnabank.com.et',
        password: 'Bunna@admin123',
        role: 'orgAdmin', // Fixed: using valid enum value
        isVerified: true,
        status: 'active'
      },
      {
        name: 'Abay Bank Admin',
        email: 'admin@abaybank.com.et',
        password: 'Abay@admin123',
        role: 'orgAdmin', // Fixed: using valid enum value
        isVerified: true,
        status: 'active'
      }
    ];

    console.log('\n👥 Creating admin users...\n');
    const createdAdmins = {};

    for (const adminData of adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: adminData.email });
        if (existingUser) {
          console.log(`⚠️  Admin user "${adminData.email}" already exists`);
          createdAdmins[`${adminData.name.split(' ')[0]}-001`] = existingUser._id;
          continue;
        }

        // Create admin user
        const admin = new User(adminData);
        await admin.save();
        createdAdmins[`${adminData.name.split(' ')[0]}-001`] = admin._id;
        
        console.log(`✅ Created admin: ${adminData.name} (${adminData.email})`);
      } catch (error) {
        console.error(`❌ Error creating admin ${adminData.name}:`, error.message);
      }
    }

    // Organizations to create
    const organizationsData = [
      {
        name: 'HP (Hewlett-Packard)',
        organizationId: 'HP-001',
        type: 'other', // Using valid enum value
        slug: 'hp-hewlett-packard',
        sectorLevel: 'federal', // Required field
        description: 'Technology company specializing in computers and printers',
        adminId: createdAdmins['HP-001'], // Required field
        contact: {
          email: 'admin@hp.com',
          phone: '+251911234567', // Valid Ethiopian format
          address: {
            street: '1501 Page Mill Road',
            city: 'Palo Alto',
            region: 'California',
            country: 'USA',
            postalCode: '94304'
          }
        },
        isActive: true,
        verificationStatus: 'verified',
        registrationDate: new Date()
      },
      {
        name: 'Bunna Bank',
        organizationId: 'BUNNA-001',
        type: 'other', // Using valid enum value
        slug: 'bunna-bank',
        sectorLevel: 'federal', // Required field
        description: 'Leading commercial bank in Ethiopia',
        adminId: createdAdmins['BUNNA-001'], // Required field
        contact: {
          email: 'admin@bunnabank.com.et',
          phone: '+251115517438', // Valid Ethiopian format
          address: {
            street: 'Bole Road',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
            country: 'Ethiopia',
            postalCode: '1000'
          }
        },
        isActive: true,
        verificationStatus: 'verified',
        registrationDate: new Date()
      },
      {
        name: 'Abay Bank',
        organizationId: 'ABAY-001',
        type: 'other', // Using valid enum value
        slug: 'abay-bank',
        sectorLevel: 'federal', // Required field
        description: 'Commercial bank serving Ethiopia',
        adminId: createdAdmins['ABAY-001'], // Required field
        contact: {
          email: 'admin@abaybank.com.et',
          phone: '+251116629999', // Valid Ethiopian format
          address: {
            street: 'Meskel Square',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
            country: 'Ethiopia',
            postalCode: '1000'
          }
        },
        isActive: true,
        verificationStatus: 'verified',
        registrationDate: new Date()
      }
    ];

    console.log('\n🏢 Creating organizations...\n');

    for (const orgData of organizationsData) {
      try {
        // Check if organization already exists
        const existingOrg = await Organization.findOne({ 
          $or: [
            { organizationId: orgData.organizationId },
            { slug: orgData.slug },
            { name: orgData.name }
          ]
        });

        if (existingOrg) {
          console.log(`⚠️  Organization "${orgData.name}" already exists`);
          continue;
        }

        // Create organization
        const organization = new Organization(orgData);
        await organization.save();
        
        console.log(`✅ Created: ${orgData.name}`);
        console.log(`   ID: ${orgData.organizationId}`);
        console.log(`   Type: ${orgData.type}`);
        console.log(`   Slug: ${orgData.slug}`);
        console.log(`   Admin: ${orgData.adminId}`);
        console.log(`   Status: Active & Verified`);
        console.log('   ---');

      } catch (error) {
        console.error(`❌ Error creating ${orgData.name}:`, error.message);
      }
    }

    // Verify organizations were created
    const allOrgs = await Organization.find({}).sort({ createdAt: -1 });
    console.log(`\n📊 Total organizations in database: ${allOrgs.length}\n`);

    allOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.organizationId})`);
      console.log(`   Status: ${org.isActive ? 'Active' : 'Inactive'} | ${org.verificationStatus}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Slug: ${org.slug}`);
    });

    console.log('\n✅ Organization creation completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createOrganizations();