const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 MongoDB Connection Diagnostic Tool\n');

// Test different connection methods
const connectionTests = [
  {
    name: 'Primary MongoDB Atlas URI',
    uri: process.env.MONGODB_URI
  },
  {
    name: 'Alternative MongoDB Atlas URI',
    uri: process.env.MONGO_URI
  },
  {
    name: 'Local MongoDB (fallback)',
    uri: 'mongodb://localhost:27017/findit'
  }
];

async function testConnection(name, uri) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📡 URI: ${uri ? uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'NOT SET'}`);
  
  if (!uri) {
    console.log('❌ URI not configured');
    return false;
  }

  try {
    // Set a shorter timeout for testing
    const options = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    };

    console.log('⏳ Attempting connection...');
    await mongoose.connect(uri, options);
    
    console.log('✅ Connection successful!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port}`);
    
    await mongoose.disconnect();
    console.log('📡 Disconnected successfully');
    return true;
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    
    // Provide specific troubleshooting based on error type
    if (error.message.includes('ETIMEOUT') || error.message.includes('queryTxt')) {
      console.log('🔧 DNS/Network Issue Detected:');
      console.log('   - Check your internet connection');
      console.log('   - Try using a VPN or different network');
      console.log('   - Verify MongoDB Atlas cluster is running');
      console.log('   - Check if your IP is whitelisted in MongoDB Atlas');
    } else if (error.message.includes('authentication')) {
      console.log('🔧 Authentication Issue Detected:');
      console.log('   - Verify username and password are correct');
      console.log('   - Check if user has proper database permissions');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('🔧 DNS Resolution Issue:');
      console.log('   - Check if the cluster hostname is correct');
      console.log('   - Try flushing DNS cache');
    }
    
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    return false;
  }
}

async function checkNetworkConnectivity() {
  console.log('\n🌐 Network Connectivity Tests');
  
  try {
    // Test basic internet connectivity
    const https = require('https');
    
    await new Promise((resolve, reject) => {
      const req = https.get('https://www.google.com', { timeout: 5000 }, (res) => {
        console.log('✅ Internet connectivity: OK');
        resolve();
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
    });
    
  } catch (error) {
    console.log('❌ Internet connectivity: FAILED');
    console.log('🔧 Check your internet connection');
    return false;
  }
  
  try {
    // Test MongoDB Atlas domain resolution
    const dns = require('dns').promises;
    await dns.lookup('lost.uojr3iu.mongodb.net');
    console.log('✅ MongoDB Atlas DNS resolution: OK');
    
  } catch (error) {
    console.log('❌ MongoDB Atlas DNS resolution: FAILED');
    console.log('🔧 DNS issue detected - try using different DNS servers (8.8.8.8, 1.1.1.1)');
    return false;
  }
  
  return true;
}

async function runDiagnostics() {
  console.log('📋 Environment Information:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Mongoose: ${mongoose.version}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  
  // Check network connectivity first
  const networkOk = await checkNetworkConnectivity();
  
  if (!networkOk) {
    console.log('\n❌ Network connectivity issues detected. Fix network issues before testing MongoDB.');
    return;
  }
  
  // Test each connection method
  let successfulConnection = false;
  
  for (const test of connectionTests) {
    const success = await testConnection(test.name, test.uri);
    if (success) {
      successfulConnection = true;
      console.log(`\n🎉 Recommended connection: ${test.name}`);
      break;
    }
  }
  
  if (!successfulConnection) {
    console.log('\n❌ All connection attempts failed');
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check MongoDB Atlas cluster status');
    console.log('2. Verify IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for testing)');
    console.log('3. Try connecting from a different network/VPN');
    console.log('4. Use local MongoDB for development:');
    console.log('   - Install MongoDB locally');
    console.log('   - Update MONGODB_URI to: mongodb://localhost:27017/findit');
    console.log('5. Check MongoDB Atlas credentials');
  }
  
  console.log('\n📊 Connection Test Complete');
}

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    // Ignore
  }
  process.exit(0);
});

runDiagnostics().catch(console.error);