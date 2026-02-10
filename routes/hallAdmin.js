const express = require('express');
const router = express.Router();
const { protect, hallAdminOnly } = require('../middleware/auth');

// @route   GET /api/hall-admin/dashboard
// @desc    Get hall admin dashboard data
// @access  Private/Hall Admin
router.get('/dashboard', protect, hallAdminOnly, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Hall Admin dashboard data',
      data: {
        totalOrganizations: 0,
        totalUsers: 0,
        totalItems: 0,
        recentActivity: []
      }
    });
  } catch (error) {
    console.error('Hall admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// @route   GET /api/hall-admin/test
// @desc    Test hall admin route
// @access  Public (for testing)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Hall Admin routes working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;