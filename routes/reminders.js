const express = require('express');
const { sendDueReminders } = require('../services/reminderService');

const router = express.Router();

// Middleware to check for API key (optional security)
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Manual trigger endpoint for sending due reminders
router.post('/', checkApiKey, async (req, res) => {
  try {
    // console.log('Manual reminder check triggered');
    const result = await sendDueReminders();

    res.status(200).json({
      success: true,
      message: 'Reminder check completed',
      remindersSent: result.remindersSent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // console.error('Error in manual reminder check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process reminders',
      message: error.message
    });
  }
});

// GET endpoint for health check and status
router.get('/', async (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      service: 'Reminder Service',
      timestamp: new Date().toISOString(),
      endpoints: {
        'POST /': 'Trigger manual reminder check',
        'GET /': 'Service status'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

module.exports = router;
