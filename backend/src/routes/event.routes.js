const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth.middleware');

// ============ GET ALL EVENTS (Public) ============
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching all events...');
    
    const events = await Event.find({ status: { $ne: 'draft' } })
      .populate('organizerId', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username email profile.fullName')
      .sort({ 'dates.startDate': 1 });

    console.log('✅ Found', events.length, 'events');
    events.forEach((e, idx) => {
      console.log(`Event ${idx + 1}: ${e.title} - Type: ${e.registrationType}`);
    });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('❌ Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET MY REGISTERED EVENTS (SPECIFIC - before :eventId) ============
router.get('/my-events/registered', protect, async (req, res) => {
  try {
    console.log('📥 Fetching my registered events for user:', req.user.id);

    const events = await Event.find({
      $or: [
        { participants: req.user.id },
        { 'teamRegistrations.members.userId': req.user.id },
      ],
    })
      .populate('organizerId', 'username profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username profile.fullName')
      .sort({ 'dates.startDate': -1 });

    console.log('✅ Found', events.length, 'registered events');

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('❌ Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ REGISTER FOR EVENT (SPECIFIC - before :eventId) ============
router.post('/:eventId/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.registrationType !== 'individual') {
      return res.status(400).json({
        success: false,
        message: 'This event is for team registration only',
      });
    }

    if (event.participants.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event',
      });
    }

    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Event is full',
      });
    }

    event.participants.push(req.user.id);
    await event.save();

    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { registeredEvents: event._id } },
      { new: true }
    );

    console.log('✅ User registered for event:', event.title);

    res.json({
      success: true,
      message: 'Registered successfully',
      data: event,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
});

// ============ REGISTER TEAM FOR EVENT (SPECIFIC - before :eventId) ============
router.post('/:eventId/register-team', protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const eventId = req.params.eventId;

    console.log('📤 [REGISTER TEAM]');
    console.log('  EventID:', eventId);
    console.log('  TeamID:', teamId);
    console.log('  UserID:', req.user.id);

    if (!teamId) {
      console.log('❌ Team ID missing');
      return res.status(400).json({
        success: false,
        message: 'teamId is required',
      });
    }

    const event = await Event.findById(eventId);
    console.log('✅ Event found:', event?.title, 'Type:', event?.registrationType);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.registrationType !== 'team') {
      console.log('❌ Event is not team registration. It is:', event.registrationType);
      return res.status(400).json({
        success: false,
        message: `This event is for ${event.registrationType} registration only`,
      });
    }

    const team = await Team.findById(teamId);
    console.log('✅ Team found:', team?.name);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    if (team.leader.toString() !== req.user.id) {
      console.log('❌ User is not team leader');
      return res.status(403).json({
        success: false,
        message: 'Only team leader can register team for events',
      });
    }

    const alreadyRegistered = event.teamRegistrations.some(
      (reg) => reg.teamId.toString() === teamId
    );

    if (alreadyRegistered) {
      console.log('❌ Team already registered');
      return res.status(400).json({
        success: false,
        message: 'Team is already registered for this event',
      });
    }

    const acceptedMembers = team.members.filter((m) => m.status === 'accepted');
    const teamMemberIds = acceptedMembers.map((m) => m.userId);

    console.log('📋 Team members to register:', teamMemberIds.length);

    if (event.maxParticipants) {
      const currentParticipants = event.teamRegistrations.reduce(
        (total, reg) => total + reg.members.length,
        0
      );

      if (currentParticipants + teamMemberIds.length > event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: `Event can only accommodate ${event.maxParticipants - currentParticipants} more participants`,
        });
      }
    }

    event.teamRegistrations.push({
      teamId,
      members: teamMemberIds.map((userId) => ({ userId })),
    });

    event.participants = [...new Set([...event.participants, ...teamMemberIds])];

    await event.save();
    console.log('✅ Event saved');

    await User.updateMany(
      { _id: { $in: teamMemberIds } },
      { $addToSet: { registeredEvents: event._id } }
    );

    await event.populate([
      { path: 'organizerId', select: 'username email profile.fullName' },
      { path: 'teamRegistrations.teamId', select: 'name' },
      { path: 'teamRegistrations.members.userId', select: 'username email profile.fullName' },
    ]);

    console.log('✅ Team registered successfully with', teamMemberIds.length, 'members');

    res.json({
      success: true,
      message: `Team registered successfully with ${teamMemberIds.length} members`,
      data: event,
    });
  } catch (error) {
    console.error('❌ REGISTER TEAM ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
});

