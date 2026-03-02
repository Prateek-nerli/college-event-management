const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id: userId }, // Payload: what data goes in the token
    process.env.JWT_SECRET, // Secret key to sign the token
    { expiresIn: process.env.JWT_EXPIRE || '7d' } // Token expires in 7 days
  );
};

// Send token response (used after login/register)
exports.sendTokenResponse = (user, statusCode, res) => {
  const token = exports.generateToken(user._id);

  // Send token and user info as JSON response
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile
    }
  });
};
