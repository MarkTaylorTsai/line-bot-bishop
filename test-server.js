require('dotenv').config();
const express = require('express');
// const { logger, logError } = require('./services/loggerService');
const { sendDueReminders } = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 3001;

// Body parsing middleware
app.use(express.json());

// Test endpoint for sending reminders
app.post('/send-reminders', async (req, res) => {
  try {
    // logger('Starting reminder sending process...');
    const result = await sendDueReminders();
    // logger(`Reminder sending completed. Sent: ${result.remindersSent}`);

    res.json({
      success: true,
      remindersSent: result.remindersSent,
      totalProcessed: result.totalProcessed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // logError('Error in send-reminders endpoint:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  // console.log(`🧪 Test server running on http://localhost:${PORT}`);
  // console.log(`📝 Test endpoint: http://localhost:${PORT}/send-reminders`);
  // console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
