require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
const moment = require('moment');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE Bot configuration
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

// Bishop configuration - who receives the reminders
const BISHOP_LINE_USER_ID = process.env.BISHOP_LINE_USER_ID;

// Interview management functions
class InterviewManager {
  // Get interviews needing reminders
  static async getInterviewsNeedingReminders() {
    try {
      const now = moment();
      const tomorrow = moment().add(1, 'day');
      const threeHoursFromNow = moment().add(3, 'hours');

      // Get interviews tomorrow (24h reminders)
      const { data: interviews24h, error: error24h } = await supabase
        .from('interviews')
        .select('*')
        .gte('interview_date', tomorrow.format('YYYY-MM-DD'))
        .lt('interview_date', tomorrow.add(1, 'day').format('YYYY-MM-DD'))
        .is('reminder_24h_sent', null);

      if (error24h) throw error24h;

      // Get interviews in next 3 hours (3h reminders)
      const { data: interviews3h, error: error3h } = await supabase
        .from('interviews')
        .select('*')
        .gte('interview_date', now.format('YYYY-MM-DD'))
        .lt('interview_date', tomorrow.format('YYYY-MM-DD'))
        .is('reminder_3h_sent', null);

      if (error3h) throw error3h;

      // Filter interviews that are actually within the time windows
      const filtered24h = interviews24h.filter(interview => {
        const interviewDateTime = moment(`${interview.interview_date} ${interview.interview_time}`, 'YYYY-MM-DD HH:mm:ss');
        const diffHours = interviewDateTime.diff(now, 'hours', true);
        return diffHours >= 20 && diffHours <= 28; // 20-28 hours before
      });

      const filtered3h = interviews3h.filter(interview => {
        const interviewDateTime = moment(`${interview.interview_date} ${interview.interview_time}`, 'YYYY-MM-DD HH:mm:ss');
        const diffHours = interviewDateTime.diff(now, 'hours', true);
        return diffHours >= 2.5 && diffHours <= 3.5; // 2.5-3.5 hours before
      });

      return {
        success: true,
        data: {
          interviews24h: filtered24h,
          interviews3h: filtered3h
        }
      };
    } catch (error) {
      console.error('Error getting interviews needing reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark reminder as sent
  static async markReminderSent(interviewId, reminderType) {
    try {
      const updateData = reminderType === '24h' 
        ? { reminder_24h_sent: new Date().toISOString() }
        : { reminder_3h_sent: new Date().toISOString() };

      const { error } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking reminder sent:', error);
      return { success: false, error: error.message };
    }
  }
}

// Reminder notification functions
class ReminderManager {
  // Send reminder message
  static async sendReminderMessage(interview, reminderType) {
    try {
      // Use bishop's LINE user ID for reminders
      const targetUserId = BISHOP_LINE_USER_ID || interview.user_id;
      
      if (!targetUserId) {
        console.error('No bishop user ID configured for reminders');
        return { success: false, error: 'No bishop user ID configured' };
      }

      const date = moment(interview.interview_date).format('YYYY-MM-DD');
      const time = interview.interview_time ? interview.interview_time.substring(0, 5) : interview.interview_time;
      const hoursText = reminderType === '24h' ? '24小時' : '3小時';
      
      const message = `🔔 面談提醒通知

您有一個面談即將在${hoursText}後舉行：

👤 面試者：${interview.interviewee_name}
📅 日期：${date}
⏰ 時間：${time}
📝 理由：${interview.reason || '無'}

請做好準備！`;

      await client.pushMessage(targetUserId, {
        type: 'text',
        text: message
      });

      console.log(`📨 Sent ${reminderType} reminder to bishop for interview ${interview.id}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending reminder message:', error);
      return { success: false, error: error.message };
    }
  }

  // Process reminders
  static async processReminders() {
    try {
      console.log('🕐 Processing reminders...');
      
      const result = await InterviewManager.getInterviewsNeedingReminders();
      
      if (!result.success) {
        console.error('Failed to get interviews needing reminders:', result.error);
        return { success: false, error: result.error };
      }

      const { interviews24h, interviews3h } = result.data;
      let totalSent = 0;
      let errors = [];

      console.log(`📋 Found ${interviews24h.length} interviews needing 24h reminders`);
      console.log(`📋 Found ${interviews3h.length} interviews needing 3h reminders`);

      // Process 24-hour reminders
      for (const interview of interviews24h) {
        try {
          const reminderResult = await this.sendReminderMessage(interview, '24h');
          if (reminderResult.success) {
            await InterviewManager.markReminderSent(interview.id, '24h');
            totalSent++;
            console.log(`✅ Sent 24h reminder for interview ${interview.id}`);
          } else {
            console.error(`❌ Failed to send 24h reminder for interview ${interview.id}:`, reminderResult.error);
            errors.push(`24h reminder for interview ${interview.id}: ${reminderResult.error}`);
          }
        } catch (error) {
          console.error(`❌ Error processing 24h reminder for interview ${interview.id}:`, error);
          errors.push(`24h reminder for interview ${interview.id}: ${error.message}`);
        }
      }

      // Process 3-hour reminders
      for (const interview of interviews3h) {
        try {
          const reminderResult = await this.sendReminderMessage(interview, '3h');
          if (reminderResult.success) {
            await InterviewManager.markReminderSent(interview.id, '3h');
            totalSent++;
            console.log(`✅ Sent 3h reminder for interview ${interview.id}`);
          } else {
            console.error(`❌ Failed to send 3h reminder for interview ${interview.id}:`, reminderResult.error);
            errors.push(`3h reminder for interview ${interview.id}: ${reminderResult.error}`);
          }
        } catch (error) {
          console.error(`❌ Error processing 3h reminder for interview ${interview.id}:`, error);
          errors.push(`3h reminder for interview ${interview.id}: ${error.message}`);
        }
      }

      if (totalSent > 0) {
        console.log(`📨 Total reminders sent: ${totalSent}`);
      } else {
        console.log('📭 No reminders to send');
      }

      return {
        success: true,
        totalSent,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error processing reminders:', error);
      return { success: false, error: error.message };
    }
  }
}

// Vercel serverless function handler
module.exports = async function handler(req, res) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedApiKey = process.env.CRON_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🕐 Processing reminders via Vercel serverless function...');
    const result = await ReminderManager.processReminders();

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Reminders processed successfully',
        totalSent: result.totalSent,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error in serverless function:', err);
    res.status(500).json({ error: err.message });
  }
}
