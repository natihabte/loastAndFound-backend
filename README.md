# Public Sector Lost & Found Management SaaS Platform - Backend API

Backend API for the **Public Sector Lost & Found Management SaaS Platform** - a multi-tenant solution built with Node.js, Express, and MongoDB.

## 🏗️ Platform Overview

This is a **multi-tenant SaaS platform** designed for public sector organizations including:
- 🏫 Universities and Educational Institutions
- 🏛️ Government Offices and Agencies
- 🏥 Hospitals and Healthcare Facilities
- 🏢 Municipalities and Local Government
- 🚌 Transport Authorities and Transit Systems

## ✨ SaaS Features

- ✅ **Multi-Tenant Architecture** - Organization-based data isolation
- ✅ **Role-Based Access Control** - 5-tier permission system
- ✅ **Subscription Management** - Free/Basic/Premium/Enterprise plans
- ✅ **Organization Onboarding** - Self-service registration
- ✅ **Usage Limits** - Plan-based restrictions
- ✅ **Multi-Language Support** - EN/AM/OM/TI ready
- ✅ **Admin Dashboard** - Platform and organization management
- ✅ **Activity Logging** - Complete audit trail

## 🔐 Role Hierarchy

1. **Super Admin** - Platform owner, manages all organizations
2. **Organization Admin** - Manages organization settings and users
3. **Staff** - Manages items and approves submissions
4. **User** - Creates/edits own items, claims items
5. **Public** - Searches public items, views details

## 💰 Subscription Plans

| Plan | Users | Items | Price | Features |
|------|-------|-------|-------|----------|
| **Free** | 10 | 100 | $0 | Basic features |
| **Basic** | 50 | 500 | $29/mo | Custom branding |
| **Premium** | 200 | 2,000 | $99/mo | Advanced reports, API |
| **Enterprise** | Unlimited | Unlimited | $299/mo | Priority support |

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Multi-tenant database
- **Mongoose** - ODM with multi-tenant support
- **JWT** - Authentication and authorization
- **Nodemailer** - Email service
- **Bcrypt** - Password hashing
- **Cloudinary** - Image storage

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/findit
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

## 🌐 API Endpoints

### 🏢 Organizations
- `POST /api/organizations` - Create organization (Public)
- `GET /api/organizations` - List organizations (Super Admin)
- `GET /api/organizations/:id` - Get organization details
- `PUT /api/organizations/:id` - Update organization
- `GET /api/organizations/:id/stats` - Organization statistics

### 💳 Subscriptions
- `GET /api/subscriptions/plans` - Available plans (Public)
- `GET /api/subscriptions/current` - Current subscription
- `POST /api/subscriptions/upgrade` - Upgrade plan
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/usage` - Usage statistics

### 🔐 Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify email with OTP
- `POST /api/auth/login` - Login user
- `POST /api/auth/change-password` - Change password (Protected)

### 📦 Items (Multi-Tenant)
- `GET /api/items` - Get organization items
- `POST /api/items` - Create new item (Protected)
- `PUT /api/items/:id` - Update item (Protected)
- `DELETE /api/items/:id` - Delete item (Protected)
- `POST /api/items/:id/claim` - Claim an item (Protected)

### 👥 Users (Multi-Tenant)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users` - Get organization users (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)

## 🏢 Multi-Tenant Context

The API automatically detects organization context through:

1. **Subdomain**: `university.yourdomain.com`
2. **Header**: `X-Organization-ID: org_id`
3. **Query**: `?org=university`
4. **User Context**: From authenticated user's organization

## 🔒 Authentication

Protected routes require JWT token:
```
Authorization: Bearer <token>
```

Multi-tenant routes also require organization context.

## 📊 Database Schema

### Organization
```javascript
{
  name: String,
  slug: String,
  type: String, // university, government, hospital, etc.
  subscription: {
    plan: String,
    status: String,
    maxUsers: Number,
    maxItems: Number
  }
}
```

### User (Multi-Tenant)
```javascript
{
  organization: ObjectId, // Multi-tenant reference
  role: String, // super_admin, org_admin, staff, user, public
  permissions: [String],
  // ... other fields
}
```

### Item (Multi-Tenant)
```javascript
{
  organization: ObjectId, // Multi-tenant reference
  type: String, // lost, found
  status: String, // active, claimed, resolved
  // ... other fields
}
```

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_secret_key
FRONTEND_URL=https://yourdomain.com
```

### Infrastructure Recommendations
- **MongoDB Atlas** with sharding
- **Load balancer** for high availability
- **CDN** for static assets
- **Redis** for session management

## 📈 Monitoring

- Application monitoring (New Relic/DataDog)
- Error tracking (Sentry)
- Usage analytics per organization
- Performance metrics and alerting

## 🔧 Development

```bash
# Install nodemon globally
npm install -g nodemon

# Run with auto-reload
npm run dev

# Create test organization and users
node create-test-user.js
```

## 📄 License

MIT
