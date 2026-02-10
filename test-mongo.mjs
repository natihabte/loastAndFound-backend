import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("🔄 Testing MongoDB connection...");
console.log("📡 Connection string:", process.env.MONGODB_URI ? "Found" : "Missing");

mongoose.connect(process.env.MONGODB_URI, {
  family: 4,
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log("✅ MongoDB connected successfully");
  console.log("📊 Database:", mongoose.connection.name);
  console.log("🌐 Host:", mongoose.connection.host);
  console.log("🔌 Port:", mongoose.connection.port);
  process.exit(0);
})
.catch(err => {
  console.error("❌ MongoDB error:", err.message);
  console.error("🔍 Error code:", err.code);
  console.error("🔍 Error type:", err.name);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log("⏰ Connection timeout after 15 seconds");
  process.exit(1);
}, 15000);