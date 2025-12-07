const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth.middleware');

// Public routes (anyone can access)
router.post('/register', register);
router.post('/login', login);

// Private routes (need valid JWT token)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
