const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

const findOrganization = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/public-sector-lf');
    console.log('✅ Connected to MongoDB');

    // Ask user for their organization details
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    console.log('\n🔍 Let\'s find your organization!');
    console.log('Please provide any of the following information:\n');

    const orgName = await askQuestion('Organization Name (or part of it): ');
    const orgEmail = await askQuestion('Official Email (or admin email): ');
    const orgId = await askQuestion('Organization ID (if you know it): ');

    rl.close();

    // Build search query
    const searchQuery = { $or: [] };

    if (orgName) {
      searchQuery.$or.push({ name: { $regex: orgName, $options: 'i' } });
    }
    if (orgEmail) {
      searchQuery.$or.push({ 'contact.email': { $regex: orgEmail, $options: 'i' } });
    }
    if (orgId) {
      searchQuery.$or.push({ organizationId: { $regex: orgId, $options: 'i' } });
    }

    // If no search criteria provided, show all organizations
    const query = searchQuery.$or.length > 0 ? searchQuery : {};

    // Find matching organizations
    const organizations = await Organization.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${organizations.length} matching organizations:\n`);

    if (organizations.length === 0) {
      console.log('❌ No organizations found matching your criteria');
      console.log('\nPossible reasons:');
      console.log('1. Organization registration was not completed successfully');
      console.log('2. Different spelling or organization name used');
      console.log('3. Registration is still in progress');
      console.log('4. Organization was registered with different email');
      
      console.log('\n💡 Suggestions:');
      console.log('1. Try searching with partial names (e.g., "University" instead of full name)');
      console.log('2. Check if registration email was received and verified');
      console.log('3. Contact system administrator for assistance');
      console.log('4. Try registering again if previous attempt failed');
    } else {
      organizations.forEach((org, index) => {
        console.log(`${index + 1}. 🏢 ${org.name}`);
        console.log(`   📋 ID: ${org.organizationId}`);
        console.log(`   🏷️  Type: ${org.type}`);
        console.log(`   📧 Email: ${org.contact?.email}`);
        console.log(`   📍 Location: ${org.contact?.address?.city}, ${org.contact?.address?.region}`);
        console.log(`   📅 Created: ${org.createdAt || org.registrationDate}`);
        
        // Status information
        const status = org.isActive ? '🟢 Active' : '🟡 Inactive';
        const verification = org.verificationStatus === 'approved' ? '✅ Approved' : 
                           org.verificationStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending';
        
        console.log(`   🔄 Status: ${status}`);
        console.log(`   ✅ Verification: ${verification}`);
        
        // Admin information
        if (org.createdBy) {
          console.log(`   👤 Admin: ${org.createdBy.name} (${org.createdBy.email})`);
        } else {
          console.log(`   👤 Admin: ⚠️  No admin user found`);
        }
        
        // Next steps based on status
        console.log(`   📋 Next Steps:`);
        if (!org.isActive && org.verificationStatus === 'pending') {
          console.log(`      1. Check email for verification link`);
          console.log(`      2. Wait for admin approval (24-48 hours)`);
          console.log(`      3. You'll receive approval notification`);
        } else if (org.isActive && org.verificationStatus === 'approved') {
          console.log(`      1. Your organization is ready to use!`);
          console.log(`      2. Log in at the organization portal`);
          console.log(`      3. Complete dashboard setup`);
        } else if (org.verificationStatus === 'rejected') {
          console.log(`      1. Contact support for rejection reason`);
          console.log(`      2. Address any issues and re-register`);
        }
        
        console.log('   ' + '─'.repeat(50));
      });

      // Show additional help
      console.log('\n💡 Additional Information:');
      console.log('• Organizations must be verified and approved before use');
      console.log('• Check your email (including spam) for verification links');
      console.log('• Approval typically takes 24-48 hours');
      console.log('• Contact support if you need immediate assistance');
      
      // Show login information
      console.log('\n🔐 How to Access Your Organization:');
      console.log('1. Wait for email verification and approval');
      console.log('2. Use the organization login page (not regular user login)');
      console.log('3. Log in with your admin email and password');
      console.log('4. Complete organization dashboard setup');
    }

    // Check for related admin users
    if (orgEmail) {
      const adminUsers = await User.find({ 
        email: { $regex: orgEmail, $options: 'i' },
        role: 'org_admin'
      });
      
      if (adminUsers.length > 0) {
        console.log(`\n👥 Related Admin Users Found:`);
        adminUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name} (${user.email})`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
          console.log(`   Organization: ${user.organization}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error searching for organization:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Search completed');
  }
};

findOrganization();