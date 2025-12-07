const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check if token is in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // Extract token after "Bearer "
  }

  // If no token, deny access
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized to access this route' 
    });
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object
    req.user = await User.findById(decoded.id).select('-password');


    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'User account is deactivated' 
      });
    }

    next(); // Allow request to proceed
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized to access this route' 
    });
  }
};

// Middleware to check user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }

    next(); // Allow request to proceed
  };
};
