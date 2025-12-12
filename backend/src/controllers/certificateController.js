const PDFDocument = require("pdfkit");
const cloudinary = require("../config/cloudinary"); // The file you just created
const Event = require("../models/Event");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
// 1. Add this Import at the top (already present in file but shown here for clarity)
const { sendCertificateEmail } = require("../utils/emailService");

// --- Helper: Upload Buffer to Cloudinary ---
const uploadToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: folder,
        public_id: filename,
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

// --- Helper: Generate Professional PDF Buffer ---
const generatePDFBuffer = (user, event, template) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 0,
    });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const PAGE_WIDTH = 841.89;
    const PAGE_HEIGHT = 595.28;
    const centerX = PAGE_WIDTH / 2;

    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill("#1e293b");
    doc.rect(15, 15, PAGE_WIDTH - 30, PAGE_HEIGHT - 30).fill("#ffffff");
    doc
      .rect(25, 25, PAGE_WIDTH - 50, PAGE_HEIGHT - 50)
      .lineWidth(3)
      .stroke("#eab308");

    doc
      .save()
      .translate(25, 25)
      .path("M 0 0 L 40 0 L 0 40 Z")
      .fill("#ca8a04")
      .restore();
    doc
      .save()
      .translate(PAGE_WIDTH - 25, 25)
      .path("M 0 0 L -40 0 L 0 40 Z")
      .fill("#ca8a04")
      .restore();
    doc
      .save()
      .translate(25, PAGE_HEIGHT - 25)
      .path("M 0 0 L 40 0 L 0 -40 Z")
      .fill("#ca8a04")
      .restore();
    doc
      .save()
      .translate(PAGE_WIDTH - 25, PAGE_HEIGHT - 25)
      .path("M 0 0 L -40 0 L 0 -40 Z")
      .fill("#ca8a04")
      .restore();

    doc.moveDown(4);
    if (template?.topHeader) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#64748b")
        .text(template.topHeader.toUpperCase(), 0, 80, {
          align: "center",
          letterSpacing: 3,
        });
    }

    doc.moveDown(0.5);
    doc
      .fontSize(26)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(template?.mainHeader || "INSTITUTE NAME", { align: "center" });

    const headerWidth = doc.widthOfString(
      template?.mainHeader || "INSTITUTE NAME"
    );
    doc
      .moveTo(centerX - headerWidth / 2 - 20, doc.y)
      .lineTo(centerX + headerWidth / 2 + 20, doc.y)
      .lineWidth(2)
      .stroke("#eab308");

    doc.moveDown(1);
    doc
      .fontSize(36)
      .font("Times-Roman")
      .fillColor("#1e3a8a")
      .text(template?.title || "Certificate of Completion", {
        align: "center",
      });

    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text(template?.subTitle || "PROUDLY PRESENTED TO", {
        align: "center",
        letterSpacing: 2,
      });

    const studentName =
      user.profile?.fullName || user.username || "Student Name";
    doc.moveDown(1);
    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(studentName, { align: "center" });

    doc
      .moveTo(centerX - 150, doc.y)
      .lineTo(centerX + 150, doc.y)
      .lineWidth(0.5)
      .stroke("#cbd5e1");

    doc.moveDown(1.5);
    const bodyText =
      template?.bodyText || "For outstanding performance and dedication.";
    doc
      .fontSize(14)
      .font("Times-Italic")
      .fillColor("#475569")
      .text(bodyText, centerX - 250, doc.y, {
        width: 500,
        align: "center",
        lineGap: 5,
      });

    const footerY = PAGE_HEIGHT - 120;

    const dateStr = template?.dateText || new Date().toLocaleDateString();
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(dateStr, 80, footerY + 10, { width: 150, align: "center" });
    doc.moveTo(80, footerY).lineTo(230, footerY).lineWidth(1).stroke("#94a3b8");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text("DATE", 80, footerY + 15, { width: 150, align: "center" });

    if (template?.signatures && template.signatures.length > 0) {
      const sigCount = template.signatures.length;
      const startX = PAGE_WIDTH - sigCount * 200 - 50;

      let currentX = startX;
      template.signatures.forEach((sig) => {
        doc
          .moveTo(currentX, footerY)
          .lineTo(currentX + 150, footerY)
          .lineWidth(1)
          .stroke("#94a3b8");

        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#1e293b")
          .text(sig.name, currentX, footerY + 5, {
            width: 150,
            align: "center",
          });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#64748b")
          .text(sig.role.toUpperCase(), currentX, footerY + 20, {
            width: 150,
            align: "center",
            letterSpacing: 1,
          });

        doc
          .fontSize(18)
          .font("Times-Italic")
          .fillColor("#1e40af")
          .opacity(0.6)
          .text("Signed", currentX, footerY - 40, {
            width: 150,
            align: "center",
          });
        doc.opacity(1);

        currentX += 180;
      });
    }

    doc.end();
  });
};

// ... keep existing exports (saveCertificateTemplate, etc.) ...

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
      enabled,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (
      event.organizerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
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
    res.json({
      message: "Template saved",
      template: event.certificateTemplate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCertificateTemplate = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select(
      "certificateTemplate"
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event.certificateTemplate || {});
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.generateAndDistributeCertificates = async (req, res) => {
  const { eventId } = req.params;
  const { attendees } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!event.certificateTemplate?.enabled) {
      return res
        .status(400)
        .json({ message: "Certificate template not enabled" });
    }

    let targetUserIds = [];
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      targetUserIds = attendees;
    } else {
      targetUserIds = event.participants;
    }

    const results = [];
    let errors = 0;

    for (const userId of targetUserIds) {
      try {
        const user = await User.findById(userId);
        if (!user) continue;

        // 1. Generate PDF in memory
        const pdfBuffer = await generatePDFBuffer(
          user,
          event,
          event.certificateTemplate
        );

        // 2. Upload to Cloudinary
        const cloudFile = await uploadToCloudinary(
          pdfBuffer,
          `certificates/${eventId}`, // Folder
          `${user._id}_cert` // Filename
        );

        // 3. Save Record in DB
        await Certificate.findOneAndUpdate(
          { user: user._id, event: event._id },
          {
            user: user._id,
            event: event._id,
            type: "participation",
            fileUrl: cloudFile.secure_url, // Cloudinary URL
            certificateId: `${eventId.slice(-4)}-${user._id
              .toString()
              .slice(-4)}`,
            issuedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        // ✅ 4. SEND EMAIL AUTOMATICALLY
        // We await here so any email errors are visible. If you prefer not to await, remove the `await`.
        await sendCertificateEmail(
          user.email,
          user.profile?.fullName || user.username,
          event.title,
          cloudFile.secure_url
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
      results,
    });
  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({ message: "Failed to generate certificates" });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.user._id })
      .populate("event", "title dates")
      .sort({ issuedAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert)
      return res.status(404).json({ message: "Certificate not found" });

    if (
      cert.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.redirect(cert.fileUrl);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
