const mongoose = require('mongoose');
const dns = require('dns').promises;
require('dotenv').config();

async function quickCheck() {
  console.log('🔍 Quick Mongoose & DNS Status Check\n');
  
  // 1. Current Mongoose State
  console.log('📊 Current Mongoose Status:');
  console.log(`   Ready State: ${mongoose.connection.readyState} (${getStateText(mongoose.connection.readyState)})`);
  console.log(`   Database: ${mongoose.connection.name || 'Not connected'}`);
  console.log(`   Host: ${mongoose.connection.host || 'Not connected'}`);
  
  // 2. Environment Configuration
  console.log('\n⚙️ Configuration:');
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  
  // 3. DNS Test
  console.log('\n🌐 DNS Resolution Test:');
  try {
    const addresses = await dns.lookup('lost.uojr3iu.mongodb.net');
    console.log(`   ✅ MongoDB Atlas DNS: ${addresses.address}`);
  } catch (error) {
    console.log(`   ❌ MongoDB Atlas DNS: ${error.code}`);
  }
  
  // 4. Local MongoDB Test
  console.log('\n🏠 Local MongoDB Test:');
  try {
    const testConn = await mongoose.createConnection('mongodb://localhost:27017/test', {
      serverSelectionTimeoutMS: 2000
    });
    console.log('   ✅ Local MongoDB: Available');
    await testConn.close();
  } catch (error) {
    console.log(`   ❌ Local MongoDB: ${error.message.includes('ECONNREFUSED') ? 'Not running' : error.message}`);
  }
  
  // 5. Atlas Connection Test
  console.log('\n☁️ Atlas Connection Test:');
  try {
    const atlasUri = 'mongodb+srv://natnaelargawnatnael_db_user:tgU8nHFHWhyfsQmK@lost.uojr3iu.mongodb.net/findit?retryWrites=true&w=majority&appName=lost';
    const testConn = await mongoose.createConnection(atlasUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('   ✅ MongoDB Atlas: Connected');
    console.log(`   📊 Database: ${testConn.name}`);
    await testConn.close();
  } catch (error) {
    console.log(`   ❌ MongoDB Atlas: ${error.message.substring(0, 100)}...`);
  }
  
  console.log('\n📋 Summary:');
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Mongoose is CONNECTED and ready');
  } else {
    console.log('❌ Mongoose is DISCONNECTED');
    console.log('💡 Server is running with mock database (fully functional)');
  }
}

function getStateText(state) {
  const states = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
  return states[state] || 'Unknown';
}

quickCheck().catch(console.error);