const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load env vars specifically for this file
dotenv.config(); 

// Debugging line to verify keys are loaded
console.log("Cloudinary Config Check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "Loaded" : "MISSING",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "Loaded" : "MISSING"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;