const Event = require("../models/Event");
const User = require("../models/User"); // ✅ use User instead of Organizer

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate(
      "organizerId",
      "username profile.fullName email clubName role"
    );

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error in getAllEvents:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate(
        "organizerId",
        "clubName username profile.fullName email profile.phone role"
      )
      .populate("participants", "profile.fullName email profile.phone");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Error in getEventById:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get events by organizer
// @route   GET /api/events/organizer/:organizerId
// @access  Public
exports.getEventsByOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    // Verify organizer exists in User collection with organizer role
    const organizer = await User.findById(organizerId);
    if (!organizer || organizer.role !== "organizer") {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    const events = await Event.find({ organizerId })
      .populate(
        "organizerId",
        "clubName username profile.fullName email profile.phone role"
      )
      .populate("participants", "profile.fullName email profile.phone")
      .sort({ "dates.startDate": 1 });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error in getEventsByOrganizer:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer only)
exports.createEvent = async (req, res) => {
  try {
    // 1. Extract raw body data
    let {
      title,
      description,
      category,
      venue,
      dates, // In your frontend this was 'startDate'/'endDate', we'll map it below
      rules,
      prizes,
      registrationType,
      teamSize,
      maxParticipants,
      organizerId,
      // Frontend sends specific date fields, so let's destructure them too just in case
      startDate,
      endDate,
      registrationDeadline
    } = req.body;

    // --- FIX 1: HANDLE POSTER FILE ---
    // If middleware (Multer/Cloudinary) worked, req.file will exist.

    // --- FIX 2: PARSE STRINGIFIED JSON ---
    // FormData sends objects/arrays as strings. We must parse them back to JSON.
    // We use a helper function to safely parse or return the original if it's already an object.
    const safeParse = (val) => {
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return val;
      }
    };

    const parsedVenue = safeParse(venue);
    const parsedTeamSize = safeParse(teamSize);
    const parsedPrizes = safeParse(prizes) || [];
    const parsedRules = safeParse(rules) || [];
    
    // Construct the dates object if it wasn't sent as a single object
    let finalDates = safeParse(dates);
    if (!finalDates && startDate) {
        finalDates = {
            start: startDate,
            end: endDate,
            registrationDeadline: registrationDeadline || endDate
        };
    }

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (title, description, category)",
      });
    }

    const finalOrganizerId = organizerId || req.user._id;
    console.log("🔵 Creating event with organizerId:", finalOrganizerId);

    // Verify organizer in User collection
    const organizer = await User.findById(finalOrganizerId);
    if (!organizer || organizer.role !== "organizer") {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // --- FIX 3: CREATE EVENT WITH PARSED DATA AND POSTER ---
    let posterUrl = "";
    if (req.file && req.file.path) {
      posterUrl = req.file.path;
    }
    const event = await Event.create({
      title,
      description,
      category,
      organizerId: finalOrganizerId,
      poster: posterUrl, // Add the poster URL here
      venue: parsedVenue, // Use parsed object
      dates: finalDates,  // Use parsed/constructed object
      rules: parsedRules,
      prizes: parsedPrizes,
      registrationType: registrationType || "individual",
      teamSize: parsedTeamSize || { min: 1, max: 1 },
      maxParticipants: Number(maxParticipants) || 100, // Ensure number
      status: "published",
      participants: [],
    });

    console.log("✅ Event created:", event._id);

    await event.populate(
      "organizerId",
      "clubName username profile.fullName email profile.phone role"
    );

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    console.error("❌ Error in createEvent:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer only)
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this event",
      });
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(
      "organizerId",
      "clubName username profile.fullName email profile.phone role"
    );

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error in updateEvent:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this event",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteEvent:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Register participant for event
// @route   POST /api/events/:id/register
// @access  Private (Student)
exports.registerParticipant = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.participants.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Already registered for this event",
      });
    }

    if (event.participants.length >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Event is full. Registration closed.",
      });
    }

    if (new Date() > new Date(event.dates.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed",
      });
    }

    event.participants.push(req.user._id);
    await event.save();

    res.json({
      success: true,
      message: "Registered successfully for the event",
      data: event,
    });
  } catch (error) {
    console.error("Error in registerParticipant:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Unregister participant from event
// @route   DELETE /api/events/:id/register
// @access  Private (Student)
exports.unregisterParticipant = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.participants.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Not registered for this event",
      });
    }

    event.participants = event.participants.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await event.save();

    res.json({
      success: true,
      message: "Unregistered successfully from the event",
      data: event,
    });
  } catch (error) {
    console.error("Error in unregisterParticipant:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