// ============ UNREGISTER FROM EVENT (SPECIFIC - before :eventId) ============
router.post('/:eventId/unregister', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.participants = event.participants.filter(
      (id) => id.toString() !== req.user.id
    );
    await event.save();

    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { registeredEvents: event._id } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Unregistered successfully',
      data: event,
    });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ UNREGISTER TEAM FROM EVENT ============
router.post('/:eventId/unregister-team', protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const eventId = req.params.eventId;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only team leader can unregister team',
      });
    }

    const registrationIndex = event.teamRegistrations.findIndex(
      (reg) => reg.teamId.toString() === teamId
    );

    if (registrationIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Team is not registered for this event',
      });
    }

    const registration = event.teamRegistrations[registrationIndex];
    const memberIds = registration.members.map((m) => m.userId.toString ? m.userId.toString() : m.userId);

    event.teamRegistrations.splice(registrationIndex, 1);
    event.participants = event.participants.filter(
      (id) => !memberIds.includes(id.toString ? id.toString() : id)
    );

    await event.save();

    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { registeredEvents: event._id } }
    );

    await event.populate([
      { path: 'organizerId', select: 'username email profile.fullName' },
      { path: 'teamRegistrations.teamId', select: 'name' },
      { path: 'teamRegistrations.members.userId', select: 'username email profile.fullName' },
    ]);

    res.json({
      success: true,
      message: 'Team unregistered successfully',
      data: event,
    });
  } catch (error) {
    console.error('❌ Unregister team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
});

// ============ GET EVENT PARTICIPANTS ============
router.get('/:eventId/participants', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('participants', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username email profile.fullName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only organizer can view participants',
      });
    }

    const participantCount =
      event.registrationType === 'individual'
        ? event.participants.length
        : event.teamRegistrations.reduce((total, reg) => total + reg.members.length, 0);

    console.log(`✅ Fetched participants for event: ${event.title}`);

    res.json({
      success: true,
      eventTitle: event.title,
      registrationType: event.registrationType,
      participants:
        event.registrationType === 'individual' ? event.participants : event.teamRegistrations,
      totalParticipants: participantCount,
      maxParticipants: event.maxParticipants,
    });
  } catch (error) {
    console.error('Participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ UPDATE EVENT ============
router.put('/:eventId', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event',
      });
    }

    const allowedFields = ['title', 'description', 'category', 'status', 'rules', 'prizes'];
    allowedFields.forEach((field) => {
      if (req.body[field]) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ DELETE EVENT ============
router.delete('/:eventId', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event',
      });
    }

    await Event.findByIdAndDelete(req.params.eventId);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET ALL EVENTS (GENERIC - MUST BE LAST) ============
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching all events...');

    const events = await Event.find({ status: { $ne: 'draft' } })
      .populate('organizerId', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username email profile.fullName')
      .sort({ 'dates.startDate': 1 });

    console.log('✅ Found', events.length, 'events');
    events.forEach((e, idx) => {
      console.log(`Event ${idx + 1}: ${e.title} - Type: ${e.registrationType}`);
    });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('❌ Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET SINGLE EVENT (MUST BE LAST) ============
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('organizerId', 'username email profile.fullName')
      .populate('participants', 'username email profile.fullName')
      .populate('teamRegistrations.teamId', 'name')
      .populate('teamRegistrations.members.userId', 'username email profile.fullName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
