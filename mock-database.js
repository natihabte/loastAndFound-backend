// Mock Database for Development (when MongoDB is not available)

let mockUsers = [
  {
    _id: 'mock_admin_1',
    name: 'Admin User',
    email: 'admin@platform.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO8G', // admin123
    role: 'admin',
    isVerified: true,
    status: 'active',
    createdAt: new Date(),
    lastLogin: new Date(),
    loginCount: 1
  },
  {
    _id: 'mock_hall_admin_1',
    name: 'System Administrator',
    email: 'admin@system.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO8G', // admin123
    role: 'hallAdmin',
    isVerified: true,
    status: 'active',
    createdAt: new Date(),
    lastLogin: new Date(),
    loginCount: 1
  },
  {
    _id: 'mock_user_1',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
    role: 'user',
    isVerified: true,
    status: 'active',
    phone: '+1234567890',
    createdAt: new Date(),
    lastLogin: new Date(),
    loginCount: 5
  }
];

let mockOrganizations = [
  {
    _id: 'org_1',
    name: 'hp',
    organizationId: 'OTH-hp-0889',
    slug: 'hp',
    type: 'other',
    sectorLevel: 'local',
    description: 'HP Organization - local level',
    adminId: 'mock_hall_admin_1',
    contact: {
      email: 'contact@hp.com',
      phone: '+251911123456',
      address: {
        street: 'HP Street',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        country: 'Ethiopia',
        postalCode: '1000'
      }
    },
    settings: {
      language: 'en',
      timezone: 'Africa/Addis_Ababa',
      allowPublicSearch: true,
      requireApproval: true
    },
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      maxUsers: 10,
      maxItems: 100,
      features: {
        customBranding: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        multiLanguage: true
      }
    },
    isActive: true,
    registrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    verificationStatus: 'verified',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    createdBy: 'mock_hall_admin_1'
  },
  {
    _id: 'org_2',
    name: 'Hawassa University',
    organizationId: 'HU001',
    slug: 'hawassa-university',
    type: 'university',
    sectorLevel: 'regional',
    description: 'Hawassa University - regional level',
    adminId: 'mock_hall_admin_1',
    contact: {
      email: 'admin@hu.edu.et',
      phone: '+251461120000',
      address: {
        street: 'University Avenue',
        city: 'Hawassa',
        region: 'SNNPR',
        country: 'Ethiopia',
        postalCode: '05'
      }
    },
    settings: {
      language: 'en',
      timezone: 'Africa/Addis_Ababa',
      allowPublicSearch: true,
      requireApproval: true
    },
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      maxUsers: 10,
      maxItems: 100,
      features: {
        customBranding: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        multiLanguage: true
      }
    },
    isActive: true,
    registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    verificationStatus: 'verified',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    createdBy: 'mock_hall_admin_1'
  },
  {
    _id: 'org_3',
    name: 'Addis Ababa University',
    organizationId: 'AAU001',
    slug: 'addis-ababa-university',
    type: 'university',
    sectorLevel: 'federal',
    description: 'Addis Ababa University - federal level',
    adminId: 'mock_hall_admin_1',
    contact: {
      email: 'admin@aau.edu.et',
      phone: '+251111239768',
      address: {
        street: 'Algeria Street',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        country: 'Ethiopia',
        postalCode: '1176'
      }
    },
    settings: {
      language: 'en',
      timezone: 'Africa/Addis_Ababa',
      allowPublicSearch: true,
      requireApproval: true
    },
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      maxUsers: 10,
      maxItems: 100,
      features: {
        customBranding: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        multiLanguage: true
      }
    },
    isActive: true,
    registrationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    verificationStatus: 'verified',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    createdBy: 'mock_hall_admin_1'
  }
];

let mockActivities = [
  {
    _id: 'activity_1',
    user: 'mock_user_1',
    action: 'user_registered',
    description: 'New user registered: Test User (test@example.com)',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    metadata: { email: 'test@example.com', registrationMethod: 'email' }
  },
  {
    _id: 'activity_2',
    user: 'mock_admin_1',
    action: 'admin_login',
    description: 'Admin logged in: admin@platform.com',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    metadata: { email: 'admin@platform.com', role: 'admin' }
  }
];

