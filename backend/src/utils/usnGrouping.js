const User = require("../models/User");

exports.findPrincipalByUSN = async (usn) => {
  if (!usn) return null;

  // Find all principals with matching prefixes
  const principals = await User.find({ 
    role: "collegeAdmin",
    isActive: true,
    usn: { $exists: true, $ne: null }
  });

  for (const principal of principals) {
    if (usn.startsWith(principal.usn)) {
      return principal;  // Found matching principal
    }
  }

  return null;  // No principal found, but that's OK
};

module.exports = exports;
