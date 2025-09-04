const express = require('express');
const line = require('@line/bot-sdk');
const crypto = require('crypto');
const { createReminder, getReminders, deleteReminder, updateReminder } = require('../services/supabaseService');
const { sendMessage } = require('../services/lineService');
const { parseReminderCommand } = require('../utils/commandParser');
const { lineWebhookLimiter, userSpecificLimiter, burstLimiter } = require('../middleware/rateLimit');
const { validateLineEvent, validateCommand, sanitizeInput } = require('../middleware/validation');
const { logger, logLineEvent, logError } = require('../services/loggerService');

const router = express.Router();

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// Middleware to verify LINE signature
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  if (!signature) {
    logger.warn({
      message: 'LINE signature missing',
      ip: req.ip,
      url: req.url
    });
    return res.status(401).json({ error: 'No signature provided' });
  }

  try {
    const body = JSON.stringify(req.body);
    const hash = crypto.createHmac('SHA256', config.channelSecret)
      .update(body, 'utf8')
      .digest('base64');

    if (hash !== signature) {
      logger.warn({
        message: 'Invalid LINE signature',
        ip: req.ip,
        url: req.url,
        providedSignature: signature
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
    next();
  } catch (error) {
    logError(error, req);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

// Check if user is authorized
const isAuthorized = (userId) => {
  const authorizedUsers = process.env.AUTHORIZED_USERS?.split(',') || [];
  return authorizedUsers.includes(userId);
};

// Main webhook endpoint with production features
router.post('/',
  lineWebhookLimiter,
  userSpecificLimiter,
  burstLimiter,
  verifySignature,
  validateLineEvent,
  sanitizeInput,
  async (req, res) => {
    try {
      const { events } = req.body;

      logger.info({
        message: 'LINE webhook received',
        eventCount: events.length,
        ip: req.ip
      });

      for (const event of events) {
        if (event.type !== 'message' || event.message.type !== 'text') {
          continue;
        }

        const { userId } = event.source;
        const messageText = event.message.text;

        logLineEvent('message_received', userId, 'text');

        // Check authorization
        if (!isAuthorized(userId)) {
          logger.warn({
            message: 'Unauthorized user attempt',
            userId,
            ip: req.ip
          });
          await sendMessage(userId, '❌ Sorry, you are not authorized to use this bot.');
          continue;
        }

        // Handle different commands
        try {
          if (messageText.startsWith('/help')) {
            await handleHelpCommand(userId);
          } else if (messageText.startsWith('/add')) {
            await handleAddReminder(userId, messageText);
          } else if (messageText.startsWith('/list')) {
            await handleListReminders(userId);
          } else if (messageText.startsWith('/delete')) {
            await handleDeleteReminder(userId, messageText);
          } else if (messageText.startsWith('/update')) {
            await handleUpdateReminder(userId, messageText);
          } else {
            await handleUnknownCommand(userId);
          }
        } catch (commandError) {
          logError(commandError, req);
          await sendMessage(userId, '❌ An error occurred while processing your command. Please try again.');
        }
      }

      res.status(200).json({ status: 'OK' });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Command handlers
async function handleHelpCommand (userId) {
  try {
    const helpMessage = `🤖 **LINE Bot Assistant - Help**

**Available Commands:**

📝 **Add Reminder:**
\`/add [date] [time] [message]\`
Example: \`/add 2024-01-15 14:30 Interview with Google\`

📋 **List Reminders:**
\`/list\` - Shows all your upcoming reminders

🗑️ **Delete Reminder:**
\`/delete [reminder_id]\`
Example: \`/delete 123\`

✏️ **Update Reminder:**
\`/update [reminder_id] [new_date] [new_time] [new_message]\`
Example: \`/update 123 2024-01-16 15:00 Updated interview time\`

❓ **Help:**
\`/help\` - Shows this help message

**Date Format:** YYYY-MM-DD
**Time Format:** HH:MM (24-hour)`;

    await sendMessage(userId, helpMessage);
    logLineEvent('help_command', userId, 'text');
  } catch (error) {
    logError(error);
    throw error;
  }
}

async function handleAddReminder (userId, messageText) {
  try {
    const reminderData = parseReminderCommand(messageText);

    if (!reminderData) {
      await sendMessage(userId, '❌ Invalid format. Use: /add [date] [time] [message]\nExample: /add 2024-01-15 14:30 Interview with Google');
      return;
    }

    const reminder = await createReminder({
      userId,
      message: reminderData.message,
      reminderTime: reminderData.reminderTime,
      status: 'pending'
    });

    await sendMessage(userId, `✅ Reminder created successfully!\n\n📅 **Date:** ${reminderData.date}\n⏰ **Time:** ${reminderData.time}\n📝 **Message:** ${reminderData.message}\n🆔 **ID:** ${reminder.id}`);

    logLineEvent('reminder_created', userId, 'text', reminder.id);
  } catch (error) {
    logError(error);
    await sendMessage(userId, '❌ Failed to create reminder. Please try again.');
    throw error;
  }
}

async function handleListReminders (userId) {
  try {
    const reminders = await getReminders(userId);

    if (reminders.length === 0) {
      await sendMessage(userId, '📋 No reminders found.');
      return;
    }

    let message = '📋 **Your Reminders:**\n\n';
    reminders.forEach((reminder, index) => {
      const date = new Date(reminder.reminder_time).toLocaleDateString();
      const time = new Date(reminder.reminder_time).toLocaleTimeString();
      message += `${index + 1}. **ID:** ${reminder.id}\n📅 **Date:** ${date}\n⏰ **Time:** ${time}\n📝 **Message:** ${reminder.message}\n\n`;
    });

    await sendMessage(userId, message);
    logLineEvent('reminders_listed', userId, 'text');
  } catch (error) {
    logError(error);
    await sendMessage(userId, '❌ Failed to fetch reminders. Please try again.');
    throw error;
  }
}

async function handleDeleteReminder (userId, messageText) {
  try {
    const parts = messageText.split(' ');
    if (parts.length !== 2) {
      await sendMessage(userId, '❌ Invalid format. Use: /delete [reminder_id]');
      return;
    }

    const reminderId = parseInt(parts[1]);
    if (isNaN(reminderId)) {
      await sendMessage(userId, '❌ Invalid reminder ID. Please provide a valid number.');
      return;
    }

    const deleted = await deleteReminder(reminderId, userId);

    if (deleted) {
      await sendMessage(userId, `✅ Reminder with ID ${reminderId} has been deleted.`);
      logLineEvent('reminder_deleted', userId, 'text', reminderId);
    } else {
      await sendMessage(userId, '❌ Reminder not found or you don\'t have permission to delete it.');
    }
  } catch (error) {
    logError(error);
    await sendMessage(userId, '❌ Failed to delete reminder. Please try again.');
    throw error;
  }
}

async function handleUpdateReminder (userId, messageText) {
  try {
    const parts = messageText.split(' ');
    if (parts.length < 5) {
      await sendMessage(userId, '❌ Invalid format. Use: /update [reminder_id] [new_date] [new_time] [new_message]');
      return;
    }

    const reminderId = parseInt(parts[1]);
    if (isNaN(reminderId)) {
      await sendMessage(userId, '❌ Invalid reminder ID. Please provide a valid number.');
      return;
    }

    const reminderData = parseReminderCommand(`/add ${parts[2]} ${parts[3]} ${parts.slice(4).join(' ')}`);

    if (!reminderData) {
      await sendMessage(userId, '❌ Invalid date/time format. Use: YYYY-MM-DD HH:MM');
      return;
    }

    const updated = await updateReminder(reminderId, userId, {
      message: reminderData.message,
      reminderTime: reminderData.reminderTime
    });

    if (updated) {
      await sendMessage(userId, `✅ Reminder updated successfully!\n\n📅 **New Date:** ${reminderData.date}\n⏰ **New Time:** ${reminderData.time}\n📝 **New Message:** ${reminderData.message}`);
      logLineEvent('reminder_updated', userId, 'text', reminderId);
    } else {
      await sendMessage(userId, '❌ Reminder not found or you don\'t have permission to update it.');
    }
  } catch (error) {
    logError(error);
    await sendMessage(userId, '❌ Failed to update reminder. Please try again.');
    throw error;
  }
}

async function handleUnknownCommand (userId) {
  try {
    await sendMessage(userId, '❓ Unknown command. Type `/help` to see available commands.');
    logLineEvent('unknown_command', userId, 'text');
  } catch (error) {
    logError(error);
    throw error;
  }
}

module.exports = router;
