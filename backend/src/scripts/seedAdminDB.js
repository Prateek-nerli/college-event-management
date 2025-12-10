// Admin User Seeding Script - WITH IPv4/IPv6 FIX
// Run this once with: node src/scripts/seedAdminDB.js

const mongoose = require("mongoose");
require("dotenv").config();

console.log("🔍 DEBUG: Checking environment variables...");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✓ Set" : "✗ NOT SET");
console.log(
  "NODE_ENV:",
  process.env.NODE_ENV || "not set (defaults to development)"
);

const User = require("../models/User");

async function seedAdminToDB() {
  try {
    // Use 127.0.0.1 instead of localhost to force IPv4
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/college-events";
    console.log("\n📡 Attempting MongoDB connection...");
    console.log("URI:", mongoUri);

    // Connect to MongoDB with timeout and IPv4 preference
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      family: 4, // Force IPv4 connection
    });

    console.log("✓ Connected to MongoDB successfully!\n");

    // Check if admin already exists
    console.log("🔍 Checking if admin already exists...");
    const existingAdmin = await User.findOne({
      email: "Adminclgevent@gmail.com",
    });

    if (existingAdmin) {
      console.log("\n⚠️  Admin user already exists in database!");
      console.log("\n📋 Existing Admin Details:");
      console.log("─".repeat(60));
      console.log(`  Email:    ${existingAdmin.email}`);
      console.log(`  Username: ${existingAdmin.username}`);
      console.log(`  Role:     ${existingAdmin.role}`);
      console.log(
        `  Status:   ${existingAdmin.isActive ? "Active" : "Inactive"}`
      );
      console.log("─".repeat(60));
      console.log("\n✅ Admin is ready to login!");
      console.log("\nTry logging in with:");
      console.log("  Email:    Adminclgevent@gmail.com");
      console.log("  Password: Admin@1031");
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("✓ Admin does not exist, creating new admin...\n");

    // Create admin user - LET THE PRE-SAVE HOOK HASH THE PASSWORD
    console.log("📝 Creating admin user with:");
    console.log("   Email: Adminclgevent@gmail.com");
    console.log("   Role: admin");
    console.log("   (Password will be hashed by User model pre-save hook)\n");

    const admin = await User.create({
      username: "admin",
      email: "Adminclgevent@gmail.com",
      password: "Admin@1031", // Plain text - pre-save hook will hash it
      collegeId: "",
      role: "admin",
      profile: {
        fullName: "System Administrator",
        department: "Administration",
        phone: "+91-XXXX-XXXX",
        avatar: null,
        bio: "Super Admin - System Management",
      },
      contactPreferences: {
        preferredChannel: "email",
        alternateEmail: "",
        whatsappNumber: "",
      },
      notificationSettings: {
        email: {
          registration: true,
          reminders: true,
          results: true,
          announcements: true,
        },
        inApp: {
          announcements: true,
          systemAlerts: true,
          results: true,
        },
      },
      isActive: true,
      lastLogin: null,
      teams: [],
      teamInvites: [],
    });

    console.log("✓ Admin user created successfully in MongoDB!");
    console.log("\n📋 Admin Credentials:");
    console.log("─".repeat(60));
    console.log(`  Email:    Adminclgevent@gmail.com`);
    console.log(`  Password: Admin@1031`);
    console.log(`  Role:     admin`);
    console.log(`  Status:   Active`);
    console.log("─".repeat(60));
    console.log("\n✅ Password was hashed by User model pre-save hook");
    console.log("\n🔗 Next Steps:");
    console.log("  1. Make sure backend is running: npm run dev");
    console.log("  2. Go to http://localhost:5173/login");
    console.log("  3. Enter Email: Adminclgevent@gmail.com");
    console.log("  4. Enter Password: Admin@1031");
    console.log("  5. Click Login");
    console.log("  6. You will be redirected to /admin-dashboard");
    console.log("\n✨ Setup Complete!\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n⚠️  Connection refused! MongoDB might not be running.");
      console.error("\nFix: Start MongoDB with:");
      console.error("  mongod --dbpath C:\\data\\db");
      console.error("\nThen try this script again in a new PowerShell window.");
    } else {
      console.error("\nPossible causes:");
      console.error("  1. MongoDB is not running");
      console.error("  2. Connection string is incorrect in .env file");
      console.error("  3. Network/firewall issue");
      console.error("\nDebug info:");
      console.error("  MONGODB_URI:", process.env.MONGODB_URI);
      console.error("  Full error:", error);
    }

    process.exit(1);
  }
}

// Run the seeding function
console.log("");
seedAdminToDB();
