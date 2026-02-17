const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const organizationRoutes = require('./routes/organizations');
const orderRoutes = require('./routes/orders');

const app = express();

// Global variable to track database status
global.isDatabaseConnected = false;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory (for local file storage fallback)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/orders', orderRoutes);

// API Info route
app.get('/api', (req, res) => {
  res.json({ 
    name: 'FindIt API',
    version: '1.0.0',
    status: 'running',
    database: global.isDatabaseConnected ? 'MongoDB Connected' : 'Mock Database Mode',
    endpoints: {
      auth: '/api/auth',
      items: '/api/items', 
      users: '/api/users',
      upload: '/api/upload',
      admin: '/api/admin',
      superAdmin: '/api/super-admin',
      orgAdmin: '/api/org-admin',
      organizations: '/api/organizations',
      orders: '/api/orders',
      health: '/api/health'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FindIt API is running',
    database: global.isDatabaseConnected ? 'Connected' : 'Mock Mode',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// MongoDB Connection
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/findit';

// Start server regardless of MongoDB connection
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

// MongoDB Connection with improved error handling and fallbacks
const connectDB = async () => {
  const connectionOptions = [
    {
      name: 'Primary MongoDB',
      uri: MONGODB_URI,
      options: {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
      }
    },
    {
      name: 'Local MongoDB Fallback',
      uri: 'mongodb://localhost:27017/findit',
      options: {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 5000,
      }
    }
  ];

  for (const connection of connectionOptions) {
    try {
      console.log(`🔄 Trying ${connection.name}...`);
      console.log(`📡 URI: ${connection.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      
      await mongoose.connect(connection.uri, connection.options);
      
      console.log(`✅ ${connection.name} Connected Successfully!`);
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      console.log(`🔌 Port: ${mongoose.connection.port}`);
      console.log('🎉 Database ready for production use!');
      global.isDatabaseConnected = true;
      return true;
      
    } catch (error) {
      console.error(`❌ ${connection.name} failed:`, error.message);
      
      if (error.message.includes('ETIMEOUT') || error.message.includes('queryTxt')) {
        console.log('🔧 DNS/Network issue detected');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('🔧 Connection refused - MongoDB may not be running locally');
      }
      
      // Try to disconnect before next attempt
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
    }
  }
  
  console.log('\n❌ All MongoDB connection attempts failed');
  console.log('🔧 Running in mock data mode');
  console.log('📋 To fix this:');
  console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
  console.log('   2. Start MongoDB service: mongod --dbpath C:\\data\\db');
  console.log('   3. Or fix MongoDB Atlas DNS issues (see MONGODB_CONNECTION_FIX.md)');
  console.log('\n⚠️  Server will continue with mock database functionality');
  console.log('🔧 Mock database includes:');
  console.log('   - Admin user: admin@platform.com / admin123');
  console.log('   - Test user: test@example.com / password123');
  console.log('   - Sample activities and items');
  global.isDatabaseConnected = false;
  return false;
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Start MongoDB connection (non-blocking)
connectDB().then(connected => {
  if (connected) {
    console.log('🎉 Database ready for production use!');
  } else {
    console.log('🔧 Running in development mode with mock data');
  }
});
