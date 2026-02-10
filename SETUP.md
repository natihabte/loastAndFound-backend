# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB (if not installed)
# Windows: Download from https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Use in .env file

### 3. Configure Environment Variables
```bash
# Copy example file
cp .env.example .env

# Edit .env file with your settings
```

**Required Variables:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/findit
JWT_SECRET=your_random_secret_key_min_32_chars
JWT_EXPIRE=7d

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

FRONTEND_URL=http://localhost:3000
```

### 4. Gmail App Password Setup
1. Go to Google Account settings
2. Security → 2-Step Verification (enable it)
3. Security → App passwords
4. Generate password for "Mail"
5. Use generated password in EMAIL_PASSWORD

### 5. Run the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 6. Test the API
```bash
# Health check
curl http://localhost:5000/api/health

# Should return: {"status":"OK","message":"FindIt API is running"}
```

## Testing Endpoints

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "+1234567890"
  }'
```

### Verify Email
```bash
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Create Item (Protected)
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Lost Phone",
    "category": "electronic",
    "status": "Lost",
    "description": "Black phone",
    "location": "Central Park",
    "contact": "test@example.com",
    "phone": "+1234567890"
  }'
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running
```bash
mongod
```

### Email Not Sending
**Solution:** 
1. Check EMAIL_USER and EMAIL_PASSWORD in .env
2. Enable "Less secure app access" or use App Password
3. Check console logs for verification code in development

### JWT Error
```
Error: secretOrPrivateKey must have a value
```
**Solution:** Set JWT_SECRET in .env file

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in .env or kill process using port 5000

## Project Structure
```
backend/
├── models/           # Database models
│   ├── User.js
│   └── Item.js
├── routes/           # API routes
│   ├── auth.js
│   ├── items.js
│   └── users.js
├── middleware/       # Custom middleware
│   └── auth.js
├── utils/           # Utility functions
│   └── email.js
├── server.js        # Entry point
├── package.json
└── .env
```

## Next Steps

1. ✅ Backend is running
2. Connect frontend to backend API
3. Test all features
4. Deploy to production

## Support

For issues, check:
- MongoDB is running
- .env file is configured
- All dependencies installed
- Port 5000 is available
