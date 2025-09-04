const line = require('@line/bot-sdk');

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

/**
 * Send a text message to a specific user
 * @param {string} userId - LINE user ID
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} - LINE API response
 */
async function sendMessage (userId, message) {
  try {
    const response = await client.pushMessage(userId, {
      type: 'text',
      text: message
    });

    // console.log(`Message sent to ${userId}:`, response);
    return response;
  } catch (error) {
    // console.error(`Error sending message to ${userId}:`, error);
    throw error;
  }
}

/**
 * Send a message to multiple users
 * @param {Array<string>} userIds - Array of LINE user IDs
 * @param {string} message - Message text to send
 * @returns {Promise<Array>} - Array of LINE API responses
 */
async function sendMulticast (userIds, message) {
  try {
    const response = await client.multicast(userIds, {
      type: 'text',
      text: message
    });

    // console.log(`Multicast message sent to ${userIds.length} users:`, response);
    return response;
  } catch (error) {
    // console.error('Error sending multicast message:', error);
    throw error;
  }
}

/**
 * Send a reminder message with formatted content
 * @param {string} userId - LINE user ID
 * @param {Object} reminder - Reminder object with message and reminder_time
 * @returns {Promise<Object>} - LINE API response
 */
async function sendReminderMessage (userId, reminder) {
  const reminderTime = new Date(reminder.reminder_time);
  const formattedTime = reminderTime.toLocaleString();

  const message = `⏰ **REMINDER** ⏰

📝 **Message:** ${reminder.message}
🕐 **Scheduled for:** ${formattedTime}

This reminder was scheduled in advance.`;

  return await sendMessage(userId, message);
}

/**
 * Send a confirmation message for reminder creation
 * @param {string} userId - LINE user ID
 * @param {Object} reminderData - Reminder data
 * @returns {Promise<Object>} - LINE API response
 */
async function sendReminderConfirmation (userId, reminderData) {
  const message = `✅ **Reminder Confirmation**

📅 **Date:** ${reminderData.date}
⏰ **Time:** ${reminderData.time}
📝 **Message:** ${reminderData.message}

Your reminder has been successfully created!`;

  return await sendMessage(userId, message);
}

/**
 * Send an error message to user
 * @param {string} userId - LINE user ID
 * @param {string} errorMessage - Error message to send
 * @returns {Promise<Object>} - LINE API response
 */
async function sendErrorMessage (userId, errorMessage) {
  const message = `❌ **Error**

${errorMessage}

Please try again or contact support if the problem persists.`;

  return await sendMessage(userId, message);
}

/**
 * Get user profile information
 * @param {string} userId - LINE user ID
 * @returns {Promise<Object>} - User profile
 */
async function getUserProfile (userId) {
  try {
    const profile = await client.getProfile(userId);
    // console.log(`User profile for ${userId}:`, profile);
    return profile;
  } catch (error) {
    // console.error(`Error getting profile for ${userId}:`, error);
    throw error;
  }
}

/**
 * Validate LINE configuration
 * @returns {boolean} - Whether configuration is valid
 */
function validateConfig () {
  if (!config.channelAccessToken || !config.channelSecret) {
    // console.error('LINE Bot configuration is incomplete');
    return false;
  }
  return true;
}

module.exports = {
  sendMessage,
  sendMulticast,
  sendReminderMessage,
  sendReminderConfirmation,
  sendErrorMessage,
  getUserProfile,
  validateConfig,
  client
};
