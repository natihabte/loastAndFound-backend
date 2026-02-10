const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, hallAdminOnly, orgAdminOrHigher, enforceOrganizationScope } = require('../middleware/auth');

// @route   GET /api/orders/admin
// @desc    Get all orders for admin (with sorting, filtering, pagination)
// @access  Admin only
router.get('/admin', protect, orgAdminOrHigher, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      search,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount
    } = req.query;

    // Validate sort parameters
    const validSortFields = ['createdAt', 'totalPrice', 'status', 'orderId', 'updatedAt'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`
      });
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort order. Must be "asc" or "desc"'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
      });
    }

    // For organization admins, enforce organization scope
    const organizationId = req.user.role === 'hallAdmin' ? null : req.user.organization;

    const options = {
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
      status,
      organizationId,
      search,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount
    };

    const result = await Order.getAdminOrders(options);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
      filters: {
        sortBy,
        sortOrder,
        status,
        search,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount
      }
    });

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/admin/stats
// @desc    Get order statistics for admin dashboard
// @access  Admin only
router.get('/admin/stats', protect, orgAdminOrHigher, async (req, res) => {
  try {
    // For organization admins, enforce organization scope
    const organizationId = req.user.role === 'hallAdmin' ? null : req.user.organization;
    
    const stats = await Order.getOrderStats(organizationId);
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/admin/:id
// @desc    Get single order details for admin
// @access  Admin only
router.get('/admin/:id', protect, orgAdminOrHigher, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build query with organization scope for org admins
    const query = { _id: id };
    if (req.user.role !== 'hallAdmin') {
      query.organizationId = req.user.organization;
    }

    const order = await Order.findOne(query)
      .populate('userId', 'name email phone')
      .populate('organizationId', 'name contact')
      .populate('items.itemId', 'name description');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/orders/admin/:id/status
// @desc    Update order status
// @access  Admin only
router.put('/admin/:id/status', protect, orgAdminOrHigher, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Build query with organization scope for org admins
    const query = { _id: id };
    if (req.user.role !== 'hallAdmin') {
      query.organizationId = req.user.organization;
    }

    const updateData = { 
      status,
      updatedAt: new Date()
    };

    if (adminNotes) updateData.adminNotes = adminNotes;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    
    // Set timestamps for specific statuses
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const order = await Order.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/orders/admin/:id
// @desc    Delete order (Hall Admin only)
// @access  Hall Admin only
router.delete('/admin/:id', protect, hallAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/orders/admin/bulk-update
// @desc    Bulk update order statuses
// @access  Admin only
router.post('/admin/bulk-update', protect, orgAdminOrHigher, async (req, res) => {
  try {
    const { orderIds, status, adminNotes } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Build query with organization scope for org admins
    const query = { _id: { $in: orderIds } };
    if (req.user.role !== 'hallAdmin') {
      query.organizationId = req.user.organization;
    }

    const updateData = { 
      status,
      updatedAt: new Date()
    };

    if (adminNotes) updateData.adminNotes = adminNotes;

    const result = await Order.updateMany(query, updateData);

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} orders`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error bulk updating orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;