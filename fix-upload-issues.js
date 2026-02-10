const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING UPLOAD ISSUES...');
console.log('=' .repeat(50));

// 1. Check and create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
} else {
  console.log('✅ Uploads directory exists');
}

// 2. Check directory permissions
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log('✅ Uploads directory is writable');
} catch (error) {
  console.log('❌ Uploads directory is not writable:', error.message);
}

// 3. Test file creation
try {
  const testFile = path.join(uploadsDir, 'test.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ File creation test passed');
} catch (error) {
  console.log('❌ File creation test failed:', error.message);
}

// 4. Check environment variables
console.log('\n📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'not set');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'set' : 'not set');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'set' : 'not set');

// 5. Test multer dependencies
console.log('\n📦 Testing Dependencies:');
try {
  require('multer');
  console.log('✅ multer is available');
} catch (error) {
  console.log('❌ multer is missing:', error.message);
}

try {
  require('multer-storage-cloudinary');
  console.log('✅ multer-storage-cloudinary is available');
} catch (error) {
  console.log('❌ multer-storage-cloudinary is missing:', error.message);
}

try {
  require('cloudinary');
  console.log('✅ cloudinary is available');
} catch (error) {
  console.log('❌ cloudinary is missing:', error.message);
}

// 6. Test configuration loading
console.log('\n⚙️  Testing Configuration:');
try {
  const { upload, hasCloudinaryConfig } = require('./config/cloudinary');
  console.log('✅ Cloudinary config loaded successfully');
  console.log('   Has Cloudinary Config:', hasCloudinaryConfig);
  console.log('   Upload middleware:', upload ? 'available' : 'not available');
} catch (error) {
  console.log('❌ Cloudinary config failed:', error.message);
}

console.log('\n🎯 DIAGNOSIS COMPLETE!');
console.log('If you see any ❌ errors above, those need to be fixed.');
console.log('If all ✅ checks pass, the upload system should work.');