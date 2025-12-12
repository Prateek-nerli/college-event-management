const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const {
  saveCertificateTemplate,
  getCertificateTemplate,
  generateCertificatesForEvent,
  getMyCertificates,
  downloadCertificate,
} = require('../controllers/certificateController');

// ========== EVENT-LEVEL (Organizer/Admin) ==========

// Save or update certificate template for an event
router.post(
  '/events/:eventId/certificate-template',
  protect,
  saveCertificateTemplate
);

// Get certificate template for an event (for editor)
router.get(
  '/events/:eventId/certificate-template',
  protect,
  getCertificateTemplate
);

router.post(
  '/events/:eventId/certificates/generate-bulk',
  protect,// This maps to the function we just wrote
  require('../controllers/certificateController').generateAndDistributeCertificates
);

// ========== USER-LEVEL (Student) ==========

// Get all certificates for logged-in user
router.get('/me/certificates', protect, getMyCertificates);

// Download a specific certificate PDF
router.get('/certificates/:id/download', protect, downloadCertificate);

module.exports = router;
