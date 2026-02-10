const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound');

const Organization = require('./models/Organization');
const User = require('./models/User');

async function createMissingOrganizations() {
  try {
    console.log('🏢 CREATING MISSING ORGANIZATIONS');
    console.log('=' .repeat(60));
    
    // Organizations to create
    const organizationsToCreate = [
      {
        name: 'HP',
        organizationId: 'HP001',
        slug: 'hp',
        type: 'other',
        sectorLevel: 'federal',
        description: 'HP Technology Company',
        adminEmail: 'admin@hp.com',
        adminName: 'HP Administrator',
        adminPassword: 'hp123456'
      },
      {
        name: 'Bunna Bank',
        organizationId: 'BUNNA001',
        slug: 'bunna-bank',
        type: 'other',
        sectorLevel: 'federal',
        description: 'Bunna International Bank',
        adminEmail: 'admin@bunnabank.com.et',
        adminName: 'Bunna Bank Administrator',
        adminPassword: 'bunna123456'
      },
      {
        name: 'Abay Bank',
        organizationId: 'ABAY001',
        slug: 'abay-bank',
        type: 'other',
        sectorLevel: 'federal',
        description: 'Abay Bank S.C.',
        adminEmail: 'admin@abaybank.com.et',
        adminName: 'Abay Bank Administrator',
        adminPassword: 'abay123456'
      }
    ];
    
    for (const orgData of organizationsToCreate) {
      console.log(`\n📋 Creating ${orgData.name}...`);
      
      // Check if organization already exists
      const existingOrg = await Organization.findOne({ 
        $or: [
          { name: orgData.name },
          { organizationId: orgData.organizationId },
          { slug: orgData.slug }
        ]
      });
      
      if (existingOrg) {
        console.log(`   ⚠️  Organization ${orgData.name} already exists, skipping...`);
        continue;
      }
      
      // Check if admin user already exists
      const existingUser = await User.findOne({ email: orgData.adminEmail });
      if (existingUser) {
        console.log(`   ⚠️  Admin user ${orgData.adminEmail} already exists, skipping...`);
        continue;
      }
      
      try {
        // Step 1: Create the organization first (without adminId)
        const organization = new Organization({
          name: orgData.name,
          organizationId: orgData.organizationId,
          slug: orgData.slug,
          type: orgData.type,
          sectorLevel: orgData.sectorLevel,
          description: orgData.description,
          contact: {
            email: orgData.adminEmail,
            phone: '+251911000000',
            address: {
              street: `${orgData.name} Building`,
              city: 'Addis Ababa',
              region: 'Addis Ababa',
              country: 'Ethiopia'
            }
          },
          isActive: true,
          verificationStatus: 'verified',
          subscription: {
            plan: 'free',
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            maxUsers: 100,
            maxItems: 1000,
            features: ['basic_support', 'email_notifications']
          },
          settings: {
            defaultLanguage: 'en',
            allowPublicRegistration: true,
            requireEmailVerification: true,
            theme: {
              primaryColor: '#0066cc',
              secondaryColor: '#f8f9fa'
            }
          }
        });
        
        const savedOrg = await organization.save();
        console.log(`   ✅ Organization created: ${savedOrg.name}`);
        
        // Step 2: Create the admin user with organization reference
        const hashedPassword = await bcrypt.hash(orgData.adminPassword, 12);
        
        const adminUser = new User({
          name: orgData.adminName,
          email: orgData.adminEmail,
          password: hashedPassword,
          role: 'orgAdmin',
          roleLevel: 2,
          organization: savedOrg._id,
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
        });
        
        const savedUser = await adminUser.save();
        console.log(`   ✅ Admin user created: ${savedUser.email}`);
        
        // Step 3: Update organization with admin reference
        savedOrg.adminId = savedUser._id;
        savedOrg.createdBy = savedUser._id;
        await savedOrg.save();
        console.log(`   ✅ Organization updated with admin reference`);
        
        console.log(`   🎉 ${orgData.name} setup completed successfully!`);
        console.log(`       Login: ${orgData.adminEmail} / ${orgData.adminPassword}`);
        
      } catch (error) {
        console.log(`   ❌ Error creating ${orgData.name}:`, error.message);
      }
    }
    
    // Verify all organizations
    console.log('\n📊 FINAL VERIFICATION - ALL ORGANIZATIONS:');
    const allOrgs = await Organization.find({}).populate('adminId', 'name email');
    
    allOrgs.forEach((org, index) => {
      console.log(`\n   ${index + 1}. ${org.name}`);
      console.log(`      ID: ${org.organizationId}`);
      console.log(`      Status: ${org.isActive ? 'Active' : 'Inactive'}`);
      console.log(`      Verification: ${org.verificationStatus}`);
      console.log(`      Admin: ${org.adminId ? org.adminId.name + ' (' + org.adminId.email + ')' : 'No admin'}`);
    });
    
    console.log('\n✅ ALL ORGANIZATIONS CREATED SUCCESSFULLY!');
    console.log('\n🔑 ADMIN LOGIN CREDENTIALS:');
    console.log('   HP: admin@hp.com / hp123456');
    console.log('   Bunna Bank: admin@bunnabank.com.et / bunna123456');
    console.log('   Abay Bank: admin@abaybank.com.et / abay123456');
    console.log('\n📝 You can now see all organizations in the admin panel!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMissingOrganizations();