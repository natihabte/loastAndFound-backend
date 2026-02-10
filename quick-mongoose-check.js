const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Quick Mongoose Connection Check\n');

const testConnection = async () => {
  try {
    console.log('📋 Configuration:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
    console.log(`   URI Preview: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 50) + '...' : 'N/A'}`);
    
    console.log('\n⏳ Testing connection...');
    
    // Connect with timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ Connection successful!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port}`);
    console.log(`📈 Ready State: ${mongoose.connection.readyState} (Connected)`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.length} found`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log(`🔧 Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 DNS resolution failed - check internet connection');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Authentication failed - check credentials');
    } else if (error.message.includes('IP')) {
      console.log('💡 IP not whitelisted - check MongoDB Atlas network access');
    }
    
    return false;
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n✅ Disconnected cleanly');
    } catch (e) {
      // Ignore disconnect errors
    }
  }
};

testConnection();