const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    category: {
      type: String,
      required: true,
      enum: ['hackathon', 'cultural', 'workshop', 'sports', 'technical', 'competition', 'seminar'],
      index: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      name: String,
      location: String,
      capacity: Number,
    },
    dates: {
      startDate: {
        type: Date,
        required: true,
        index: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      registrationDeadline: {
        type: Date,
        required: true,
      },
    },
    poster: {
      type: String,
      default: null,
    },
    rules: [String],
    prizes: [
      {
        position: String,
        prize: String,
        amount: Number,
      },
    ],

    // ============ REGISTRATION TYPE ============
    registrationType: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual',
      required: true,
    },

    // ============ TEAM CONFIGURATION (for team-based events) ============
    teamSize: {
      min: {
        type: Number,
        default: 1,
      },
      max: {
        type: Number,
        default: 1,
      },
    },

    // ============ CAPACITY ============
    maxParticipants: {
      type: Number,
      default: 100,
    },

    // ============ INDIVIDUAL REGISTRATIONS ============
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ============ TEAM REGISTRATIONS (for team-based events) ============
    teamRegistrations: [
      {
        teamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Team',
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        members: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          },
        ],
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: true,
  }
);

// ============ VIRTUAL: Get participant count (works for both individual and team) ============
eventSchema.virtual('participantCount').get(function () {
  if (this.registrationType === 'individual') {
    return this.participants?.length || 0;
  } else {
    // Count all members in team registrations
    return (
      this.teamRegistrations?.reduce((total, reg) => total + (reg.members?.length || 0), 0) || 0
    );
  }
});

// ============ VIRTUAL: Get team count ============
eventSchema.virtual('teamCount').get(function () {
  if (this.registrationType === 'team') {
    return this.teamRegistrations?.length || 0;
  }
  return 0;
});

module.exports = mongoose.model('Event', eventSchema);
