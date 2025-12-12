const Comment = require('../models/Comment');

// Get all comments for an event
exports.getComments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const comments = await Comment.find({ event: eventId })
      .populate('user', 'username profile.fullName role') // Get user details
      .sort({ createdAt: -1 }); // Newest first

    res.json({ success: true, data: comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Post a new comment
exports.addComment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }

    const comment = await Comment.create({
      event: eventId,
      user: req.user.id,
      text,
    });

    // Populate user immediately so we can display it on the frontend
    await comment.populate('user', 'username profile.fullName role');

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};