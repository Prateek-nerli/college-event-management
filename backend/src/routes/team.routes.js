const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');
const Notification = require('../models/Notification');

// ============ CREATE TEAM ============
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, maxMembers } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required',
      });
    }

    const team = new Team({
      name,
      description,
      maxMembers: maxMembers || 5,
      leader: req.user.id,
      members: [
        {
          userId: req.user.id,
          status: 'leader',
        },
      ],
    });

    await team.save();
    await team.populate('leader members.userId', 'username email profile.fullName');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team,
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET MY TEAMS ============
router.get('/my-teams', protect, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { leader: req.user.id },
        { 'members.userId': req.user.id },
      ],
    })
      .populate('leader', 'username email profile.fullName')
      .populate('members.userId', 'username email profile.fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ GET TEAM DETAILS ============
router.get('/:teamId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('leader', 'username email profile.fullName')
      .populate('members.userId', 'username email profile.fullName')
      .populate('registeredEvents', 'title category');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ INVITE USER TO TEAM ============
router.post('/:teamId/invite', protect, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const teamId = req.params.teamId;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is team leader
    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only team leader can invite members',
      });
    }

    // Check if user already in team
    const alreadyMember = team.members.some(
      (m) => m.userId.toString() === userId
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already in team',
      });
    }

    // Check team capacity
    const acceptedMembers = team.members.filter((m) => m.status !== 'pending');
    if (acceptedMembers.length >= team.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Team is full',
      });
    }

    // Add to team with pending status
    team.members.push({
      userId,
      status: 'pending',
    });
    await team.save();

    // Create in-app notification
    const notification = new Notification({
      userId,
      type: 'team_invite',
      title: `Invited to join team "${team.name}"`,
      message: message || `${req.user.username} invited you to join their team`,
      data: {
        teamId,
        invitedBy: req.user.id,
      },
      actionRequired: true,
      action: 'accept_invite',
    });
    await notification.save();

    await team.populate('leader members.userId', 'username email profile.fullName');

    res.json({
      success: true,
      message: 'Invitation sent',
      data: team,
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ RESPOND TO INVITE ============
router.post('/:teamId/invite/respond', protect, async (req, res) => {
  try {
    const { accept } = req.body;
    const teamId = req.params.teamId;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const memberIndex = team.members.findIndex(
      (m) => m.userId.toString() === req.user.id && m.status === 'pending'
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No pending invite for you',
      });
    }

    if (accept) {
      team.members[memberIndex].status = 'accepted';
      await team.save();

      // Delete the notification from database
      const Notification = require('../models/Notification');
      const deleteResult = await Notification.findOneAndDelete({
        userId: req.user.id,
        'data.teamId': teamId,
        type: 'team_invite',
      });

      console.log('Notification deleted:', deleteResult);

      res.json({
        success: true,
        message: 'Joined team successfully',
        data: team,
      });
    } else {
      // Remove from team
      team.members.splice(memberIndex, 1);
      await team.save();

      // Delete the notification from database
      const Notification = require('../models/Notification');
      const deleteResult = await Notification.findOneAndDelete({
        userId: req.user.id,
        'data.teamId': teamId,
        type: 'team_invite',
      });

      console.log('Notification deleted:', deleteResult);

      res.json({
        success: true,
        message: 'Declined invite',
      });
    }
  } catch (error) {
    console.error('Respond invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ REMOVE MEMBER ============
router.post('/:teamId/remove-member', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.teamId;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Only leader can remove
    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only team leader can remove members',
      });
    }

    team.members = team.members.filter((m) => m.userId.toString() !== userId);
    await team.save();

    res.json({
      success: true,
      message: 'Member removed',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============ DELETE TEAM ============
router.delete('/:teamId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    if (team.leader.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only team leader can delete team',
      });
    }

    await Team.findByIdAndDelete(req.params.teamId);

    res.json({
      success: true,
      message: 'Team deleted',
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
