const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth.middleware');

// ============ GET MY NOTIFICATIONS ============
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('data.invitedBy', 'username profile.fullName')
      .populate('data.teamId', 'name')
      .sort({ createdAt: -1 });

   // console.log('Fetched notifications:', notifications);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ MARK AS READ ============
router.put('/:notificationId/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    console.log('Marked as read:', notification);

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ DELETE NOTIFICATION ============
router.delete('/:notificationId', protect, async (req, res) => {
  try {
    console.log('Deleting notification:', req.params.notificationId);

    const notification = await Notification.findByIdAndDelete(
      req.params.notificationId
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    console.log('Deleted notification:', notification);

    res.json({
      success: true,
      message: 'Notification deleted',
      data: notification,
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
