const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

// ============ CREATE EVENT (POST before all GET routes) ============
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      maxParticipants,
      registrationType,
      teamSize,
      startDate,
      endDate,
      registrationDeadline,
    } = req.body;

    console.log('📥 CREATE EVENT - Request body:', req.body);

    if (!title || !description || !startDate || !endDate || !category) {
      console.log('❌ Validation failed');
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, startDate and endDate are required',
      });
    }

    const event = new Event({
      title: title.trim(),
      description: description.trim(),
      category,
      organizerId: req.user.id,
      venue: {
        location: location || 'TBD',
      },
      dates: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline)
          : new Date(endDate),
      },
      maxParticipants: maxParticipants || 100,
      registrationType: registrationType || 'individual',
      teamSize: teamSize || { min: 1, max: 1 },
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
    console.log('📥 Fetching my registered events for user:', req.user.id);

    // Query for events where user is:
    // 1. In participants array (individual registration)
    // 2. In any team member list (team registration)
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

    console.log('✅ Found', events.length, 'registered events');
    events.forEach((e) => {
      console.log(`  - ${e.title} (${e.registrationType}), participants: ${e.participants.length}, teams: ${e.teamRegistrations.length}`);
    });

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

// ============ REGISTER TEAM FOR EVENT ============
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

    // Get ONLY accepted members (excluding leader)
    const acceptedMembers = team.members.filter((m) => m.status === 'accepted');
    const teamMemberIds = acceptedMembers.map((m) => m.userId);

    console.log('📋 Team members to register:', teamMemberIds.length);
    console.log('📋 Member IDs:', teamMemberIds);

    // Add team leader to the list too
    const allMembersToAdd = [team.leader, ...teamMemberIds];
    console.log('📋 All members (including leader):', allMembersToAdd.length);

    if (event.maxParticipants) {
      const currentParticipants = event.participants.length;
      console.log('📊 Current participants:', currentParticipants, 'Max:', event.maxParticipants);

      if (currentParticipants + allMembersToAdd.length > event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: `Event can only accommodate ${event.maxParticipants - currentParticipants} more participants`,
        });
      }
    }

    // Add team registration
    event.teamRegistrations.push({
      teamId,
      members: allMembersToAdd.map((userId) => ({ userId })),
    });

    // Add all members to participants array (avoid duplicates)
    const existingParticipants = event.participants.map((p) => p.toString());
    const newMemberIds = allMembersToAdd.map((m) => m.toString());
    const uniqueParticipants = [...new Set([...existingParticipants, ...newMemberIds])];
    event.participants = uniqueParticipants;

    console.log('✅ Event participants count:', event.participants.length);

    await event.save();
    console.log('✅ Event saved');

    // Add event to all team members' registeredEvents
    await User.updateMany(
      { _id: { $in: allMembersToAdd } },
      { $addToSet: { registeredEvents: event._id } }
    );

    console.log('✅ User records updated');

    // Populate for response
    await event.populate([
      { path: 'organizerId', select: 'username email profile.fullName' },
      { path: 'teamRegistrations.teamId', select: 'name' },
      { path: 'teamRegistrations.members.userId', select: 'username email profile.fullName' },
      { path: 'participants', select: 'username email profile.fullName' },
    ]);

    console.log('✅ Team registered successfully with', allMembersToAdd.length, 'members');

    res.json({
      success: true,
      message: `Team registered successfully with ${allMembersToAdd.length} members`,
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

// ============ UNREGISTER FROM EVENT ============
router.post('/:eventId/unregister', protect, async (req, res) => {
  try {
    console.log('🗑️ UNREGISTER - User:', req.user.id, 'Event:', req.params.eventId);

    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is registered
    const wasRegistered = event.participants.some(
      (id) => id.toString() === req.user.id
    );

    if (!wasRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this event',
      });
    }

    // Remove user from participants
    event.participants = event.participants.filter(
      (id) => id.toString() !== req.user.id
    );

    console.log('✅ User removed from participants. Count:', event.participants.length);

    await event.save();
    console.log('✅ Event saved');

    // Remove event from user's registeredEvents
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { registeredEvents: event._id } },
      { new: true }
    );

    console.log('✅ Event removed from user record');

    // Populate and return updated event
    await event.populate([
      { path: 'organizerId', select: 'username email profile.fullName' },
      { path: 'participants', select: 'username email profile.fullName' },
      { path: 'teamRegistrations.teamId', select: 'name' },
      { path: 'teamRegistrations.members.userId', select: 'username email profile.fullName' },
    ]);

    console.log('✅ Individual unregistered successfully');

    res.json({
      success: true,
      message: 'Unregistered successfully',
      data: event,
    });
  } catch (error) {
    console.error('❌ Unregister error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
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
      (reg) => reg.teamId.toString() === teamId.toString()
    );

    if (registrationIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Team is not registered for this event',
      });
    }

    const registration = event.teamRegistrations[registrationIndex];

    // all member IDs as strings
    const memberIds = registration.members.map((m) =>
      (m.userId?._id || m.userId).toString()
    );

    // remove this team registration
    event.teamRegistrations.splice(registrationIndex, 1);

    // remove all members from participants
    event.participants = event.participants.filter((id) => {
      const idStr = id.toString();
      return !memberIds.includes(idStr);
    });

    await event.save();

    // remove event from all users' registeredEvents
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { registeredEvents: event._id } }
    );

    // optional: repopulate
    await event.populate([
      { path: 'organizerId', select: 'username email profile.fullName' },
      { path: 'teamRegistrations.teamId', select: 'name' },
      {
        path: 'teamRegistrations.members.userId',
        select: 'username email profile.fullName',
      },
      { path: 'participants', select: 'username email profile.fullName' },
    ]);

    return res.json({
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
    console.log('📥 GET PARTICIPANTS - Event:', req.params.eventId, 'User:', req.user.id);

    const event = await Event.findById(req.params.eventId)
      .populate('organizerId', 'username email profile.fullName')
      .populate('participants', 'username email profile.fullName')
      .populate({
        path: 'teamRegistrations.teamId',
        select: 'name'
      })
      .populate({
        path: 'teamRegistrations.members.userId',
        select: 'username email profile.fullName'
      });

    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // ✅ FIX: Check if user is organizer
    if (event.organizerId._id.toString() !== req.user.id) {
      console.log('❌ User is not organizer. Organizer:', event.organizerId._id, 'User:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Only event organizer can view participants'
      });
    }

    console.log('✅ Authorization passed');

    // ✅ FIX: Build proper response structure
    let allParticipants = [];

    if (event.registrationType === 'individual') {
      // For individual events, just list individual participants
      allParticipants = event.participants.map(p => ({
        _id: p._id,
        username: p.username,
        email: p.email,
        fullName: p.profile?.fullName || p.username,
        team: null,
        registrationType: 'individual'
      })) || [];
      console.log('👤 Individual participants:', allParticipants.length);
    } else if (event.registrationType === 'team') {
      // For team events, flatten team members
      if (event.teamRegistrations && Array.isArray(event.teamRegistrations)) {
        event.teamRegistrations.forEach((registration) => {
          const teamName = registration.teamId?.name || 'Unknown Team';
          
          if (registration.members && Array.isArray(registration.members)) {
            registration.members.forEach((member) => {
              if (member.userId) {
                allParticipants.push({
                  _id: member.userId._id,
                  username: member.userId.username,
                  email: member.userId.email,
                  fullName: member.userId.profile?.fullName || member.userId.username,
                  team: teamName,
                  registrationType: 'team'
                });
              }
            });
          }
        });
      }
      console.log('👥 Team participants:', allParticipants.length);
    }

    console.log('✅ Participants fetched successfully');

    // ✅ FIX: Return proper response structure
    return res.json({
      success: true,
      eventTitle: event.title,
      registrationType: event.registrationType,
      maxParticipants: event.maxParticipants,
      totalParticipants: allParticipants.length,
      individualParticipants: event.registrationType === 'individual' ? allParticipants : [],
      teamRegistrations: event.registrationType === 'team' ? event.teamRegistrations.map(reg => ({
        teamId: reg.teamId?._id,
        name: reg.teamId?.name,
        members: reg.members.map(m => ({
          userId: {
            _id: m.userId._id,
            username: m.userId.username,
            email: m.userId.email,
            fullName: m.userId.profile?.fullName
          }
        }))
      })) : [],
      allParticipants: allParticipants // ✅ Flat list for easy iteration
    });
  } catch (error) {
    console.error('❌ Participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
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
      .populate('participants', 'username email profile.fullName')
      .sort({ 'dates.startDate': 1 });

    console.log('✅ Found', events.length, 'events');

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