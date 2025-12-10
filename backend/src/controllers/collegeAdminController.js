// controllers/collegeAdminController.js
const User = require("../models/User");
// If you have an Event model, later you can:
// const Event = require("../models/Event");

// ================= GET OVERVIEW =================
// GET /api/college-admin/overview
exports.getOverview = async (req, res) => {
  try {
    const collegeAdminId = req.user._id;

    // Count students under this college admin
    const totalStudents = await User.countDocuments({
      principalId: collegeAdminId,
      role: "student",
    });

    // Count organizers under this college admin
    const totalOrganizers = await User.countDocuments({
      principalId: collegeAdminId,
      role: "organizer",
    });

    // For now, no Event model hooked → keep 0
    const totalEvents = 0;
    const upcomingEvents = 0;

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalOrganizers,
        totalEvents,
        upcomingEvents,
      },
    });
  } catch (err) {
    console.error("❌ getOverview error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load overview",
      error: err.message,
    });
  }
};

// ================= GET STUDENTS =================
// GET /api/college-admin/students
exports.getStudents = async (req, res) => {
  try {
    const collegeAdminId = req.user._id;

    const students = await User.find({
      principalId: collegeAdminId, // mapping student → college admin
      role: "student",
    }).lean();

    res.json({ success: true, data: students });
  } catch (err) {
    console.error("❌ getStudents error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load students",
      error: err.message,
    });
  }
};

// ================= GET ORGANIZERS =================
// GET /api/college-admin/organizers
exports.getOrganizers = async (req, res) => {
  try {
    const collegeAdminId = req.user._id;

    const organizers = await User.find({
      principalId: collegeAdminId,
      role: "organizer",
    }).lean();

    res.json({ success: true, data: organizers });
  } catch (err) {
    console.error("❌ getOrganizers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load organizers",
      error: err.message,
    });
  }
};

// ================= GET RECENT EVENTS =================
// GET /api/college-admin/recent-events
exports.getRecentEvents = async (req, res) => {
  try {
    // TODO: when you hook in Event model, fetch real data here
    return res.json({
      success: true,
      events: [],
    });
  } catch (err) {
    console.error("❌ getRecentEvents error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load recent events",
      error: err.message,
    });
  }
};

// ================= CREATE ORGANIZER =================
// POST /api/college-admin/organizers
exports.createOrganizer = async (req, res) => {
  try {
    const collegeAdminId = req.user._id;
    const { userId, clubName } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Find user under this college admin (using principalId as link)
    const user = await User.findOne({
      _id: userId,
      principalId: collegeAdminId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found under this college admin",
      });
    }

    // Promote to organizer
    user.role = "organizer";

    // If you later add clubName to schema, you can save it here.
    if (clubName) {
      console.log("Club name for organizer:", clubName);
      // e.g., user.clubName = clubName;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Organizer created successfully",
      data: user,
    });
  } catch (err) {
    console.error("❌ createOrganizer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create organizer",
      error: err.message,
    });
  }
};

// ================= REMOVE ORGANIZER =================
// DELETE /api/college-admin/organizers/:organizerId
exports.removeOrganizer = async (req, res) => {
  try {
    const collegeAdminId = req.user._id;
    const { organizerId } = req.params;

    const user = await User.findOne({
      _id: organizerId,
      principalId: collegeAdminId,
      role: "organizer",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found under this college admin",
      });
    }

    // Demote back to student
    user.role = "student";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Organizer removed successfully",
    });
  } catch (err) {
    console.error("❌ removeOrganizer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove organizer",
      error: err.message,
    });
  }
};
