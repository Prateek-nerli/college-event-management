const cron = require('node-cron');
const Event = require('../models/Event'); 
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const startReminderJob = () => {
  // Schedule: Run every hour at minute 0 (e.g., 1:00, 2:00...)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running Event Reminder Job...');

    try {
      // Calculate time range: Events starting in the next 24 hours
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find events that:
      // 1. Start within 24 hours
      // 2. Haven't started yet
      // 3. Haven't had a reminder sent yet
      const upcomingEvents = await Event.find({
        'dates.startDate': { $lte: next24Hours, $gt: now },
        reminderSent: false, 
        status: 'published' // Only published events
      })
      .populate('participants') // Individual users
      .populate({
        path: 'teamRegistrations.members.userId', // Team members
        model: 'User'
      });

      if (upcomingEvents.length === 0) {
        console.log('✅ No upcoming events needing reminders.');
        return;
      }

      console.log(`📢 Found ${upcomingEvents.length} events starting soon.`);

      for (const event of upcomingEvents) {
        // 1. Collect all recipient emails
        let recipients = [];

        // Add Individual Participants
        if (event.registrationType === 'individual') {
          event.participants.forEach(user => {
            // Check if user wants email reminders
            if (user && user.email && user.notificationSettings?.email?.reminders) {
              recipients.push(user.email);
            }
          });
        } 
        // Add Team Participants
        else if (event.registrationType === 'team') {
          event.teamRegistrations.forEach(team => {
            team.members.forEach(member => {
              const user = member.userId;
              if (user && user.email && user.notificationSettings?.email?.reminders) {
                recipients.push(user.email);
              }
            });
          });
        }

        // Remove duplicates
        recipients = [...new Set(recipients)];

        if (recipients.length > 0) {
          console.log(`   - Sending emails to ${recipients.length} participants for "${event.title}"`);

          // 2. Construct Email Content
          const eventDate = new Date(event.dates.startDate).toLocaleString();
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #4f46e5;">Reminder: ${event.title} is Tomorrow! 🚀</h2>
              <p>Hello,</p>
              <p>This is a gentle reminder that you are registered for <strong>${event.title}</strong>.</p>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Date:</strong> ${eventDate}</p>
                <p><strong>📍 Venue:</strong> ${event.venue?.name || 'TBD'} (${event.venue?.location || ''})</p>
              </div>

              <p>Get ready and we look forward to seeing you there!</p>
              <p><em>- The College Event Team</em></p>
            </div>
          `;

          // 3. Send Emails (Looping to send individually or use BCC)
          // Using loop here to avoid exposing everyone's email in "To" field if using single send
          const emailPromises = recipients.map(email => 
            sendEmail({
              email: email,
              subject: `🔔 Reminder: ${event.title} starts soon!`,
              html: htmlContent
            }).catch(err => console.error(`Failed to email ${email}:`, err.message))
          );

          await Promise.all(emailPromises);
        }

        // 4. Mark event as processed so we don't email them again next hour
        event.reminderSent = true;
        await event.save();
      }

      console.log('✅ Reminder job completed.');

    } catch (error) {
      console.error('❌ Error in reminder cron job:', error);
    }
  });
};

module.exports = startReminderJob;