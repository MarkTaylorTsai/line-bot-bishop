const { getDueReminders, markReminderAsSent } = require('./supabaseService');
const { sendReminderMessage } = require('./lineService');

/**
 * Send all due reminders to users
 * @returns {Promise<Object>} - Result object with count of reminders sent
 */
async function sendDueReminders () {
  try {
    // console.log('Starting to process due reminders...');

    // Get all due reminders from database
    const dueReminders = await getDueReminders();

    if (dueReminders.length === 0) {
      // console.log('No due reminders found');
      return { remindersSent: 0, success: true };
    }

    // console.log(`Found ${dueReminders.length} due reminders to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        // Send the reminder message via LINE
        await sendReminderMessage(reminder.user_id, reminder);

        // Mark the reminder as sent in the database
        await markReminderAsSent(reminder.id);

        successCount++;
        // console.log(`✅ Reminder ${reminder.id} sent successfully to user ${reminder.user_id}`);
      } catch (error) {
        errorCount++;
        const errorInfo = {
          reminderId: reminder.id,
          userId: reminder.user_id,
          error: error.message
        };
        errors.push(errorInfo);
        // console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
      }
    }

    const result = {
      remindersSent: successCount,
      totalProcessed: dueReminders.length,
      errors: errorCount,
      errorDetails: errors,
      success: true,
      timestamp: new Date().toISOString()
    };

    // console.log(`Reminder processing completed: ${successCount} sent, ${errorCount} failed`);
    return result;
  } catch (error) {
    // console.error('Error in sendDueReminders:', error);
    throw error;
  }
}

/**
 * Send a specific reminder by ID
 * @param {number} reminderId - Reminder ID
 * @returns {Promise<Object>} - Result object
 */
async function sendSpecificReminder (reminderId) {
  try {
    // console.log(`Attempting to send specific reminder: ${reminderId}`);

    // Get the specific reminder
    const { supabase } = require('./supabaseService');
    const { data: reminder, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .eq('status', 'pending')
      .single();

    if (error || !reminder) {
      throw new Error(`Reminder ${reminderId} not found or already sent`);
    }

    // Send the reminder
    await sendReminderMessage(reminder.user_id, reminder);

    // Mark as sent
    await markReminderAsSent(reminder.id);

    // console.log(`✅ Specific reminder ${reminderId} sent successfully`);

    return {
      success: true,
      reminderId: reminder.id,
      userId: reminder.user_id,
      message: reminder.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // console.error(`Error sending specific reminder ${reminderId}:`, error);
    throw error;
  }
}

/**
 * Send reminders for a specific user
 * @param {string} userId - LINE user ID
 * @returns {Promise<Object>} - Result object
 */
async function sendUserReminders (userId) {
  try {
    // console.log(`Processing reminders for user: ${userId}`);

    // Get due reminders for specific user
    const { supabase } = require('./supabaseService');
    const { data: userReminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('reminder_time', new Date().toISOString())
      .order('reminder_time', { ascending: true });

    if (error) {
      throw error;
    }

    if (userReminders.length === 0) {
      // console.log(`No due reminders found for user ${userId}`);
      return { remindersSent: 0, success: true };
    }

    // console.log(`Found ${userReminders.length} due reminders for user ${userId}`);

    let successCount = 0;
    let errorCount = 0;

    for (const reminder of userReminders) {
      try {
        await sendReminderMessage(reminder.user_id, reminder);
        await markReminderAsSent(reminder.id);
        successCount++;
        // console.log(`✅ User reminder ${reminder.id} sent successfully`);
      } catch (error) {
        errorCount++;
        // console.error(`❌ Failed to send user reminder ${reminder.id}:`, error);
      }
    }

    return {
      remindersSent: successCount,
      totalProcessed: userReminders.length,
      errors: errorCount,
      userId,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // console.error(`Error processing reminders for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get reminder processing statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getReminderStats () {
  try {
    const { supabase } = require('./supabaseService');

    // Get counts for different statuses
    const { data: pendingCount, error: pendingError } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: sentCount, error: sentError } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('status', 'sent');

    const { data: dueCount, error: dueError } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .lte('reminder_time', new Date().toISOString());

    if (pendingError || sentError || dueError) {
      throw new Error('Failed to fetch statistics');
    }

    return {
      pending: pendingCount || 0,
      sent: sentCount || 0,
      due: dueCount || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // console.error('Error getting reminder stats:', error);
    throw error;
  }
}

module.exports = {
  sendDueReminders,
  sendSpecificReminder,
  sendUserReminders,
  getReminderStats
};
