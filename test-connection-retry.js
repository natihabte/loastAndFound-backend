const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔄 Mongoose Connection Retry Test\n');

const connectionStrings = [
  {
    name: 'Primary Atlas Connection',
    uri: process.env.MONGODB_URI
  },
  {
    name: 'Alternative Atlas Connection',
    uri: 'mongodb+srv://natnaelargawnatnael_db_user:tgU8nHFHWhyfsQmK@lost.uojr3iu.mongodb.net/findit?retryWrites=true&w=majority&appName=lost'
  }
];

const testConnections = async () => {
  for (const conn of connectionStrings) {
    console.log(`⏳ Testing: ${conn.name}`);
    
    if (!conn.uri) {
      console.log('❌ URI not configured\n');
      continue;
    }
    
    try {
      // Create a new connection instance
      const connection = mongoose.createConnection();
      
      await connection.openUri(conn.uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 8000,
        maxPoolSize: 1,
        retryWrites: true,
        w: 'majority'
      });
      
      console.log('✅ Connection successful!');
      console.log(`📊 Database: ${connection.name}`);
      console.log(`🌐 Host: ${connection.host}`);
      
      // Quick test - check organizations
      const Organization = connection.model('Organization', new mongoose.Schema({}, { strict: false }));
      const orgCount = await Organization.countDocuments();
      console.log(`🏢 Organizations found: ${orgCount}`);
      
      if (orgCount > 0) {
        const orgs = await Organization.find({}, 'name organizationId').limit(5);
        orgs.forEach(org => {
          console.log(`   - ${org.name} (${org.organizationId})`);
        });
      }
      
      await connection.close();
      console.log('✅ Test completed successfully\n');
      return true;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      
      // Specific error handling
      if (error.message.includes('ENOTFOUND') || error.message.includes('queryTxt')) {
        console.log('🔧 DNS/Network issue - try VPN or different network');
      } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
        console.log('🔧 IP whitelist issue - check MongoDB Atlas network settings');
      } else if (error.message.includes('authentication')) {
        console.log('🔧 Authentication issue - check username/password');
      }
      console.log('');
    }
  }
  
  console.log('📊 Final Status: All connection attempts failed');
  console.log('💡 Possible solutions:');
  console.log('   1. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
  console.log('   2. Try different network/VPN');
  console.log('   3. Verify MongoDB Atlas cluster is running');
  console.log('   4. Check if credentials are still valid');
  
  return false;
};

testConnections();