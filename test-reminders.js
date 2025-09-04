require('dotenv').config();
const { sendDueReminders } = require('./services/reminderService');
// const { logger, logError } = require('./services/loggerService');

// console.log('Testing reminder service...');

sendDueReminders()
  .then(result => {
    // console.log(`Test completed successfully! Reminders sent: ${result.remindersSent}`);
    // console.log('✅ Reminder service test passed');
    // console.log(`📊 Result:`, result);
  })
  .catch(error => {
    // console.error('❌ Reminder service test failed:', error.message);
  });
