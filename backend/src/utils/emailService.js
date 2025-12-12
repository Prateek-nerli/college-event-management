const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Create the Transporter (The Postman)
// For Gmail, you need an "App Password" (not your login password).
// If using another service (Outlook, SendGrid), change the host/port.
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host: 'smtp.example.com', port: 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Define the Send Function
const sendCertificateEmail = async (toEmail, studentName, eventName, certificateUrl) => {
  const mailOptions = {
    from: `"College Events" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎓 Certificate Earned: ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #1e40af; text-align: center;">Congratulations, ${studentName}!</h2>
        <p style="font-size: 16px; color: #333;">
          We are pleased to certify your participation in <strong>${eventName}</strong>.
        </p>
        <p style="font-size: 16px; color: #333;">
          Your official certificate is ready for download.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${certificateUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            Download Certificate ⬇️
          </a>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center;">
          You can also view this anytime in your student profile.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Email failed for ${toEmail}:`, error.message);
    return false;
  }
};

module.exports = { sendCertificateEmail };