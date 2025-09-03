const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
  }
} else {
  console.warn('Supabase configuration is missing or using placeholder values. Database operations will be mocked.');
}

/**
 * Create a new reminder
 * @param {Object} reminderData - Reminder data
 * @param {string} reminderData.userId - LINE user ID
 * @param {string} reminderData.message - Reminder message
 * @param {Date} reminderData.reminderTime - When to send the reminder
 * @param {string} reminderData.status - Reminder status (pending, sent, cancelled)
 * @returns {Promise<Object>} - Created reminder
 */
async function createReminder (reminderData) {
  try {
    if (!supabase) {
      // Mock response for testing
      const mockReminder = {
        id: Date.now(),
        user_id: reminderData.userId,
        message: reminderData.message,
        reminder_time: reminderData.reminderTime.toISOString(),
        status: reminderData.status || 'pending',
        created_at: new Date().toISOString()
      };
      console.log('Mock reminder created:', mockReminder);
      return mockReminder;
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert([
        {
          user_id: reminderData.userId,
          message: reminderData.message,
          reminder_time: reminderData.reminderTime.toISOString(),
          status: reminderData.status || 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }

    console.log('Reminder created:', data);
    return data;
  } catch (error) {
    console.error('Error in createReminder:', error);
    throw error;
  }
}

/**
 * Get all reminders for a user
 * @param {string} userId - LINE user ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} - Array of reminders
 */
async function getReminders (userId, status = null) {
  try {
    if (!supabase) {
      // Mock response for testing
      console.log(`Mock: Found 0 reminders for user ${userId}`);
      return [];
    }

    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }

    console.log(`Found ${data.length} reminders for user ${userId}`);
    return data || [];
  } catch (error) {
    console.error('Error in getReminders:', error);
    throw error;
  }
}

/**
 * Get due reminders (reminders that should be sent now)
 * @returns {Promise<Array>} - Array of due reminders
 */
async function getDueReminders () {
  try {
    if (!supabase) {
      // Mock response for testing
      console.log('Mock: Found 0 due reminders');
      return [];
    }

    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('reminder_time', now)
      .order('reminder_time', { ascending: true });

    if (error) {
      console.error('Error fetching due reminders:', error);
      throw error;
    }

    console.log(`Found ${data.length} due reminders`);
    return data || [];
  } catch (error) {
    console.error('Error in getDueReminders:', error);
    throw error;
  }
}

/**
 * Update a reminder
 * @param {number} reminderId - Reminder ID
 * @param {string} userId - LINE user ID (for authorization)
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated reminder
 */
async function updateReminder (reminderId, userId, updateData) {
  try {
    // First check if the reminder belongs to the user
    const { data: existingReminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingReminder) {
      console.error('Reminder not found or unauthorized:', fetchError);
      return null;
    }

    // Update the reminder
    const { data, error } = await supabase
      .from('reminders')
      .update({
        message: updateData.message,
        reminder_time: updateData.reminderTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }

    console.log('Reminder updated:', data);
    return data;
  } catch (error) {
    console.error('Error in updateReminder:', error);
    throw error;
  }
}

/**
 * Delete a reminder
 * @param {number} reminderId - Reminder ID
 * @param {string} userId - LINE user ID (for authorization)
 * @returns {Promise<boolean>} - Whether deletion was successful
 */
async function deleteReminder (reminderId, userId) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }

    console.log('Reminder deleted:', data);
    return true;
  } catch (error) {
    console.error('Error in deleteReminder:', error);
    return false;
  }
}

/**
 * Mark a reminder as sent
 * @param {number} reminderId - Reminder ID
 * @returns {Promise<Object>} - Updated reminder
 */
async function markReminderAsSent (reminderId) {
  try {
    if (!supabase) {
      // Mock response for testing
      console.log(`Mock: Reminder ${reminderId} marked as sent`);
      return { id: reminderId, status: 'sent' };
    }

    const { data, error } = await supabase
      .from('reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) {
      console.error('Error marking reminder as sent:', error);
      throw error;
    }

    console.log('Reminder marked as sent:', data);
    return data;
  } catch (error) {
    console.error('Error in markReminderAsSent:', error);
    throw error;
  }
}

/**
 * Get reminder statistics
 * @param {string} userId - LINE user ID
 * @returns {Promise<Object>} - Statistics object
 */
async function getReminderStats (userId) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('status')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching reminder stats:', error);
      throw error;
    }

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      sent: data.filter(r => r.status === 'sent').length,
      cancelled: data.filter(r => r.status === 'cancelled').length
    };

    console.log(`Stats for user ${userId}:`, stats);
    return stats;
  } catch (error) {
    console.error('Error in getReminderStats:', error);
    throw error;
  }
}

/**
 * Initialize database tables (for development)
 * @returns {Promise<void>}
 */
async function initializeDatabase () {
  try {
    // Create reminders table if it doesn't exist
    const { error } = await supabase.rpc('create_reminders_table_if_not_exists');

    if (error) {
      console.log('Table creation error (might already exist):', error.message);
    } else {
      console.log('Database initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  createReminder,
  getReminders,
  getDueReminders,
  updateReminder,
  deleteReminder,
  markReminderAsSent,
  getReminderStats,
  initializeDatabase,
  supabase
};
