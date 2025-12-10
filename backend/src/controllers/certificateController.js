const path = require('path');
const fs = require('fs');
const Event = require('../models/Event');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const { generateCertificatePdf } = require('../utils/certificateGenerator');

/**
 * Save / update certificate template for a specific event
 * Only the event organizer or admin/collegeAdmin can do this
 */
exports.saveCertificateTemplate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      topHeader,
      mainHeader,
      title,
      subTitle,
      presentationText,
      bodyText,
      dateText,
      signatures,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Permission check: organizerId OR admin / collegeAdmin
    const isOrganizer =
      event.organizerId && event.organizerId.toString() === req.user._id.toString();
    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'collegeAdmin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit certificate template' });
    }

    event.certificateTemplate = {
      enabled: true,
      topHeader,
      mainHeader,
      title,
      subTitle,
      presentationText,
      bodyText,
      dateText,
      signatures: signatures || [],   // [{ name, role }, ...]
    };

    await event.save();

    return res.json({
      message: 'Certificate template saved successfully',
      certificateTemplate: event.certificateTemplate,
    });
  } catch (err) {
    console.error('saveCertificateTemplate error:', err);
    return res.status(500).json({ message: 'Server error while saving template' });
  }
};

/**
 * Get certificate template for an event (for organizer editor)
 */
exports.getCertificateTemplate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('certificateTemplate');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json(event.certificateTemplate || {});
  } catch (err) {
    console.error('getCertificateTemplate error:', err);
    return res.status(500).json({ message: 'Server error while fetching template' });
  }
};

/**
 * Generate certificates for all participants of an event
 * Uses event.registrationType to decide which participants to include
 */
exports.generateCertificatesForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type = 'participation' } = req.body;

    // populate participants & team members
    const event = await Event.findById(eventId)
      .populate('participants') // for individual events
      .populate('teamRegistrations.members.userId'); // for team events

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Permission check: organizerId OR admin / collegeAdmin
    const isOrganizer =
      event.organizerId && event.organizerId.toString() === req.user._id.toString();
    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'collegeAdmin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to generate certificates' });
    }

    if (!event.certificateTemplate || !event.certificateTemplate.enabled) {
      return res.status(400).json({
        message: 'Certificate template is not configured for this event',
      });
    }

    // Collect participant users based on registrationType
    let users = [];

    if (event.registrationType === 'individual') {
      // event.participants is an array of User documents (populated)
      users = event.participants || [];
    } else if (event.registrationType === 'team') {
      // Flatten all members.userId from teamRegistrations
      const teamRegs = event.teamRegistrations || [];
      const memberUsers = [];

      teamRegs.forEach((reg) => {
        (reg.members || []).forEach((m) => {
          if (m.userId) {
            memberUsers.push(m.userId);
          }
        });
      });

      // Remove duplicates (same user in multiple teams – just in case)
      const uniqueMap = new Map();
      memberUsers.forEach((u) => {
        uniqueMap.set(u._id.toString(), u);
      });
      users = Array.from(uniqueMap.values());
    }

    if (!users.length) {
      return res
        .status(400)
        .json({ message: 'No participants found for this event' });
    }

    let generated = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const { fileUrl, certificateId } = await generateCertificatePdf({
          user,
          event,
          template: event.certificateTemplate,
          type,
        });

        // Upsert certificate in DB
        await Certificate.findOneAndUpdate(
          { user: user._id, event: event._id },
          {
            user: user._id,
            event: event._id,
            type,
            fileUrl,
            certificateId,
            issuedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        generated++;
      } catch (e) {
        console.error(
          'Error generating certificate for user',
          user._id.toString(),
          e.message
        );
        errors++;
      }
    }

    return res.json({
      message: 'Certificate generation completed',
      generated,
      errors,
    });
  } catch (err) {
    console.error('generateCertificatesForEvent error:', err);
    return res.status(500).json({ message: 'Server error while generating certificates' });
  }
};

/**
 * Get all certificates for the logged-in user (student side)
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.user._id })
      .populate('event', 'title dates')
      .sort({ issuedAt: -1 });

    return res.json(certs);
  } catch (err) {
    console.error('getMyCertificates error:', err);
    return res.status(500).json({ message: 'Server error while fetching certificates' });
  }
};

/**
 * Download a specific certificate PDF (by certificate _id)
 * Only the owner or admin/collegeAdmin can download
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const cert = await Certificate.findById(id)
      .populate('user', '_id')
      .populate('event', '_id');

    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const isOwner = cert.user._id.toString() === req.user._id.toString();
    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'collegeAdmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to download this certificate' });
    }

    // Reconstruct file path based on where we saved it in certificateGenerator
    const filePath = path.join(
      __dirname,
      '..',
      'uploads',
      'certificates',
      cert.event._id.toString(),
      `${cert.user._id.toString()}.pdf`
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Certificate file not found on server' });
    }

    res.download(filePath, `certificate-${cert.certificateId || cert._id}.pdf`);
  } catch (err) {
    console.error('downloadCertificate error:', err);
    return res.status(500).json({ message: 'Server error while downloading certificate' });
  }
};
