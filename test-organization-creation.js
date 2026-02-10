const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound');

const Organization = require('./models/Organization');
const User = require('./models/User');

async function testOrganizationCreation() {
  try {
    console.log('🧪 TESTING ORGANIZATION CREATION PROCESS');
    console.log('=' .repeat(60));
    
    // Test creating HP organization
    console.log('\n1. TESTING HP ORGANIZATION CREATION:');
    
    const hpOrgData = {
      name: 'HP',
      organizationId: 'HP001',
      slug: 'hp',
      type: 'other',
      sectorLevel: 'federal',
      description: 'HP Technology Company',
      contact: {
        email: 'admin@hp.com',
        phone: '+251911123456',
        address: {
          street: 'HP Building',
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
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
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
    };
    
    // First, create an admin user for HP
    console.log('   Creating admin user for HP...');
    const hpAdmin = new User({
      name: 'HP Administrator',
      email: 'admin@hp.com',
      password: '$2a$10$example.hash.here', // This would be hashed in real scenario
      role: 'orgAdmin',
      isActive: true,
      isEmailVerified: true
    });
    
    try {
      const savedAdmin = await hpAdmin.save();
      console.log('   ✅ HP Admin user created:', savedAdmin.email);
      
      // Now create the organization with the admin reference
      hpOrgData.adminId = savedAdmin._id;
      hpOrgData.createdBy = savedAdmin._id;
      
      const hpOrg = new Organization(hpOrgData);
      const savedOrg = await hpOrg.save();
      console.log('   ✅ HP Organization created:', savedOrg.name);
      
      // Update admin user with organization reference
      savedAdmin.organization = savedOrg._id;
      await savedAdmin.save();
      console.log('   ✅ Admin user updated with organization reference');
      
    } catch (error) {
      console.log('   ❌ Error creating HP organization:', error.message);
      if (error.code === 11000) {
        console.log('   ℹ️  This might be a duplicate key error (organization already exists)');
      }
    }
    
    // Test creating Bunna Bank organization
    console.log('\n2. TESTING BUNNA BANK ORGANIZATION CREATION:');
    
    const bunnaOrgData = {
      name: 'Bunna Bank',
      organizationId: 'BUNNA001',
      slug: 'bunna-bank',
      type: 'other',
      sectorLevel: 'federal',
      description: 'Bunna International Bank',
      contact: {
        email: 'admin@bunnabank.com.et',
        phone: '+251911234567',
        address: {
          street: 'Bunna Bank Building',
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
    };
    
    try {
      // Create admin user for Bunna Bank
      const bunnaAdmin = new User({
        name: 'Bunna Bank Administrator',
        email: 'admin@bunnabank.com.et',
        password: '$2a$10$example.hash.here',
        role: 'orgAdmin',
        isActive: true,
        isEmailVerified: true
      });
      
      const savedBunnaAdmin = await bunnaAdmin.save();
      console.log('   ✅ Bunna Bank Admin user created:', savedBunnaAdmin.email);
      
      bunnaOrgData.adminId = savedBunnaAdmin._id;
      bunnaOrgData.createdBy = savedBunnaAdmin._id;
      
      const bunnaOrg = new Organization(bunnaOrgData);
      const savedBunnaOrg = await bunnaOrg.save();
      console.log('   ✅ Bunna Bank Organization created:', savedBunnaOrg.name);
      
      savedBunnaAdmin.organization = savedBunnaOrg._id;
      await savedBunnaAdmin.save();
      console.log('   ✅ Bunna Bank Admin updated with organization reference');
      
    } catch (error) {
      console.log('   ❌ Error creating Bunna Bank organization:', error.message);
    }
    
    // Test creating Abay Bank organization
    console.log('\n3. TESTING ABAY BANK ORGANIZATION CREATION:');
    
    const abayOrgData = {
      name: 'Abay Bank',
      organizationId: 'ABAY001',
      slug: 'abay-bank',
      type: 'other',
      sectorLevel: 'federal',
      description: 'Abay Bank S.C.',
      contact: {
        email: 'admin@abaybank.com.et',
        phone: '+251911345678',
        address: {
          street: 'Abay Bank Building',
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
    };
    
    try {
      // Create admin user for Abay Bank
      const abayAdmin = new User({
        name: 'Abay Bank Administrator',
        email: 'admin@abaybank.com.et',
        password: '$2a$10$example.hash.here',
        role: 'orgAdmin',
        isActive: true,
        isEmailVerified: true
      });
      
      const savedAbayAdmin = await abayAdmin.save();
      console.log('   ✅ Abay Bank Admin user created:', savedAbayAdmin.email);
      
      abayOrgData.adminId = savedAbayAdmin._id;
      abayOrgData.createdBy = savedAbayAdmin._id;
      
      const abayOrg = new Organization(abayOrgData);
      const savedAbayOrg = await abayOrg.save();
      console.log('   ✅ Abay Bank Organization created:', savedAbayOrg.name);
      
      savedAbayAdmin.organization = savedAbayOrg._id;
      await savedAbayAdmin.save();
      console.log('   ✅ Abay Bank Admin updated with organization reference');
      
    } catch (error) {
      console.log('   ❌ Error creating Abay Bank organization:', error.message);
    }
    
    // Verify all organizations now exist
    console.log('\n4. VERIFICATION - ALL ORGANIZATIONS IN DATABASE:');
    const allOrgs = await Organization.find({});
    allOrgs.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name} (${org.organizationId}) - ${org.isActive ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n✅ Organization creation test completed!');
    console.log('   Now you should be able to see all organizations in the admin panel.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testOrganizationCreation();