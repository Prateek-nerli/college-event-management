const mongoose = require('mongoose');  // ← ADD THIS LINE AT TOP

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['team_invite', 'event_update', 'announcement', 'result_published'],
      default: 'team_invite',
    },
    title: {
      type: String,
      required: true,
    },
    message: String,
    data: {
      teamId: mongoose.Schema.Types.ObjectId,
      eventId: mongoose.Schema.Types.ObjectId,
      invitedBy: mongoose.Schema.Types.ObjectId,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    action: {
      type: String,
      enum: ['accept_invite', 'decline_invite', 'view_event', 'none'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
