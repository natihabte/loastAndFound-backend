const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Multi-tenant field
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Basic item information
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
  subcategory: {
    type: String,
    trim: true
  },
  // Item status and type
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['lost', 'found'],
    lowercase: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'claimed', 'resolved', 'archived', 'pending_approval'],
    default: 'pending_approval'
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
  dateReported: {
    type: Date,
    default: Date.now
  },
  dateLostFound: {
    type: Date,
    required: [true, 'Date lost/found is required']
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
  // Contact information
  contact: {
    name: String,
    email: String,
    phone: String,
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    }
  },
  // Ownership and claims
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  // Additional metadata
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  // Matching and notifications
  potentialMatches: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    score: Number,
    matchedFields: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationsSent: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    recipient: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    }
  }],
  // Archive settings
  autoArchiveDate: Date,
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for multi-tenant queries and performance
itemSchema.index({ organization: 1, status: 1 });
itemSchema.index({ organization: 1, type: 1 });
itemSchema.index({ organization: 1, category: 1 });
itemSchema.index({ organization: 1, owner: 1 });
itemSchema.index({ organization: 1, createdAt: -1 });
itemSchema.index({ organization: 1, dateLostFound: -1 });
itemSchema.index({ organization: 1, isPublic: 1 });
itemSchema.index({ 'location.building': 1, 'location.area': 1 });
itemSchema.index({ tags: 1 });

// Text search index
itemSchema.index({
  title: 'text',
  description: 'text',
  'location.description': 'text',
  tags: 'text'
});

// Virtual for days since reported
itemSchema.virtual('daysSinceReported').get(function() {
  const now = new Date();
  const diffTime = now - this.dateReported;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for full location
itemSchema.virtual('fullLocation').get(function() {
  const loc = this.location;
  return [loc.building, loc.room, loc.area, loc.description]
    .filter(Boolean)
    .join(', ');
});

// Pre-save middleware
itemSchema.pre('save', function(next) {
  // Set auto archive date if not set
  if (!this.autoArchiveDate && this.organization) {
    // This would be set based on organization settings
    // For now, default to 90 days
    this.autoArchiveDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  
  // Update status based on claims
  if (this.claimedBy && this.status === 'active') {
    this.status = 'claimed';
    this.claimedAt = new Date();
  }
  
  next();
});

// Static method to find potential matches
itemSchema.statics.findPotentialMatches = async function(item) {
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  
  const matches = await this.find({
    organization: item.organization,
    type: oppositeType,
    status: 'active',
    category: item.category,
    _id: { $ne: item._id }
  }).limit(10);
  
  // Simple matching algorithm - can be enhanced with ML
  return matches.map(match => ({
    item: match._id,
    score: calculateMatchScore(item, match),
    matchedFields: getMatchedFields(item, match)
  }));
};

// Helper function to calculate match score
function calculateMatchScore(item1, item2) {
  let score = 0;
  
  // Category match
  if (item1.category === item2.category) score += 30;
  
  // Location proximity
  if (item1.location.building === item2.location.building) score += 20;
  if (item1.location.area === item2.location.area) score += 15;
  
  // Date proximity (within 7 days)
  const dateDiff = Math.abs(item1.dateLostFound - item2.dateLostFound);
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) score += 20;
  
  // Title/description similarity (basic keyword matching)
  const keywords1 = item1.title.toLowerCase().split(' ');
  const keywords2 = item2.title.toLowerCase().split(' ');
  const commonKeywords = keywords1.filter(word => keywords2.includes(word));
  score += commonKeywords.length * 5;
  
  return Math.min(score, 100);
}

// Helper function to get matched fields
function getMatchedFields(item1, item2) {
  const fields = [];
  
  if (item1.category === item2.category) fields.push('category');
  if (item1.location.building === item2.location.building) fields.push('building');
  if (item1.location.area === item2.location.area) fields.push('area');
  
  return fields;
}

// Method to increment view count
itemSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to add potential match
itemSchema.methods.addPotentialMatch = function(matchData) {
  this.potentialMatches.push(matchData);
  return this.save();
};

module.exports = mongoose.model('Item', itemSchema);
