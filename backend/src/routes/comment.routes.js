const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getComments, addComment } = require('../controllers/commentController');

// All routes require login
router.get('/:eventId', protect, getComments);
router.post('/:eventId', protect, addComment);

module.exports = router;