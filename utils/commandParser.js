/**
 * Parse reminder command from LINE message
 * @param {string} messageText - Raw message text from LINE
 * @returns {Object|null} - Parsed reminder data or null if invalid
 */
function parseReminderCommand (messageText) {
  try {
    // Remove the command prefix and trim
    const command = messageText.replace(/^\/add\s+/, '').trim();

    if (!command) {
      return null;
    }

    // Split by spaces to get date, time, and message
    const parts = command.split(' ');

    if (parts.length < 3) {
      return null;
    }

    const dateStr = parts[0];
    const timeStr = parts[1];
    const message = parts.slice(2).join(' ');

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return null;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      return null;
    }

    // Create reminder time
    const reminderTime = new Date(`${dateStr}T${timeStr}:00`);

    // Check if the date is in the future
    const now = new Date();
    if (reminderTime <= now) {
      return null;
    }

    // Validate the date is valid
    if (isNaN(reminderTime.getTime())) {
      return null;
    }

    return {
      date: dateStr,
      time: timeStr,
      message,
      reminderTime
    };
  } catch (error) {
    console.error('Error parsing reminder command:', error);
    return null;
  }
}

/**
 * Parse natural language date/time expressions
 * @param {string} text - Text containing date/time information
 * @returns {Object|null} - Parsed date/time or null if invalid
 */
function parseNaturalDateTime (text) {
  try {
    const lowerText = text.toLowerCase();
    const now = new Date();

    // Today
    if (lowerText.includes('today')) {
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const reminderTime = new Date(now);
        reminderTime.setHours(hours, minutes, 0, 0);

        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        return {
          date: reminderTime.toISOString().split('T')[0],
          time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
          reminderTime
        };
      }
    }

    // Tomorrow
    if (lowerText.includes('tomorrow')) {
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const reminderTime = new Date(now);
        reminderTime.setDate(reminderTime.getDate() + 1);
        reminderTime.setHours(hours, minutes, 0, 0);

        return {
          date: reminderTime.toISOString().split('T')[0],
          time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
          reminderTime
        };
      }
    }

    // Next week
    if (lowerText.includes('next week')) {
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const reminderTime = new Date(now);
        reminderTime.setDate(reminderTime.getDate() + 7);
        reminderTime.setHours(hours, minutes, 0, 0);

        return {
          date: reminderTime.toISOString().split('T')[0],
          time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
          reminderTime
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing natural date/time:', error);
    return null;
  }
}

/**
 * Validate reminder data
 * @param {Object} reminderData - Reminder data to validate
 * @returns {boolean} - Whether the data is valid
 */
function validateReminderData (reminderData) {
  if (!reminderData || typeof reminderData !== 'object') {
    return false;
  }

  if (!reminderData.message || typeof reminderData.message !== 'string') {
    return false;
  }

  if (!reminderData.reminderTime || !(reminderData.reminderTime instanceof Date)) {
    return false;
  }

  if (isNaN(reminderData.reminderTime.getTime())) {
    return false;
  }

  const now = new Date();
  if (reminderData.reminderTime <= now) {
    return false;
  }

  return true;
}

/**
 * Format reminder time for display
 * @param {Date} reminderTime - Reminder time
 * @returns {string} - Formatted time string
 */
function formatReminderTime (reminderTime) {
  try {
    const now = new Date();
    const diffMs = reminderTime - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
    return 'now';
  } catch (error) {
    console.error('Error formatting reminder time:', error);
    return 'unknown time';
  }
}

module.exports = {
  parseReminderCommand,
  parseNaturalDateTime,
  validateReminderData,
  formatReminderTime
};
