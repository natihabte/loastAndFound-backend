const express = require('express');
const router = express.Router();

// Mock items storage
let mockItems = [
  {
    id: 'item_1',
    title: 'Lost Phone',
    category: 'electronic',
    status: 'Lost',
    date: '2025-01-08',
    location: 'Central Park',
    description: 'Black phone with cracked screen, last seen near the fountain',
    contact: 'john@email.com',
    phone: '+1234567890',
    imageUrl: 'https://placehold.co/300x200/ef4444/white?text=Phone',
    owner: { name: 'John Doe', email: 'john@email.com' },
    claimed: false,
    createdAt: new Date('2025-01-08'),
    translationKey: 'lostPhone'
  },
  {
    id: 'item_2',
    title: 'Found Wallet',
    category: 'document',
    status: 'Found',
    date: '2025-01-08',
    location: 'Downtown Library',
    description: 'Brown leather wallet with credit cards and ID',
    contact: 'sarah@email.com',
    phone: '+1987654321',
    imageUrl: 'https://placehold.co/300x200/10b981/white?text=Wallet',
    owner: { name: 'Sarah Wilson', email: 'sarah@email.com' },
    claimed: false,
    createdAt: new Date('2025-01-08'),
    translationKey: 'foundWallet'
  },
  {
    id: 'item_3',
    title: 'Found Keys',
    category: 'accessory',
    status: 'Found',
    date: '2025-01-08',
    location: 'Riverside Apartments',
    description: 'Set of keys with blue keychain',
    contact: 'mike@email.com',
    phone: '+1122334455',
    imageUrl: 'https://placehold.co/300x200/f59e0b/white?text=Keys',
    owner: { name: 'Mike Johnson', email: 'mike@email.com' },
    claimed: false,
    createdAt: new Date('2025-01-08'),
    translationKey: 'foundKeys'
  },
  {
    id: 'item_4',
    title: 'Lost Backpack',
    category: 'clothing',
    status: 'Lost',
    date: '2025-01-07',
    location: 'University Campus',
    description: 'Blue Nike backpack with laptop inside',
    contact: 'member@email.com',
    phone: '+1555666777',
    imageUrl: 'https://placehold.co/300x200/3b82f6/white?text=Backpack',
    owner: { name: 'Alex Member', email: 'member@email.com' },
    claimed: false,
    createdAt: new Date('2025-01-07')
  },
  {
    id: 'item_5',
    title: 'Found Cat',
    category: 'pet',
    status: 'Found',
    date: '2025-01-07',
    location: 'Oak Street',
    description: 'Orange tabby cat, very friendly, no collar',
    contact: 'cat.lover@email.com',
    phone: '+1888999000',
    imageUrl: 'https://placehold.co/300x200/f97316/white?text=Cat',
    owner: { name: 'Cat Lover', email: 'cat.lover@email.com' },
    claimed: false,
    createdAt: new Date('2025-01-07')
  }
];

