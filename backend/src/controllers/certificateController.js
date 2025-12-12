const PDFDocument = require('pdfkit');
const cloudinary = require('../config/cloudinary'); // The file you just created
const Event = require('../models/Event');
const User = require('../models/User');
const Certificate = require('../models/Certificate');

// --- Helper: Upload Buffer to Cloudinary ---
// --- Helper: Upload Buffer to Cloudinary ---
const uploadToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // <--- CHANGED THIS from 'raw' to 'auto'
        folder: folder,
        public_id: filename,
        // format: 'pdf',      // <--- REMOVE THIS LINE (let 'auto' handle it)
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// --- Helper: Generate PDF Buffer ---
// ... existing imports ...

// --- Helper: Generate Professional PDF Buffer ---
const generatePDFBuffer = (user, event, template) => {
  return new Promise((resolve) => {
    // 1. Setup Document (A4 Landscape: 841.89 x 595.28 points)
    const doc = new PDFDocument({ 
      layout: 'landscape', 
      size: 'A4',
      margin: 0 // We draw our own custom margins
    });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Constants
    const PAGE_WIDTH = 841.89;
    const PAGE_HEIGHT = 595.28;
    const centerX = PAGE_WIDTH / 2;

    // --- 2. Professional Border Design ---
    // Outer Dark Frame
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#1e293b'); // Slate-800
    
    // Inner White Canvas
    doc.rect(15, 15, PAGE_WIDTH - 30, PAGE_HEIGHT - 30).fill('#ffffff');

    // Gold Inner Border
    doc.rect(25, 25, PAGE_WIDTH - 50, PAGE_HEIGHT - 50)
       .lineWidth(3)
       .stroke('#eab308'); // Yellow-500

    // Decorative Corners (Triangle vectors)
    // Top-Left
    doc.save().translate(25, 25).path('M 0 0 L 40 0 L 0 40 Z').fill('#ca8a04').restore();
    // Top-Right
    doc.save().translate(PAGE_WIDTH - 25, 25).path('M 0 0 L -40 0 L 0 40 Z').fill('#ca8a04').restore();
    // Bottom-Left
    doc.save().translate(25, PAGE_HEIGHT - 25).path('M 0 0 L 40 0 L 0 -40 Z').fill('#ca8a04').restore();
    // Bottom-Right
    doc.save().translate(PAGE_WIDTH - 25, PAGE_HEIGHT - 25).path('M 0 0 L -40 0 L 0 -40 Z').fill('#ca8a04').restore();

    // --- 3. Content ---
    
    // Top Header ("AWARDED BY")
    doc.moveDown(4);
    if (template?.topHeader) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#64748b') // Slate-500
         .text(template.topHeader.toUpperCase(), 0, 80, { align: 'center', letterSpacing: 3 });
    }

    // Main Header (Institution Name)
    doc.moveDown(0.5);
    doc.fontSize(26)
       .font('Helvetica-Bold')
       .fillColor('#1e293b') // Slate-800
       .text(template?.mainHeader || 'INSTITUTE NAME', { align: 'center' });
    
    // Underline for Institution
    const headerWidth = doc.widthOfString(template?.mainHeader || 'INSTITUTE NAME');
    doc.moveTo(centerX - (headerWidth/2) - 20, doc.y)
       .lineTo(centerX + (headerWidth/2) + 20, doc.y)
       .lineWidth(2)
       .stroke('#eab308');

    // Title ("Certificate of Achievement")
    doc.moveDown(1);
    doc.fontSize(36)
       .font('Times-Roman') // Serif font looks more official
       .fillColor('#1e3a8a') // Blue-900
       .text(template?.title || 'Certificate of Completion', { align: 'center' });

    // Subtitle ("PROUDLY PRESENTED TO")
    doc.moveDown(0.5);
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#94a3b8') // Slate-400
       .text(template?.subTitle || 'PROUDLY PRESENTED TO', { align: 'center', letterSpacing: 2 });

    // Recipient Name
    const studentName = user.profile?.fullName || user.username || 'Student Name';
    doc.moveDown(1);
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fillColor('#0f172a') // Slate-900
       .text(studentName, { align: 'center' });

    // Line under name
    doc.moveTo(centerX - 150, doc.y)
       .lineTo(centerX + 150, doc.y)
       .lineWidth(0.5)
       .stroke('#cbd5e1');

    // Body Text
    doc.moveDown(1.5);
    const bodyText = template?.bodyText || 'For outstanding performance and dedication.';
    doc.fontSize(14)
       .font('Times-Italic')
       .fillColor('#475569') // Slate-600
       .text(bodyText, centerX - 250, doc.y, { 
         width: 500, 
         align: 'center', 
         lineGap: 5 
       });

    // --- 4. Footer & Signatures ---
    const footerY = PAGE_HEIGHT - 120;

    // Date (Left)
    const dateStr = template?.dateText || new Date().toLocaleDateString();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b')
       .text(dateStr, 80, footerY + 10, { width: 150, align: 'center' });
    doc.moveTo(80, footerY).lineTo(230, footerY).lineWidth(1).stroke('#94a3b8');
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
       .text("DATE", 80, footerY + 15, { width: 150, align: 'center' });

    // Signatures (Right/Center)
    if (template?.signatures && template.signatures.length > 0) {
      // Dynamic spacing calculation
      const sigCount = template.signatures.length;
      const startX = PAGE_WIDTH - (sigCount * 200) - 50; 
      
      let currentX = startX;
      template.signatures.forEach((sig) => {
        // Draw Line
        doc.moveTo(currentX, footerY).lineTo(currentX + 150, footerY).lineWidth(1).stroke('#94a3b8');
        
        // Name
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b')
           .text(sig.name, currentX, footerY + 5, { width: 150, align: 'center' });
        
        // Role
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(sig.role.toUpperCase(), currentX, footerY + 20, { width: 150, align: 'center', letterSpacing: 1 });

        // Fake "Signed" Script (Visual Only - in real app, use signatureImageUrl)
        doc.fontSize(18).font('Times-Italic').fillColor('#1e40af').opacity(0.6)
           .text("Signed", currentX, footerY - 40, { width: 150, align: 'center' });
        doc.opacity(1);

        currentX += 180;
      });
    }

    doc.end();
  });
};

