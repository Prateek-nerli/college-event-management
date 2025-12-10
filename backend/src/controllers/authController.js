const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt.util');
const { findPrincipalByUSN } = require('../utils/usnGrouping');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, usn, fullName, department, year, phone, role } = req.body;

    // Validate that required fields are provided
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }

    // Check if user with this email or username already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email or username already exists' 
      });
    }

    // NEW: Try to find principal by USN, but don't fail if not found
    let principalId = null;
    if (usn && role === "student") {
      try {
        const principal = await findPrincipalByUSN(usn);
        if (principal) {
          principalId = principal._id;
        }
      } catch (err) {
        console.log("Principal not found for USN:", usn, "- Student registered without principal assignment");
      }
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      usn,                    // Changed from collegeId
      principalId: principalId,  // NEW: null if principal not found
      role: role || 'student',
      profile: {
        fullName,
        department,
        year,
        phone
      }
    });

    // Send token response (logs user in automatically after registration)
    sendTokenResponse(user, 201, res);

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and password' 
      });
    }

    // Find user by email (include password field since it's normally hidden)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Compare provided password with hashed password in database
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Send token response
    sendTokenResponse(user, 200, res);

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (requires token)
exports.getMe = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};