// @route   GET /api/items
// @desc    Get all items with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;
    
    let filteredItems = [...mockItems];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.location.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (category && category !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Status filter
    if (status && status !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === status);
    }

    // Sort by newest first
    filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ 
      success: true, 
      count: filteredItems.length, 
      data: filteredItems 
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/items/:id
// @desc    Get single item
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = mockItems.find(item => item.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, category, status, location, description, phone, imageUrl, contact } = req.body;

    // Basic validation
    if (!title || !category || !status || !location || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // In a real app, you would get user info from the auth token
    // For now, we'll use the contact info provided or default values
    const userEmail = contact || 'user@email.com';
    const userName = userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Anonymous User';

    const newItem = {
      id: 'item_' + Date.now(),
      title,
      category,
      status,
      date: new Date().toISOString().split('T')[0],
      location,
      description,
      phone: phone || '',
      imageUrl: imageUrl || `https://placehold.co/300x200/6b7280/white?text=${encodeURIComponent(title)}`,
      contact: userEmail,
      owner: { name: userName, email: userEmail },
      claimed: false,
      createdAt: new Date()
    };

    mockItems.unshift(newItem); // Add to beginning

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const itemIndex = mockItems.findIndex(item => item.id === req.params.id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Update item
    mockItems[itemIndex] = { ...mockItems[itemIndex], ...req.body };

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: mockItems[itemIndex]
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const itemIndex = mockItems.findIndex(item => item.id === req.params.id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    mockItems.splice(itemIndex, 1);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/items/report
// @desc    Report an item or issue to admin
// @access  Private
router.post('/report', async (req, res) => {
  try {
    const { type, itemId, reportReason, reporterInfo, organizationId } = req.body;
    
    const report = {
      id: 'report_' + Date.now(),
      type: type, // 'new_item', 'item_issue', 'general'
      itemId: itemId || null,
      reportReason: reportReason,
      reporter: reporterInfo,
      organizationId: organizationId,
      status: 'pending',
      createdAt: new Date(),
      adminNotes: ''
    };

    // In real app, save to database
    console.log('📧 ITEM REPORT RECEIVED:');
    console.log('='.repeat(50));
    console.log(`📋 Report Type: ${report.type}`);
    console.log(`👤 Reported by: ${report.reporter.name} (${report.reporter.email})`);
    console.log(`🏢 Organization: ${report.organizationId || 'General'}`);
    console.log(`📅 Report Date: ${report.createdAt.toLocaleString()}`);
    console.log(`📝 Reason: ${report.reportReason}`);
    if (report.itemId) {
      console.log(`🔗 Item ID: ${report.itemId}`);
    }
    console.log('');
    console.log('📧 Admin notification sent to: admin@platform.com');
    console.log('='.repeat(50));

    res.json({
      success: true,
      message: 'Report submitted successfully! Admin will review it shortly.',
      data: {
        reportId: report.id,
        status: report.status,
        adminContact: {
          email: 'admin@platform.com',
          phone: '+1-800-555-0123',
          expectedResponse: '24-48 hours'
        }
      }
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/items/reports
// @desc    Get all reports (admin only)
// @access  Private (Admin)
router.get('/reports', async (req, res) => {
  try {
    // Mock reports data for admin
    const mockReports = [
      {
        id: 'report_1',
        type: 'new_item',
        reportReason: 'Found laptop in library',
        reporter: { name: 'John Doe', email: 'john@email.com' },
        organizationId: 'org_1',
        status: 'pending',
        createdAt: new Date('2025-02-04'),
        adminNotes: ''
      },
      {
        id: 'report_2',
        type: 'item_issue',
        itemId: 'item_1',
        reportReason: 'This item was already returned',
        reporter: { name: 'Sarah Wilson', email: 'sarah@email.com' },
        organizationId: 'org_2',
        status: 'pending',
        createdAt: new Date('2025-02-03'),
        adminNotes: ''
      }
    ];

    res.json({
      success: true,
      data: mockReports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// @desc    Claim an item
// @access  Private
router.post('/:id/claim', async (req, res) => {
  try {
    const itemIndex = mockItems.findIndex(item => item.id === req.params.id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = mockItems[itemIndex];
    const claimerInfo = req.body.claimer || { name: 'Anonymous', email: 'user@email.com' };
    
    // Update item with claim information
    mockItems[itemIndex].claimed = true;
    mockItems[itemIndex].claimedBy = claimerInfo;
    mockItems[itemIndex].claimedAt = new Date();

    // Send notification emails (in real app, use actual email service)
    console.log('📧 CLAIM NOTIFICATION SENT:');
    console.log('='.repeat(50));
    console.log(`📋 Item: ${item.title}`);
    console.log(`👤 Claimed by: ${claimerInfo.name} (${claimerInfo.email})`);
    console.log(`📍 Location: ${item.location}`);
    console.log(`📅 Claim Date: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('📧 Notifications sent to:');
    console.log(`   • Item Owner: ${item.owner.email}`);
    console.log(`   • Platform Admin: admin@platform.com`);
    console.log(`   • Organization Admin: org-admin@${item.organization || 'platform'}.com`);
    console.log('='.repeat(50));

    // In a real application, you would send actual emails here:
    // await sendClaimNotificationEmail(item, claimerInfo);
    // await sendAdminNotificationEmail(item, claimerInfo);

    res.json({
      success: true,
      message: 'Item claimed successfully! Admin and owner have been notified.',
      data: mockItems[itemIndex],
      adminContact: {
        email: 'admin@platform.com',
        phone: '+1-800-555-0123',
        expectedResponse: '24-48 hours',
        nextSteps: [
          'Admin will verify your claim',
          'You will receive confirmation email',
          'Arrange pickup with item owner',
          'Contact admin if you need assistance'
        ]
      }
    });
  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;