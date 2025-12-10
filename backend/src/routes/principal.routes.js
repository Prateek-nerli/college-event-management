const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  createRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest,
} = require("../controllers/principalController");

// Public: principal registration form submits here
router.post("/register", createRequest);

// Admin-only: view and process requests
router.get("/requests", protect, authorize("admin"), getPendingRequests);
router.post("/requests/:id/approve", protect, authorize("admin"), approveRequest);
router.post("/requests/:id/reject", protect, authorize("admin"), rejectRequest);

module.exports = router;
