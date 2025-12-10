const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Generates a certificate PDF for a single user + event.
 * @param {Object} options
 * @param {Object} options.user - Mongoose User document (must have a name field)
 * @param {Object} options.event - Mongoose Event document
 * @param {Object} options.template - event.certificateTemplate object
 * @param {String} options.type - certificate type (participation / winner / ...)
 * @returns {Promise<{ filePath: string, fileUrl: string, certificateId: string }>}
 */
async function generateCertificatePdf({ user, event, template, type }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });

    // Store under: backend/uploads/certificates/<eventId>/<userId>.pdf
    const baseDir = path.join(__dirname, '..', 'uploads', 'certificates', event._id.toString());
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const fileName = `${user._id}.pdf`;
    const filePath = path.join(baseDir, fileName);
    const fileUrl = `/uploads/certificates/${event._id}/${fileName}`;

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Optional: background image (for future, if you set template.backgroundImageUrl)
    if (template && template.backgroundImageUrl) {
      const bgPath = path.join(__dirname, '..', template.backgroundImageUrl);
      try {
        doc.image(bgPath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
      } catch (e) {
        console.error('Error loading background image:', e.message);
      }
    }

    // ===== Layout =====
    const centerX = doc.page.width / 2;

    // Top header (small text, e.g. AWARDED BY)
    doc.fontSize(10).fillColor('#555555');
    if (template?.topHeader) {
      doc.text(template.topHeader.toUpperCase(), 0, 80, { align: 'center' });
    }

    // Main header (college name)
    doc.fontSize(22).fillColor('#000000');
    if (template?.mainHeader) {
      doc.text(template.mainHeader, 0, 110, { align: 'center' });
    }

    // Title (Certificate of Participation)
    doc.fontSize(26).font('Helvetica-Bold');
    doc.text(template?.title || 'Certificate', 0, 160, { align: 'center' });

    // Subtitle (PRESENTED TO)
    doc.fontSize(10).font('Helvetica');
    doc.text(template?.subTitle || 'PRESENTED TO', 0, 190, {
      align: 'center',
      characterSpacing: 2,
    });

    // Recipient name
    const userName =
      user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student Name';

    doc.fontSize(24).font('Helvetica-Bold');
    doc.text(userName, 0, 220, { align: 'center' });

    // Body text
    doc.fontSize(12).font('Helvetica');
    const bodyY = 260;

    const presentationText = template?.presentationText || 'This is to certify that';
    const bodyText =
      template?.bodyText ||
      'has actively participated and contributed to the successful completion of this event.';

    // Presentation line
    doc.text(presentationText, 80, bodyY, {
      width: doc.page.width - 160,
      align: 'center',
    });

    // Event line
    doc.moveDown(0.5);
    doc.text(`has participated in "${event.title}"`, {
      width: doc.page.width - 160,
      align: 'center',
    });

    // Main body text
    doc.moveDown(0.5);
    doc.text(bodyText, {
      width: doc.page.width - 160,
      align: 'center',
    });

    // Date at bottom-left
    const dateText =
      template?.dateText ||
      (event.dates?.startDate
        ? new Date(event.dates.startDate).toDateString()
        : new Date().toDateString());

    doc.fontSize(10).text(`Date: ${dateText}`, 80, doc.page.height - 100);

    // Signatures at bottom
    const signatures = template?.signatures || [];
    const count = signatures.length || 1;
    const gap = doc.page.width / (count + 1);
    let x = gap;
    const sigY = doc.page.height - 160;

    doc.lineWidth(0.5).strokeColor('#555555');

    signatures.forEach((sig) => {
      // Signature line
      doc.moveTo(x - 80, sigY + 40).lineTo(x + 80, sigY + 40).stroke();

      // Name
      doc
        .fontSize(10)
        .text(sig.name || '', x - 80, sigY + 45, {
          width: 160,
          align: 'center',
        });

      // Role
      doc
        .fontSize(8)
        .text(sig.role || '', x - 80, sigY + 60, {
          width: 160,
          align: 'center',
        });

      x += gap;
    });

    doc.end();

    stream.on('finish', () => {
      // generate a simple human-readable id
      const certificateId = `${event._id.toString().slice(-4)}-${user._id
        .toString()
        .slice(-4)}`;
      resolve({ filePath, fileUrl, certificateId });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { generateCertificatePdf };