let mockItems = [
  {
    _id: 'item_1',
    title: 'Lost iPhone 13',
    description: 'Black iPhone 13 lost near library',
    category: 'Electronics',
    status: 'Lost',
    location: 'University Library',
    owner: 'mock_user_1',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    claimed: false
  }
];

class MockDatabase {
  constructor() {
    console.log('🔧 Mock Database initialized');
    console.log('📊 Mock data loaded:');
    console.log(`   - Users: ${mockUsers.length}`);
    console.log(`   - Organizations: ${mockOrganizations.length}`);
    console.log(`   - Activities: ${mockActivities.length}`);
    console.log(`   - Items: ${mockItems.length}`);
  }

  // User operations
  async findUser(query) {
    if (query.email) {
      return mockUsers.find(user => user.email === query.email);
    }
    if (query._id) {
      return mockUsers.find(user => user._id === query._id);
    }
    return null;
  }

  async createUser(userData) {
    const newUser = {
      _id: `mock_user_${Date.now()}`,
      ...userData,
      createdAt: new Date(),
      loginCount: 0,
      status: 'active'
    };
    mockUsers.push(newUser);
    console.log(`👤 Mock user created: ${newUser.email}`);
    return newUser;
  }

  async updateUser(userId, updateData) {
    const userIndex = mockUsers.findIndex(user => user._id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updateData };
      console.log(`👤 Mock user updated: ${userId}`);
      return mockUsers[userIndex];
    }
    return null;
  }

  async getAllUsers() {
    return mockUsers.filter(user => user.role !== 'admin');
  }

  // Activity operations
  async logActivity(userId, action, description, metadata = {}, req = null) {
    const activity = {
      _id: `activity_${Date.now()}`,
      user: userId,
      action,
      description,
      metadata,
      timestamp: new Date(),
      ipAddress: req?.ip || '127.0.0.1',
      userAgent: req?.get('User-Agent') || 'Unknown'
    };
    
    mockActivities.unshift(activity); // Add to beginning
    
    // Keep only last 100 activities
    if (mockActivities.length > 100) {
      mockActivities = mockActivities.slice(0, 100);
    }
    
    console.log(`📊 Mock activity logged: ${action} for ${userId}`);
    return activity;
  }

  async getActivities(limit = 50) {
    return mockActivities.slice(0, limit).map(activity => ({
      ...activity,
      user: mockUsers.find(user => user._id === activity.user) || { name: 'Unknown User', email: 'unknown@example.com' }
    }));
  }

  // Organization operations
  async getAllOrganizations() {
    return mockOrganizations;
  }

  async findOrganization(query) {
    if (query._id) {
      return mockOrganizations.find(org => org._id === query._id);
    }
    if (query.organizationId) {
      return mockOrganizations.find(org => org.organizationId === query.organizationId);
    }
    if (query.name) {
      return mockOrganizations.find(org => org.name === query.name);
    }
    return null;
  }

  async createOrganization(orgData) {
    const newOrg = {
      _id: `org_${Date.now()}`,
      ...orgData,
      createdAt: new Date(),
      registrationDate: new Date(),
      isActive: false,
      verificationStatus: 'pending'
    };
    mockOrganizations.push(newOrg);
    console.log(`🏢 Mock organization created: ${newOrg.name}`);
    return newOrg;
  }

  // Item operations
  async getAllItems() {
    return mockItems;
  }

  async createItem(itemData) {
    const newItem = {
      _id: `item_${Date.now()}`,
      ...itemData,
      createdAt: new Date(),
      claimed: false
    };
    mockItems.push(newItem);
    console.log(`📦 Mock item created: ${newItem.title}`);
    return newItem;
  }

  // Statistics
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      users: {
        total: mockUsers.length,
        active: mockUsers.filter(u => u.status === 'active').length,
        newToday: mockUsers.filter(u => new Date(u.createdAt) >= today).length,
        newThisWeek: mockUsers.filter(u => new Date(u.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length
      },
      activities: {
        total: mockActivities.length,
        today: mockActivities.filter(a => new Date(a.timestamp) >= today).length,
        thisWeek: mockActivities.filter(a => new Date(a.timestamp) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length
      },
      items: {
        total: mockItems.length,
        today: mockItems.filter(i => new Date(i.createdAt) >= today).length,
        thisWeek: mockItems.filter(i => new Date(i.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length
      }
    };
  }
}

module.exports = new MockDatabase();