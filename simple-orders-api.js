// Simple Orders API - Alternative Implementation
const express = require('express');
const router = express.Router();

// Mock orders data for testing
const mockOrders = [
  {
    id: 'ORD-001',
    orderId: 'ORD-2024-001',
    date: '2024-02-10',
    customer: 'John Doe',
    email: 'john@example.com',
    totalPrice: 125.50,
    status: 'pending',
    items: 2,
    createdAt: new Date('2024-02-10T10:30:00Z')
  },
  {
    id: 'ORD-002',
    orderId: 'ORD-2024-002',
    date: '2024-02-09',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    totalPrice: 89.99,
    status: 'confirmed',
    items: 1,
    createdAt: new Date('2024-02-09T14:15:00Z')
  },
  {
    id: 'ORD-003',
    orderId: 'ORD-2024-003',
    date: '2024-02-08',
    customer: 'Bob Johnson',
    email: 'bob@example.com',
    totalPrice: 234.75,
    status: 'shipped',
    items: 3,
    createdAt: new Date('2024-02-08T09:45:00Z')
  },
  {
    id: 'ORD-004',
    orderId: 'ORD-2024-004',
    date: '2024-02-07',
    customer: 'Alice Brown',
    email: 'alice@example.com',
    totalPrice: 67.25,
    status: 'delivered',
    items: 1,
    createdAt: new Date('2024-02-07T16:20:00Z')
  },
  {
    id: 'ORD-005',
    orderId: 'ORD-2024-005',
    date: '2024-02-06',
    customer: 'Charlie Wilson',
    email: 'charlie@example.com',
    totalPrice: 156.80,
    status: 'processing',
    items: 2,
    createdAt: new Date('2024-02-06T11:10:00Z')
  },
  {
    id: 'ORD-006',
    orderId: 'ORD-2024-006',
    date: '2024-02-05',
    customer: 'Diana Davis',
    email: 'diana@example.com',
    totalPrice: 45.99,
    status: 'cancelled',
    items: 1,
    createdAt: new Date('2024-02-05T13:30:00Z')
  },
  {
    id: 'ORD-007',
    orderId: 'ORD-2024-007',
    date: '2024-02-04',
    customer: 'Eva Martinez',
    email: 'eva@example.com',
    totalPrice: 298.50,
    status: 'pending',
    items: 4,
    createdAt: new Date('2024-02-04T08:25:00Z')
  },
  {
    id: 'ORD-008',
    orderId: 'ORD-2024-008',
    date: '2024-02-03',
    customer: 'Frank Garcia',
    email: 'frank@example.com',
    totalPrice: 78.30,
    status: 'confirmed',
    items: 2,
    createdAt: new Date('2024-02-03T15:45:00Z')
  },
  {
    id: 'ORD-009',
    orderId: 'ORD-2024-009',
    date: '2024-02-02',
    customer: 'Grace Lee',
    email: 'grace@example.com',
    totalPrice: 189.99,
    status: 'shipped',
    items: 3,
    createdAt: new Date('2024-02-02T12:15:00Z')
  },
  {
    id: 'ORD-010',
    orderId: 'ORD-2024-010',
    date: '2024-02-01',
    customer: 'Henry Taylor',
    email: 'henry@example.com',
    totalPrice: 112.75,
    status: 'delivered',
    items: 2,
    createdAt: new Date('2024-02-01T10:00:00Z')
  }
];

// Generate more mock data for pagination testing
for (let i = 11; i <= 50; i++) {
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  const randomPrice = (Math.random() * 300 + 20).toFixed(2);
  const randomDate = new Date(2024, 1, Math.floor(Math.random() * 28) + 1);
  
  mockOrders.push({
    id: `ORD-${i.toString().padStart(3, '0')}`,
    orderId: `ORD-2024-${i.toString().padStart(3, '0')}`,
    date: randomDate.toISOString().split('T')[0],
    customer: `Customer ${i}`,
    email: `customer${i}@example.com`,
    totalPrice: parseFloat(randomPrice),
    status: randomStatus,
    items: Math.floor(Math.random() * 5) + 1,
    createdAt: randomDate
  });
}

// Simple authentication middleware
const simpleAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  // Simple token validation (in real app, verify JWT)
  const token = authHeader.split(' ')[1];
  if (token === 'admin-token' || token === 'org-admin-token') {
    req.user = { role: token === 'admin-token' ? 'hallAdmin' : 'orgAdmin' };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// GET /api/simple-orders - Get orders with sorting and pagination
router.get('/', simpleAuth, (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      search
    } = req.query;

    let filteredOrders = [...mockOrders];

    // Apply status filter
    if (status && status !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderId.toLowerCase().includes(searchLower) ||
        order.customer.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filteredOrders.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'totalPrice') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      } else if (sortBy === 'createdAt' || sortBy === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Calculate pagination info
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / limitNum);

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        limit: limitNum
      },
      filters: {
        sortBy,
        sortOrder,
        status: status || 'all',
        search: search || ''
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// GET /api/simple-orders/stats - Get order statistics
router.get('/stats', simpleAuth, (req, res) => {
  try {
    const stats = {
      totalOrders: mockOrders.length,
      totalRevenue: mockOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      avgOrderValue: mockOrders.reduce((sum, order) => sum + order.totalPrice, 0) / mockOrders.length,
      pendingOrders: mockOrders.filter(order => order.status === 'pending').length,
      completedOrders: mockOrders.filter(order => order.status === 'delivered').length,
      cancelledOrders: mockOrders.filter(order => order.status === 'cancelled').length,
      statusBreakdown: {
        pending: mockOrders.filter(order => order.status === 'pending').length,
        confirmed: mockOrders.filter(order => order.status === 'confirmed').length,
        processing: mockOrders.filter(order => order.status === 'processing').length,
        shipped: mockOrders.filter(order => order.status === 'shipped').length,
        delivered: mockOrders.filter(order => order.status === 'delivered').length,
        cancelled: mockOrders.filter(order => order.status === 'cancelled').length
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// PUT /api/simple-orders/:id/status - Update order status
router.put('/:id/status', simpleAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const orderIndex = mockOrders.findIndex(order => order.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    mockOrders[orderIndex].status = status;

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: mockOrders[orderIndex]
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// Simple login endpoint for testing
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@system.com' && password === 'admin123') {
    res.json({
      success: true,
      token: 'admin-token',
      user: { name: 'System Admin', email, role: 'hallAdmin' }
    });
  } else if (email === 'admin@aau.edu.et' && password === 'aau123456') {
    res.json({
      success: true,
      token: 'org-admin-token',
      user: { name: 'AAU Admin', email, role: 'orgAdmin' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

module.exports = router;