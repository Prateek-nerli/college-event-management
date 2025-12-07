const mongoose = require('mongoose');  // ← ADD THIS LINE AT TOP

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    description: String,

    // Team membership
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['leader', 'accepted', 'pending'],
          default: 'pending',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Team constraints
    maxMembers: {
      type: Number,
      default: 5,
    },

    // Events
    registeredEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],

    // In-app notifications
    invitations: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined'],
          default: 'pending',
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Virtual for member count
teamSchema.virtual('memberCount').get(function () {
  return this.members?.filter((m) => m.status !== 'pending').length || 0;
});

module.exports = mongoose.model('Team', teamSchema);
