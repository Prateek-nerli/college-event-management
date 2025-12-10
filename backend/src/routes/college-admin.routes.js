// routes/college-admin.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const collegeAdminController = require("../controllers/collegeAdminController");
const User = require("../models/User");

// ✅ All routes require college admin authentication
router.use(protect);
router.use(authorize("collegeAdmin"));

// Dashboard overview stats (only this college admin's data)
router.get("/overview", collegeAdminController.getOverview);

// Get students under this college admin
router.get("/students", collegeAdminController.getStudents);

// Get organizers under this college admin
router.get("/organizers", collegeAdminController.getOrganizers);

// Get recent events from organizers under this college admin
router.get("/recent-events", collegeAdminController.getRecentEvents);

// ✅ Create organizer from student  (matches frontend POST /college-admin/organizers)
router.post("/organizers", collegeAdminController.createOrganizer);

// ✅ Remove organizer (matches frontend DELETE /college-admin/organizers/:id)
router.delete("/organizers/:organizerId", collegeAdminController.removeOrganizer);

// ✅ SEARCH USERS
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchQuery = query.toLowerCase().trim();
    const collegeAdminId = req.user._id;

    console.log("🔍 Searching for:", searchQuery);

    const users = await User.find({
      // assuming principalId links student → college admin
      principalId: collegeAdminId,
      role: { $in: ["student", "organizer"] },
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { usn: { $regex: searchQuery, $options: "i" } },
        { "profile.fullName": { $regex: searchQuery, $options: "i" } },
      ],
    })
      .select("_id username email profile usn")
      .limit(10)
      .lean();

    console.log("✅ Found users:", users.length);

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: err.message,
    });
  }
});

module.exports = router;
