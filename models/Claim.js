const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  // Multi-tenant field
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Claim details
  claimType: {
    type: String,
    enum: ['lost_item', 'found_item'],
    required: true
  },
  // Reference to the item being claimed
  lostItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem'
  },
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem'
  },
  // Claimant information
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Claim verification
  claimDescription: {
    type: String,
    required: [true, 'Claim description is required'],
    maxlength: [1000, 'Claim description cannot exceed 1000 characters']
  },
  // Proof of ownership
  proofOfOwnership: [{
    type: {
      type: String,
      enum: ['image', 'document', 'receipt', 'description', 'other'],
      required: true
    },
    url: String, // For uploaded files
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Additional verification questions
  verificationAnswers: [{
    question: String,
    answer: String
  }],
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Approval workflow
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
  // Completion tracking
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  completionNotes: String,
  // Contact and meeting information
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
  meetingDetails: {
    scheduledAt: Date,
    location: String,
    notes: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  urgencyReason: String,
  // Notifications
  notificationsSent: {
    claimSubmitted: { sent: Boolean, sentAt: Date },
    claimApproved: { sent: Boolean, sentAt: Date },
    claimRejected: { sent: Boolean, sentAt: Date },
    meetingScheduled: { sent: Boolean, sentAt: Date },
    itemReturned: { sent: Boolean, sentAt: Date }
  },
  // Metadata
  tags: [String],
  internalNotes: String // For admin use only
}, {
  timestamps: true
});

// Indexes for performance
claimSchema.index({ organization: 1, status: 1 });
claimSchema.index({ claimedBy: 1 });
claimSchema.index({ lostItem: 1 });
claimSchema.index({ foundItem: 1 });
claimSchema.index({ reviewedBy: 1 });
claimSchema.index({ createdAt: -1 });
claimSchema.index({ status: 1, createdAt: -1 });

// Virtual for claim age
claimSchema.virtual('daysOld').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Validation to ensure either lostItem or foundItem is provided
claimSchema.pre('validate', function(next) {
  if (!this.lostItem && !this.foundItem) {
    next(new Error('Either lostItem or foundItem must be specified'));
  } else if (this.lostItem && this.foundItem) {
    next(new Error('Cannot claim both lost and found item in the same claim'));
  } else {
    next();
  }
});

// Methods
claimSchema.methods.canBeReviewedBy = function(user) {
  return (user.role === 'orgAdmin' && user.organization.toString() === this.organization.toString()) ||
         user.role === 'superAdmin';
};

claimSchema.methods.canBeViewedBy = function(user) {
  return this.claimedBy.toString() === user._id.toString() ||
         (user.role === 'orgAdmin' && user.organization.toString() === this.organization.toString()) ||
         user.role === 'superAdmin';
};

claimSchema.methods.getItemReference = function() {
  return this.lostItem || this.foundItem;
};

claimSchema.methods.getClaimType = function() {
  return this.lostItem ? 'lost_item' : 'found_item';
};

// Static methods
claimSchema.statics.getByOrganization = function(organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('claimedBy', 'name email phone')
    .populate('reviewedBy', 'name')
    .populate('lostItem', 'title category dateLost')
    .populate('foundItem', 'title category dateFound')
    .sort({ createdAt: -1 });
};

claimSchema.statics.getPendingClaims = function(organizationId) {
  return this.find({ organization: organizationId, status: 'pending' })
    .populate('claimedBy', 'name email phone')
    .populate('lostItem', 'title category dateLost')
    .populate('foundItem', 'title category dateFound')
    .sort({ createdAt: -1 });
};

claimSchema.statics.getClaimsByUser = function(userId) {
  return this.find({ claimedBy: userId })
    .populate('lostItem', 'title category dateLost')
    .populate('foundItem', 'title category dateFound')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
};

claimSchema.statics.getClaimsForItem = function(itemId, itemType) {
  const query = itemType === 'lost' ? { lostItem: itemId } : { foundItem: itemId };
  return this.find(query)
    .populate('claimedBy', 'name email phone')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Claim', claimSchema);