require('dotenv').config();
const { sendDueReminders } = require('./services/reminderService');
const { logger, logError } = require('./services/loggerService');

async function testReminders() {
  try {
    console.log('Testing reminder service...');
    const result = await sendDueReminders();
    console.log(`Test completed successfully! Reminders sent: ${result.remindersSent}`);
    console.log('✅ Reminder service test passed');
    console.log(`📊 Result:`, result);
  } catch (error) {
    console.error('❌ Reminder service test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testReminders();
