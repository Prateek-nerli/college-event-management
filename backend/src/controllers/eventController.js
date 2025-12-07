const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizerId', 'username profile.fullName email')
      .populate('participants', 'name email phone'); 
       // ← ADD THIS
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
     .populate('organizerId', 'username profile.fullName email')
      .populate('participants', 'name email phone');  // ← ADD THIS LINE
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ 
      success: true, 
      data: event 
    });
  } catch (error) {
    console.error('Error in getEventById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};




// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer/Admin only)
exports.createEvent = async (req, res) => {
  try {
    const { title, description, category, venue, dates, rules, prizes, registrationType, teamSize, maxParticipants } = req.body;

    // Validate required fields
    if (!title || !description || !category || !dates) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }

    // Create event
    const event = await Event.create({
      title,
      description,
      category,
      organizerId: req.user._id, // Set organizer to current user
      venue,
      dates,
      rules: rules || [],
      prizes: prizes || [],
      registrationType,
      teamSize: teamSize || { min: 1, max: 1 },
      maxParticipants,
      status: 'published' // For MVP, auto-publish
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer/Admin only)
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    // Check if user is the organizer
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this event' 
      });
    }

    // Update event with new data
    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // new: true returns updated doc, runValidators: true validates data
    );

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer/Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    // Check if user is the organizer
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this event' 
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
