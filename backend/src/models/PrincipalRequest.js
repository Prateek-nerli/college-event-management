const mongoose = require("mongoose");

const principalRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    collegeName: { type: String, required: true },
    collegeCode: { type: String, required: true },
    usnPrefix: { type: String, required: true },  // NEW: e.g., "1SI", "2CS"
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrincipalRequest", principalRequestSchema);
