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

    // Create a temporary admin user first
    let tempAdmin = await User.findOne({ email: 'temp@admin.com' });
    if (!tempAdmin) {
      tempAdmin = new User({
        name: 'Temporary Admin',
        email: 'temp@admin.com',
        password: 'temp123',
        role: 'hallAdmin', // Hall admin doesn't require organization
        isVerified: true,
        status: 'active'
      });
      await tempAdmin.save();
      console.log('✅ Created temporary admin user');
    }

    // Organizations to create
    const organizationsData = [
      {
        name: 'HP (Hewlett-Packard)',
        organizationId: 'HP-001',
        type: 'other',
        slug: 'hp-hewlett-packard',
        sectorLevel: 'federal',
        description: 'Technology company specializing in computers and printers',
        adminId: tempAdmin._id,
        contact: {
          email: 'admin@hp.com',
          phone: '+251911234567',
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
        type: 'other',
        slug: 'bunna-bank',
        sectorLevel: 'federal',
        description: 'Leading commercial bank in Ethiopia',
        adminId: tempAdmin._id,
        contact: {
          email: 'admin@bunnabank.com.et',
          phone: '+251115517438',
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
        type: 'other',
        slug: 'abay-bank',
        sectorLevel: 'federal',
        description: 'Commercial bank serving Ethiopia',
        adminId: tempAdmin._id,
        contact: {
          email: 'admin@abaybank.com.et',
          phone: '+251116629999',
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
      console.log(`   Contact: ${org.contact.email}`);
    });

    console.log('\n✅ Organization creation completed!');
    console.log('\n💡 Organizations are now visible in the frontend!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createOrganizations();