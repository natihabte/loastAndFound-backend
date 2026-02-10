const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema({
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
  dateFound: {
    type: Date,
    required: [true, 'Date found is required']
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
  // User who found the item
  foundBy: {
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
    enum: ['pending', 'verified', 'rejected', 'claimed', 'returned', 'archived'],
    default: 'pending'
  },
  // Verification workflow (Organization Admin verifies found items)
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  rejectionReason: String,
  // Storage information
  storageLocation: {
    building: String,
    room: String,
    shelf: String,
    notes: String
  },
  // Matching and claims
  potentialMatches: [{
    lostItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LostItem'
    },
    matchScore: Number,
    matchedAt: Date
  }],
  claims: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim'
  }],
  // Resolution
  returnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedAt: Date,
  returnNotes: String,
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
  // Condition assessment
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'good'
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
foundItemSchema.index({ organization: 1, status: 1 });
foundItemSchema.index({ foundBy: 1 });
foundItemSchema.index({ category: 1, status: 1 });
foundItemSchema.index({ dateFound: -1 });
foundItemSchema.index({ createdAt: -1 });
foundItemSchema.index({ 'location.building': 1, 'location.area': 1 });

// Virtual for age of item
foundItemSchema.virtual('daysInStorage').get(function() {
  return Math.floor((Date.now() - this.dateFound) / (1000 * 60 * 60 * 24));
});

// Methods
foundItemSchema.methods.canBeEditedBy = function(user) {
  return this.foundBy.toString() === user._id.toString() || 
         user.role === 'orgAdmin' || 
         user.role === 'superAdmin';
};

foundItemSchema.methods.canBeVerifiedBy = function(user) {
  return (user.role === 'orgAdmin' && user.organization.toString() === this.organization.toString()) ||
         user.role === 'superAdmin';
};

foundItemSchema.methods.canBeReturnedBy = function(user) {
  return (user.role === 'orgAdmin' && user.organization.toString() === this.organization.toString()) ||
         user.role === 'superAdmin';
};

// Static methods
foundItemSchema.statics.getByOrganization = function(organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('foundBy', 'name email')
    .populate('verifiedBy', 'name')
    .sort({ createdAt: -1 });
};

foundItemSchema.statics.getPendingVerification = function(organizationId) {
  return this.find({ organization: organizationId, status: 'pending' })
    .populate('foundBy', 'name email')
    .sort({ createdAt: -1 });
};

foundItemSchema.statics.getVerifiedItems = function(organizationId) {
  return this.find({ organization: organizationId, status: 'verified' })
    .populate('foundBy', 'name email')
    .populate('verifiedBy', 'name')
    .sort({ dateFound: -1 });
};

module.exports = mongoose.model('FoundItem', foundItemSchema);