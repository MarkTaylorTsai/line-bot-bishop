const { sendDueReminders } = require('../services/reminderService');
const { logger, logError } = require('../services/loggerService');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests for cron jobs
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    logger('Starting reminder sending process...');
    const result = await sendDueReminders();
    logger(`Reminder sending completed. Sent: ${result.remindersSent}`);
    res.status(200).json({ 
      success: true,
      remindersSent: result.remindersSent,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logError('Error in send-reminders endpoint:', err);
    res.status(500).json({ 
      error: 'Failed to send reminders',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};
