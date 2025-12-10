

// =====================================================
// PRINCIPAL REQUEST CONTROLLER (Admin Approval)
// =====================================================

// FILE: backend/src/controllers/principalRequestController.js

const bcrypt = require("bcryptjs");
const PrincipalRequest = require("../models/PrincipalRequest");
const User = require("../models/User");

const principalEmailRegex = /^.*principal.*@.+\.(edu|ac\.in)$/i;

// POST /api/principals/register (public)
exports.createRequest = async (req, res) => {
  try {
    const {
      name,
      mobile,
      collegeName,
      collegeCode,
      usnPrefix,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !mobile ||
      !collegeName ||
      !collegeCode ||
      !usnPrefix ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!principalEmailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Email must contain 'principal' and end with .edu or .ac.in",
      });
    }

    const existsInUsers = await User.findOne({ email });
    const existsInRequests = await PrincipalRequest.findOne({
      email,
      status: "pending",
    });

    if (existsInUsers || existsInRequests) {
      return res.status(400).json({
        success: false,
        message: "Request already exists for this email",
      });
    }

    const request = await PrincipalRequest.create({
      name,
      mobile,
      collegeName,
      collegeCode,
      usnPrefix,
      email,
      password, // keep plain here; hash only when creating real user
    });

    res.status(201).json({
      success: true,
      data: request,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/principals/requests (admin only)
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await PrincipalRequest.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/principals/requests/:id/approve (admin)
exports.approveRequest = async (req, res) => {
  try {
    const request = await PrincipalRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Request not found or already processed",
      });
    }

    // ✅ Create college admin user
    const user = await User.create({
      username: request.email.split("@")[0],
      email: request.email,
      password: request.password, // plain text; User pre-save hook will hash
      usn: request.usnPrefix, // Store USN prefix for principal
      collegeId: request.collegeCode,
      role: "collegeAdmin",
      profile: {
        fullName: request.name,
        department: request.collegeName,
        phone: request.mobile,
      },
      isActive: true,
    });

    console.log(
      `✅ College Admin created: ${user.email} with id: ${user._id}`
    );

    // ✅ Auto-assign this principal to students with matching USN prefix
    if (user.usn) {
      const updateResult = await User.updateMany(
        {
          role: "student",
          usn: { $regex: `^${user.usn}` }, // Match USN prefix
          principalId: null, // Only if not already assigned
        },
        { $set: { principalId: user._id } }
      );

      console.log(
        `✅ Assigned ${updateResult.modifiedCount} students to principal ${user._id}`
      );
    }

    // ✅ Update request status
    request.status = "approved";
    request.reviewedBy = req.user._id; // ✅ FIXED: use _id not id
    request.reviewedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: "Principal approved and account created",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error("Error approving request:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/principals/requests/:id/reject (admin)
exports.rejectRequest = async (req, res) => {
  try {
    const request = await PrincipalRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Request not found or already processed",
      });
    }

    request.status = "rejected";
    request.reviewedBy = req.user._id; // ✅ FIXED: use _id not id
    request.reviewedAt = new Date();
    request.notes = req.body.notes || "";
    await request.save();

    res.json({
      success: true,
      message: "Request rejected",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};