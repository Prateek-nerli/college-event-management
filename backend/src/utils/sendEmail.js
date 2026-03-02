const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create Transporter (Configure with your email service)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP host
    auth: {
      user: process.env.EMAIL_USER, // Add these to your .env file
      pass: process.env.EMAIL_PASS, // Use an "App Password", not your login password
    },
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `"College Event Team" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html, // We will send HTML emails
  };

  // 3. Send
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;