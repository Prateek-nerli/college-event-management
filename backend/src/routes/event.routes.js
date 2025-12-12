const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

// ============ 1. SETUP CLOUDINARY & MULTER ============
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Ensure these exist in your .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'college-events',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });


// ============ 2. CREATE EVENT ROUTE ============
// Added 'upload.single' middleware to process the file
router.post('/', protect, upload.single('poster'), async (req, res) => {
  try {
    console.log('📥 CREATE EVENT - Raw Body:', req.body);
    console.log('📥 CREATE EVENT - File:', req.file);

    // Helper to parse "FormData" strings back into Objects
    const safeParse = (val) => {
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return val;
      }
    };

    // 1. Extract Fields
    const {
      title,
      description,
      category,
      registrationType,
      maxParticipants,
      // Dates
      startDate,
      endDate,
      registrationDeadline
    } = req.body;

    // 2. Parse Complex Objects (Venue, TeamSize, Prizes)
    const parsedVenue = safeParse(req.body.venue);
    const parsedTeamSize = safeParse(req.body.teamSize);
    const parsedPrizes = safeParse(req.body.prizes) || [];

    // 3. Get Poster URL
    let posterUrl = null;
    if (req.file && req.file.path) {
      posterUrl = req.file.path;
    }

    // 4. Validation
    if (!title || !description || !startDate || !endDate || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, startDate and endDate are required',
      });
    }

    // 5. Create Event
    const event = new Event({
      title: title.trim(),
      description: description.trim(),
      category,
      organizerId: req.user.id,
      
      // ✅ FIX: Assign the uploaded poster URL
      poster: posterUrl,
      
      // ✅ FIX: Use the parsed venue object (which contains name & location)
      venue: parsedVenue || { location: 'TBD' },
      
      dates: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline)
          : new Date(endDate),
      },
      
      // ✅ FIX: Use parsed objects for other fields
      prizes: parsedPrizes,
      teamSize: parsedTeamSize || { min: 1, max: 1 },
      
      maxParticipants: Number(maxParticipants) || 100,
      registrationType: registrationType || 'individual',
      status: 'published',
      visibility: 'public',
      participants: [],
      teamRegistrations: [],
    });

    console.log('💾 Saving event...');
    await event.save();
    console.log('✅ Event created:', event.title);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    console.error('❌ CREATE EVENT ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
});

// ============ GET MY REGISTERED EVENTS ============
router.get('/my-events/registered', protect, async (req, res) => {
  try {
    const events = await Event.find({
      $or: [
        { participants: req.user.id },
        { 'teamRegistrations.members.userId': req.user.id },
      ],
    })
      .populate('organizerId', 'username profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username profile.fullName')
      .populate('participants', 'username profile.fullName')
      .sort({ 'dates.startDate': -1 });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('❌ Get my events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ REGISTER FOR EVENT ============
router.post('/:eventId/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.registrationType !== 'individual') return res.status(400).json({ success: false, message: 'Team registration only' });
    if (event.participants.includes(req.user.id)) return res.status(400).json({ success: false, message: 'Already registered' });
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) return res.status(400).json({ success: false, message: 'Event is full' });

    event.participants.push(req.user.id);
    await event.save();

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { registeredEvents: event._id } });

    res.json({ success: true, message: 'Registered successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ REGISTER TEAM FOR EVENT ============
router.post('/:eventId/register-team', protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.registrationType !== 'team') return res.status(400).json({ success: false, message: 'Individual registration only' });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (team.leader.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Only team leader can register' });

    const alreadyRegistered = event.teamRegistrations.some(reg => reg.teamId.toString() === teamId);
    if (alreadyRegistered) return res.status(400).json({ success: false, message: 'Team already registered' });

    const acceptedMembers = team.members.filter((m) => m.status === 'accepted');
    const allMembersToAdd = [team.leader, ...acceptedMembers.map(m => m.userId)];

    if (event.maxParticipants && (event.participants.length + allMembersToAdd.length > event.maxParticipants)) {
       return res.status(400).json({ success: false, message: 'Not enough spots left' });
    }

    event.teamRegistrations.push({
      teamId,
      members: allMembersToAdd.map((userId) => ({ userId })),
    });

    const currentParticipants = event.participants.map(String);
    const newParticipants = allMembersToAdd.map(String);
    event.participants = [...new Set([...currentParticipants, ...newParticipants])];

    await event.save();
    await User.updateMany({ _id: { $in: allMembersToAdd } }, { $addToSet: { registeredEvents: event._id } });

    res.json({ success: true, message: 'Team registered successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ UNREGISTER ============
router.post('/:eventId/unregister', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (!event.participants.includes(req.user.id)) return res.status(400).json({ success: false, message: 'Not registered' });

    event.participants = event.participants.filter(id => id.toString() !== req.user.id);
    await event.save();
    await User.findByIdAndUpdate(req.user.id, { $pull: { registeredEvents: event._id } });

    res.json({ success: true, message: 'Unregistered successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ GET ALL EVENTS ============
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ status: { $ne: 'draft' } })
      .populate('organizerId', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .sort({ 'dates.startDate': 1 });
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ GET EVENT PARTICIPANTS ============
router.get('/:eventId/participants', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('organizerId', 'username email profile.fullName')
      .populate('participants', 'username email profile.fullName email profile.phone profile.department profile.year') // Added extra fields for the table
      .populate({
        path: 'teamRegistrations.teamId',
        select: 'name leader members'
      })
      .populate({
        path: 'teamRegistrations.members.userId',
        select: 'username email profile.fullName profile.phone profile.department profile.year'
      });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Security Check: Only the organizer should see this list
    if (event.organizerId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view participants' });
    }

    // Structure the data for the frontend
    let allParticipants = [];

    if (event.registrationType === 'individual') {
      allParticipants = event.participants;
    } else {
      // Flatten team members for easy display
      event.teamRegistrations.forEach(teamReg => {
        if (teamReg.members) {
          teamReg.members.forEach(member => {
             if (member.userId) {
               // Attach team name to the user object for display
               let userObj = member.userId.toObject();
               userObj.teamName = teamReg.teamId?.name || 'Unknown Team';
               allParticipants.push(userObj);
             }
          });
        }
      });
    }

    res.json({
      success: true,
      allParticipants: allParticipants,
      registrationType: event.registrationType
    });
  } catch (error) {
    console.error('❌ Get participants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ GET SINGLE EVENT ============
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('organizerId', 'username email profile.fullName')
      .populate('participants', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ DELETE EVENT ============
router.delete('/:eventId', protect, async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      if (event.organizerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
  
      await Event.findByIdAndDelete(req.params.eventId);
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
