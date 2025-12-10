const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');


// Load environment variables from .env file
dotenv.config();


// DEBUG: Check if env variables are loaded
console.log('🔍 DEBUG: MONGO_URI =', process.env.MONGO_URI);
console.log('🔍 DEBUG: PORT =', process.env.PORT);
console.log('🔍 DEBUG: NODE_ENV =', process.env.NODE_ENV);
console.log('🔍 DEBUG: All env keys:', Object.keys(process.env).filter(k => k.startsWith('MONGO') || k === 'PORT' || k === 'NODE_ENV'));
// Connect to database
connectDB();


// Initialize Express app
const app = express();


// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(cors({ 
    origin: ['http://localhost:5173'],
    credentials: true
}));


// ============ ROUTES ============
// Auth routes
app.use('/api/auth', require('./routes/auth.routes'));



// User routes
const userRoutes = require('./routes/user.routes');
app.use('/api/users', userRoutes);


// Event routes
app.use('/api/events', require('./routes/event.routes'));


// Team routes
const teamRoutes = require('./routes/team.routes');
app.use('/api/teams', teamRoutes);


// Notification routes (MUST BE AFTER OTHERS)
const notificationRoutes = require('./routes/notification.routes');
app.use('/api/notifications', notificationRoutes);


const principalRoutes = require("./routes/principal.routes");
app.use("/api/principals", principalRoutes);

const collegeAdminRoutes = require('./routes/college-admin.routes');
app.use('/api/college-admin', collegeAdminRoutes);



// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'College Event Management API',
    status: 'Running',
    version: '1.0.0'
  });
});


// ============ ERROR HANDLING ============
// Error handling middleware (MUST BE LAST)
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});


// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
