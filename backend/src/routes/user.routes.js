const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

// ============ SEARCH USER BY EMAIL (MUST BE BEFORE /:userId) ============
router.get('/search', protect, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id username email profile.fullName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET /api/users/me - Get current user profile ============
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('teams', 'name')
      .populate('teamInvites.teamId', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET /api/users/me/stats - Get user statistics ============
router.get('/me/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all events
    const Event = require('../models/Event');
    const allEvents = await Event.find();

    // Count registered events
    const registeredCount = allEvents.filter((event) =>
      event.participants?.some((p) => p.toString() === userId)
    ).length;

    // Count organized events
    const organizedCount = allEvents.filter(
      (event) => event.organizerId?.toString() === userId
    ).length;

    // Count upcoming registered events
    const upcomingRegistered = allEvents.filter((event) => {
      const isRegistered = event.participants?.some((p) => p.toString() === userId);
      const isUpcoming = new Date(event.dates?.startDate) > new Date();
      return isRegistered && isUpcoming;
    }).length;

    // Placeholder for certificates (will be added later)
    const certificatesCount = 0;

    res.json({
      success: true,
      data: {
        registeredCount,
        organizedCount,
        upcomingRegistered,
        certificatesCount,
      },
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ============ PUT /api/users/me - Update current user ============
router.put('/me', protect, async (req, res) => {
  try {
    const allowedFields = [
      'profile.fullName',
      'profile.department',
      'profile.year',
      'profile.phone',
      'profile.avatar',
      'profile.bio',
      'profile.skills',
      'contactPreferences.preferredChannel',
      'contactPreferences.alternateEmail',
      'contactPreferences.whatsappNumber',
      'notificationSettings.email.registration',
      'notificationSettings.email.reminders',
      'notificationSettings.email.results',
      'notificationSettings.email.announcements',
      'notificationSettings.inApp.announcements',
      'notificationSettings.inApp.systemAlerts',
      'notificationSettings.inApp.results',
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ POST /api/users/change-password ============
router.post('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if old password matches
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET /api/users/:userId - Get user by ID (MUST BE LAST) ============
router.get('/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
