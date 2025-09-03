require('dotenv').config();
const express = require('express');
const { sendDueReminders } = require('./services/reminderService');
const { logger, logError } = require('./services/loggerService');

const app = express();
const PORT = 3001;

app.use(express.json());

// Test endpoint that mimics the Vercel serverless function
app.get('/send-reminders', async (req, res) => {
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
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server running' });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log(`📝 Test endpoint: http://localhost:${PORT}/send-reminders`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
