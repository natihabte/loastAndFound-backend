const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Local MongoDB Setup for Windows\n');

function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}`);
    return null;
  }
}

function checkIfMongoInstalled() {
  try {
    execSync('mongod --version', { stdio: 'pipe' });
    console.log('✅ MongoDB is already installed');
    return true;
  } catch (error) {
    console.log('❌ MongoDB not found');
    return false;
  }
}

function createDataDirectory() {
  const dataPath = 'C:\\data\\db';
  try {
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
      console.log(`✅ Created data directory: ${dataPath}`);
    } else {
      console.log(`✅ Data directory already exists: ${dataPath}`);
    }
    return true;
  } catch (error) {
    console.log(`❌ Failed to create data directory: ${error.message}`);
    return false;
  }
}

function startMongoDB() {
  try {
    console.log('⏳ Starting MongoDB service...');
    
    // Try to start as Windows service first
    try {
      execSync('net start MongoDB', { stdio: 'pipe' });
      console.log('✅ MongoDB service started');
      return true;
    } catch (serviceError) {
      console.log('ℹ️  MongoDB service not installed, trying manual start...');
      
      // Try manual start (this will run in background)
      const { spawn } = require('child_process');
      const mongod = spawn('mongod', ['--dbpath', 'C:\\data\\db'], {
        detached: true,
        stdio: 'ignore'
      });
      
      mongod.unref();
      
      // Wait a moment and test connection
      setTimeout(() => {
        try {
          execSync('mongo --eval "db.runCommand({ping: 1})"', { stdio: 'pipe' });
          console.log('✅ MongoDB started manually');
        } catch (testError) {
          console.log('❌ MongoDB failed to start');
        }
      }, 3000);
      
      return true;
    }
  } catch (error) {
    console.log(`❌ Failed to start MongoDB: ${error.message}`);
    return false;
  }
}

async function setupMongoDB() {
  console.log('📋 MongoDB Setup Steps:\n');
  
  // Check if MongoDB is already installed
  if (checkIfMongoInstalled()) {
    console.log('✅ MongoDB is already installed\n');
    
    // Create data directory
    createDataDirectory();
    
    // Try to start MongoDB
    startMongoDB();
    
    console.log('\n🎉 MongoDB setup complete!');
    console.log('📋 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Check connection with: node test-mongodb-connection.js');
    return;
  }
  
  console.log('❌ MongoDB not installed. Please install MongoDB manually:\n');
  console.log('📥 Installation Options:');
  console.log('\n1. 🍫 Using Chocolatey (Recommended):');
  console.log('   - Install Chocolatey: https://chocolatey.org/install');
  console.log('   - Run: choco install mongodb');
  console.log('\n2. 📦 Manual Download:');
  console.log('   - Go to: https://www.mongodb.com/try/download/community');
  console.log('   - Download MongoDB Community Server');
  console.log('   - Run the installer');
  console.log('\n3. 🐳 Using Docker:');
  console.log('   - Install Docker Desktop');
  console.log('   - Run: docker run -d -p 27017:27017 --name mongodb mongo');
  console.log('\n4. 📱 MongoDB Atlas (Cloud):');
  console.log('   - Fix DNS issues (see MONGODB_CONNECTION_FIX.md)');
  console.log('   - Or use VPN/different network');
  
  console.log('\n⚡ Quick Docker Setup:');
  console.log('If you have Docker installed, run these commands:');
  console.log('```');
  console.log('docker pull mongo');
  console.log('docker run -d -p 27017:27017 --name findit-mongo mongo');
  console.log('```');
  
  console.log('\n🔄 After installation:');
  console.log('1. Run this script again: node install-local-mongodb.js');
  console.log('2. Test connection: node test-mongodb-connection.js');
  console.log('3. Restart backend server: npm start');
}

setupMongoDB().catch(console.error);