// ... keep existing exports (saveCertificateTemplate, etc.) ...

/**
 * Save / Update Certificate Template
 */
exports.saveCertificateTemplate = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { topHeader, mainHeader, title, subTitle, presentationText, bodyText, dateText, signatures, enabled } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Auth check
    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    event.certificateTemplate = {
      enabled: enabled !== undefined ? enabled : true,
      topHeader,
      mainHeader,
      title,
      subTitle,
      presentationText,
      bodyText,
      dateText,
      signatures: signatures || [],
    };

    await event.save();
    res.json({ message: 'Template saved', template: event.certificateTemplate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get Certificate Template
 */
exports.getCertificateTemplate = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select('certificateTemplate');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event.certificateTemplate || {});
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Generate Certificates (Bulk or All) & Upload to Cloudinary
 */
exports.generateAndDistributeCertificates = async (req, res) => {
  const { eventId } = req.params;
  // 'attendees' is an array of User IDs passed from the frontend checkbox selection
  const { attendees } = req.body; 

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!event.certificateTemplate?.enabled) {
      return res.status(400).json({ message: 'Certificate template not enabled' });
    }

    // Determine target users: either the specific list passed, or ALL participants
    let targetUserIds = [];
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      targetUserIds = attendees;
    } else {
      // Fallback: Generate for everyone if no specific list provided
      targetUserIds = event.participants; 
    }

    const results = [];
    let errors = 0;

    for (const userId of targetUserIds) {
      try {
        const user = await User.findById(userId);
        if (!user) continue;

        // 1. Generate PDF in memory
        const pdfBuffer = await generatePDFBuffer(user, event, event.certificateTemplate);

        // 2. Upload to Cloudinary
        const cloudFile = await uploadToCloudinary(
          pdfBuffer,
          `certificates/${eventId}`, // Folder
          `${user._id}_cert`         // Filename
        );

        // 3. Save Record in DB
        await Certificate.findOneAndUpdate(
          { user: user._id, event: event._id },
          {
            user: user._id,
            event: event._id,
            type: 'participation',
            fileUrl: cloudFile.secure_url, // Cloudinary URL
            certificateId: `${eventId.slice(-4)}-${user._id.toString().slice(-4)}`,
            issuedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        results.push({ user: user.username, url: cloudFile.secure_url });
      } catch (innerErr) {
        console.error(`Failed for user ${userId}:`, innerErr.message);
        errors++;
      }
    }

    res.json({
      success: true,
      message: `Generated ${results.length} certificates`,
      errors,
      results
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ message: 'Failed to generate certificates' });
  }
};

/**
 * Get My Certificates (Student)
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.user._id })
      .populate('event', 'title dates')
      .sort({ issuedAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Download (Redirect to Cloudinary URL)
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    // Verify ownership
    if (cert.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Redirect to the Cloudinary URL
    res.redirect(cert.fileUrl);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};