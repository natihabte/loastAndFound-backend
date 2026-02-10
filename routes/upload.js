const express = require('express');
const router = express.Router();
const { upload, hasCloudinaryConfig } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');

// @route   POST /api/upload
// @desc    Upload image to Cloudinary or local storage
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let imageUrl;
    let publicId;

    if (hasCloudinaryConfig) {
      // Cloudinary upload
      imageUrl = req.file.path;
      publicId = req.file.filename;
    } else {
      // Local storage fallback
      imageUrl = `/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
        publicId: publicId
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images
// @access  Private
router.post('/multiple', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      if (hasCloudinaryConfig) {
        return {
          url: file.path,
          publicId: file.filename
        };
      } else {
        return {
          url: `/uploads/${file.filename}`,
          publicId: file.filename
        };
      }
    });

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload images',
      error: error.message 
    });
  }
});

module.exports = router;
