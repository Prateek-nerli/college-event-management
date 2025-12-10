const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    type: {
      type: String,
      enum: ['participation', 'winner', 'runner_up', 'appreciation'],
      default: 'participation',
    },
    fileUrl: {
      type: String,          // e.g. "/uploads/certificates/<eventId>/<userId>.pdf"
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    certificateId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
