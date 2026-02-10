const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
  // Multi-tenant field
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Item details
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'electronics',
      'documents',
      'clothing',
      'accessories',
      'books',
      'keys',
      'bags',
      'jewelry',
      'sports',
      'medical',
      'other'
    ]
  },
  // Location information
  location: {
    building: String,
    room: String,
    area: String,
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dateLost: {
    type: Date,
    required: [true, 'Date lost is required']
  },
  // Media attachments
  images: [{
    url: String,
    publicId: String, // For Cloudinary
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User who reported the lost item
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Contact information
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    preferredContact: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    }
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'found', 'claimed', 'archived'],
    default: 'pending'
  },
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  // Matching and claims
  potentialMatches: [{
    foundItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoundItem'
    },
    matchScore: Number,
    matchedAt: Date
  }],
  claims: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim'
  }],
  // Resolution
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolutionNotes: String,
  // Visibility and privacy
  isPublic: {
    type: Boolean,
    default: true
  },
  // Auto-archive
  autoArchiveAt: Date,
  // Metadata
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Notifications
  notificationsSent: {
    email: { sent: Boolean, sentAt: Date },
    sms: { sent: Boolean, sentAt: Date },
    push: { sent: Boolean, sentAt: Date }
  }
}, {
  timestamps: true
});

// Indexes for performance
lostItemSchema.index({ organization: 1, status: 1 });
lostItemSchema.index({ reportedBy: 1 });
lostItemSchema.index({ category: 1, status: 1 });
lostItemSchema.index({ dateLost: -1 });
lostItemSchema.index({ createdAt: -1 });
lostItemSchema.index({ 'location.building': 1, 'location.area': 1 });

// Virtual for age of report
lostItemSchema.virtual('daysLost').get(function() {
  return Math.floor((Date.now() - this.dateLost) / (1000 * 60 * 60 * 24));
});

// Methods
lostItemSchema.methods.canBeEditedBy = function(user) {
  return this.reportedBy.toString() === user._id.toString() || 
         user.role === 'orgAdmin' || 
         user.role === 'superAdmin';
};

lostItemSchema.methods.canBeApprovedBy = function(user) {
  return (user.role === 'orgAdmin' && user.organization.toString() === this.organization.toString()) ||
         user.role === 'superAdmin';
};

// Static methods
lostItemSchema.statics.getByOrganization = function(organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('reportedBy', 'name email')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });
};

lostItemSchema.statics.getPendingApproval = function(organizationId) {
  return this.find({ organization: organizationId, status: 'pending' })
    .populate('reportedBy', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('LostItem', lostItemSchema);