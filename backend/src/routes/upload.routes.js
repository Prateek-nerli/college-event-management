const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/auth.middleware');

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Determine resource type (image for poster, raw/auto for PDF)
    const resourceType = req.file.mimetype.startsWith('image') ? 'image' : 'raw';

    // Upload to Cloudinary stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'event-assets',
        resource_type: resourceType, 
        format: resourceType === 'raw' ? 'pdf' : undefined, // Force PDF extension for docs
      },
      (error, result) => {
        if (error) return res.status(500).json({ message: 'Cloudinary upload failed', error });
        
        // Return the secure URL
        res.json({ 
          success: true, 
          url: result.secure_url,
          filename: result.original_filename
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;