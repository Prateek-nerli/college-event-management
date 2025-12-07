const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    collegeId: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'organizer', 'admin'],
      default: 'student',
    },

    // ============ PROFILE FIELDS ============
    profile: {
      fullName: {
        type: String,
        required: true,
      },
      department: String,
      year: Number,
      phone: String,
      avatar: {
        type: String,
        default: null,
      },
      bio: String,
      skills: String, // comma-separated
    },

    // ============ CONTACT PREFERENCES ============
    contactPreferences: {
      preferredChannel: {
        type: String,
        enum: ['email', 'whatsapp', 'in-app'],
        default: 'email',
      },
      alternateEmail: String,
      whatsappNumber: String,
    },

    // ============ NOTIFICATION SETTINGS ============
    notificationSettings: {
      email: {
        registration: {
          type: Boolean,
          default: true,
        },
        reminders: {
          type: Boolean,
          default: true,
        },
        results: {
          type: Boolean,
          default: true,
        },
        announcements: {
          type: Boolean,
          default: true,
        },
      },
      inApp: {
        announcements: {
          type: Boolean,
          default: true,
        },
        systemAlerts: {
          type: Boolean,
          default: true,
        },
        results: {
          type: Boolean,
          default: true,
        },
      },
    },

    // ============ ACCOUNT TRACKING ============
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // ============ TEAM RELATED ============
teams: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }
],

teamInvites: [
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    }
  }
]
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ============ HASH PASSWORD BEFORE SAVING ============
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============ COMPARE PASSWORD METHOD ============
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
