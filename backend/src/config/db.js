const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log(
      "🔍 Attempting to connect with MONGO_URI:",
      process.env.MONGO_URI
    );

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
