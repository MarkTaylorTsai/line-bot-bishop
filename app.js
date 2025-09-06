require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment-timezone');


const app = express();

// LINE Bot configuration
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Bishop configuration - who receives the reminders
const BISHOP_LINE_USER_ID = process.env.BISHOP_LINE_USER_ID;

const client = new line.Client(lineConfig);

// Middleware
app.use('/callback', line.middleware(lineConfig));
app.use(express.json());

// Interview management functions
class InterviewManager {
  // Add new interview
  static async addInterview(userId, intervieweeName, date, time, reason) {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .insert([
          {
            user_id: userId,
            interviewee_name: intervieweeName,
            interview_date: date,
            interview_time: time,
            reason: reason
          }
        ])
        .select();

      if (error) throw error;

      // Check if this interview needs immediate reminders (edge case handling)
      const interview = data[0];
      const interviewDateTime = moment.tz(`${interview.interview_date} ${interview.interview_time}`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Taipei');
      const now = moment.tz('Asia/Taipei');
      const diffHours = interviewDateTime.diff(now, 'hours', true);

      // If interview is less than 3 hours away, mark 24h reminder as sent
      if (diffHours < 3) {
        await this.markReminderSent(interview.id, '24h');
        console.log(`⚠️ Interview ${interview.id} added less than 3 hours before start - 24h reminder skipped`);
      }

      // If interview is less than 1 hour away, mark 3h reminder as sent
      if (diffHours < 1) {
        await this.markReminderSent(interview.id, '3h');
        console.log(`⚠️ Interview ${interview.id} added less than 1 hour before start - 3h reminder skipped`);
      }

      return { success: true, data: interview };
    } catch (error) {
      console.error('Error adding interview:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all interviews for a user
  static async getInterviews(userId) {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('interview_date', { ascending: true })
        .order('interview_time', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting interviews:', error);
      return { success: false, error: error.message };
    }
  }

  // Update interview
  static async updateInterview(userId, interviewId, updates) {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', interviewId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error updating interview:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete interview
  static async deleteInterview(userId, interviewId) {
    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting interview:', error);
      return { success: false, error: error.message };
    }
  }

  // Get interviews that need reminders
  static async getInterviewsNeedingReminders() {
    try {
      const now = moment.tz('Asia/Taipei');
      
      // Get all interviews that haven't sent reminders yet
      const { data: allInterviews, error } = await supabase
        .from('interviews')
        .select('*')
        .or('reminder_24h_sent.eq.false,reminder_3h_sent.eq.false')
        .gte('interview_date', now.format('YYYY-MM-DD'));

      if (error) throw error;

      // Diagnostic log: Did Supabase return interviews?
      console.log('Fetched interviews:', allInterviews ? allInterviews.length : 0);

      const interviews24h = [];
      const interviews3h = [];

      // Process each interview to check exact timing
      for (const interview of allInterviews || []) {
        const interviewDateTime = moment.tz(`${interview.interview_date} ${interview.interview_time}`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Taipei');
        const diffHours = interviewDateTime.diff(now, 'hours', true);

        // Check for 24-hour reminder (between 23.5 and 24.5 hours before)
        if (!interview.reminder_24h_sent && diffHours >= 23.5 && diffHours <= 24.5) {
          interviews24h.push(interview);
        }

        // Check for 3-hour reminder (between 2.5 and 3.5 hours before)
        if (!interview.reminder_3h_sent && diffHours >= 2.5 && diffHours <= 3.5) {
          interviews3h.push(interview);
        }
      }

      // Diagnostic log: Did any match the 24h condition?
      console.log('24h matches:', interviews24h.length, '3h matches:', interviews3h.length);

      return {
        success: true,
        data: {
          interviews24h,
          interviews3h
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
      const updateData = {};
      if (reminderType === '24h') {
        updateData.reminder_24h_sent = true;
      } else if (reminderType === '3h') {
        updateData.reminder_3h_sent = true;
      }

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

// Field mapping for Chinese field names to database columns
const fieldMap = {
  '姓名': 'interviewee_name',
  '日期': 'interview_date',
  '時間': 'interview_time',
  '理由': 'reason'
};

// Message parsing functions
class MessageParser {
  // Parse "加入" command
  static parseAddCommand(text) {
    // Allow both : and ： (full-width colon)
    const regex = /加入\s+([^\s]+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}[:：]\d{2})\s+(.+)/;
    const match = text.match(regex);
    
    if (!match) return null;
    
    // Normalize full-width colon to standard colon
    const time = match[3].replace('：', ':');
    
    return {
      intervieweeName: match[1],
      date: match[2],
      time: time + ':00', // Add seconds for proper TIME format
      reason: match[4]
    };
  }

  // Parse update command (format: 更新 {id} {field} {value})
  static parseUpdateCommand(text) {
    const regex = /更新\s+(\d+)\s+([^\s]+)\s+(.+)/;
    const match = text.match(regex);
    
    if (!match) return null;
    
    return {
      id: parseInt(match[1]),
      field: match[2],
      value: match[3]
    };
  }

  // Parse delete command (format: 刪除 {id})
  static parseDeleteCommand(text) {
    const regex = /刪除\s+(\d+)/;
    const match = text.match(regex);
    
    if (!match) return null;
    
    return {
      id: parseInt(match[1])
    };
  }
}

// Message handling
async function handleMessage(event) {
  const { text } = event.message;
  const userId = event.source.userId;

  try {
    // Handle different commands
    if (text === '面談清單') {
      await handleListCommand(userId, event.replyToken);
    } else if (text.startsWith('加入')) {
      await handleAddCommand(text, userId, event.replyToken);
    } else if (text.startsWith('更新')) {
      await handleUpdateCommand(text, userId, event.replyToken);
    } else if (text.startsWith('刪除')) {
      await handleDeleteCommand(text, userId, event.replyToken);
    } else if (text === '提醒狀態') {
      await handleReminderStatusCommand(userId, event.replyToken);
    } else {
      await sendHelpMessage(event.replyToken);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，處理您的訊息時發生錯誤。請稍後再試。'
    });
  }
}

// Command handlers
async function handleListCommand(userId, replyToken) {
  const result = await InterviewManager.getInterviews(userId);
  
  if (!result.success) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '獲取面談清單時發生錯誤。'
    });
    return;
  }

  if (result.data.length === 0) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '目前沒有安排的面談。'
    });
    return;
  }

  let message = '📋 面談清單：\n\n';
  result.data.forEach((interview, index) => {
    const date = moment.tz(interview.interview_date, 'Asia/Taipei').format('YYYY-MM-DD');
    // Format time to show only HH:mm for display
    const time = interview.interview_time ? interview.interview_time.substring(0, 5) : interview.interview_time;
    message += `${index + 1}. ID: ${interview.id}\n`;
    message += `   姓名: ${interview.interviewee_name}\n`;
    message += `   日期: ${date}\n`;
    message += `   時間: ${time}\n`;
    message += `   理由: ${interview.reason || '無'}\n\n`;
  });

  await client.replyMessage(replyToken, {
    type: 'text',
    text: message
  });
}

async function handleAddCommand(text, userId, replyToken) {
  const parsed = MessageParser.parseAddCommand(text);
  
  if (!parsed) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '格式錯誤！請使用：加入 {人名} {日期} {時間} {理由}\n例如：加入 張三 2024-01-15 14:30 技術面試'
    });
    return;
  }

  // Validate date format
  if (!moment.tz(parsed.date, 'YYYY-MM-DD', true, 'Asia/Taipei').isValid()) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '日期格式錯誤！請使用 YYYY-MM-DD 格式。'
    });
    return;
  }

  // Validate time format (parsed.time already includes :00 seconds)
  if (!moment.tz(parsed.time, 'HH:mm:ss', true, 'Asia/Taipei').isValid()) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '時間格式錯誤！請使用 HH:mm 格式。'
    });
    return;
  }

  const result = await InterviewManager.addInterview(
    userId,
    parsed.intervieweeName,
    parsed.date,
    parsed.time,
    parsed.reason
  );

  if (result.success) {
    // Format time to show only HH:mm for display
    const displayTime = parsed.time.substring(0, 5);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '✅ 面談已成功加入！\n\n姓名: ' + parsed.intervieweeName + '\n日期: ' + parsed.date + '\n時間: ' + displayTime + '\n理由: ' + parsed.reason + '\n\nID: ' + result.data.id
    });
  } else {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '加入面談時發生錯誤。'
    });
  }
}

async function handleUpdateCommand(text, userId, replyToken) {
  const parsed = MessageParser.parseUpdateCommand(text);
  
  if (!parsed) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '格式錯誤！請使用：更新 {ID} {欄位} {新值}\n例如：更新 1 姓名 李四'
    });
    return;
  }

  // Map Chinese field name to database column
  const dbField = fieldMap[parsed.field];
  if (!dbField) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '無效的欄位！可用欄位：姓名、日期、時間、理由'
    });
    return;
  }

  const updates = {};
  let valueToStore = parsed.value;

  // Handle time formatting for database storage
  if (dbField === 'interview_time') {
    // Replace full-width colon with standard colon
    valueToStore = parsed.value.replace('：', ':');
    // Add seconds if not provided
    if (valueToStore.match(/^\d{2}:\d{2}$/)) {
      valueToStore += ':00';
    }
  }

  updates[dbField] = valueToStore;

  // Validate date/time if updating those fields
  if (dbField === 'interview_date' && !moment.tz(parsed.value, 'YYYY-MM-DD', true, 'Asia/Taipei').isValid()) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '日期格式錯誤！請使用 YYYY-MM-DD 格式。'
    });
    return;
  }

  if (dbField === 'interview_time' && 
      !moment.tz(valueToStore, ['HH:mm', 'HH:mm:ss'], true, 'Asia/Taipei').isValid()) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '時間格式錯誤！請使用 HH:mm 格式。'
    });
    return;
  }

  const result = await InterviewManager.updateInterview(userId, parsed.id, updates);

  if (result.success) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '✅ 面談已成功更新！\n\nID: ' + parsed.id + '\n' + parsed.field + ': ' + parsed.value
    });
  } else {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '更新面談時發生錯誤。請確認 ID 是否正確。'
    });
  }
}

async function handleDeleteCommand(text, userId, replyToken) {
  const parsed = MessageParser.parseDeleteCommand(text);
  
  if (!parsed) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '格式錯誤！請使用：刪除 {ID}\n例如：刪除 1'
    });
    return;
  }

  const result = await InterviewManager.deleteInterview(userId, parsed.id);

  if (result.success) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '✅ 面談 ID ' + parsed.id + ' 已成功刪除！'
    });
  } else {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '刪除面談時發生錯誤。請確認 ID 是否正確。'
    });
  }
}

async function handleReminderStatusCommand(userId, replyToken) {
  const result = await InterviewManager.getInterviews(userId);
  
  if (!result.success) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '獲取面談清單時發生錯誤。'
    });
    return;
  }

  if (result.data.length === 0) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '目前沒有安排的面談。'
    });
    return;
  }

  let message = '📋 面談提醒狀態：\n\n';
  result.data.forEach((interview, index) => {
    const date = moment.tz(interview.interview_date, 'Asia/Taipei').format('YYYY-MM-DD');
    const time = interview.interview_time ? interview.interview_time.substring(0, 5) : interview.interview_time;
    const interviewDateTime = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', 'Asia/Taipei');
    const now = moment.tz('Asia/Taipei');
    const hoursUntil = interviewDateTime.diff(now, 'hours', true);
    
    message += `${index + 1}. ID: ${interview.id}\n`;
    message += '   姓名: ' + interview.interviewee_name + '\n';
    message += '   日期: ' + date + '\n';
    message += '   時間: ' + time + '\n';
    message += '   理由: ' + (interview.reason || '無') + '\n';
    message += '   24小時提醒: ' + (interview.reminder_24h_sent ? '✅ 已發送' : '❌ 未發送') + '\n';
    message += '   3小時提醒: ' + (interview.reminder_3h_sent ? '✅ 已發送' : '❌ 未發送') + '\n';
    message += '   距離現在: ' + (hoursUntil > 0 ? hoursUntil.toFixed(1) + '小時' : '已過期') + '\n\n';
  });

  await client.replyMessage(replyToken, {
    type: 'text',
    text: message
  });
}

async function sendHelpMessage(replyToken) {
  const helpText = '主教團助理使用說明：\n\n📝 加入面談：\n加入 {人名} {日期} {時間} {理由}\n例如：加入 約翰 2024-01-15 14:30 聖殿推薦書面談\n\n📋 查看清單：\n面談清單\n\n✏️ 更新面談：\n更新 {ID} {欄位} {新值}\n例如：更新 1 姓名 彼得\n可用欄位：姓名、日期、時間、理由\n\n🗑️ 刪除面談：\n刪除 {ID}\n例如：刪除 1\n\n📋 查看提醒狀態：\n提醒狀態\n\n💡 注意事項：\n- 日期格式：YYYY-MM-DD\n- 時間格式：HH:mm\n- ID 可在面談清單中查看\n- 系統會自動發送24小時和3小時前的提醒通知';

  await client.replyMessage(replyToken, {
    type: 'text',
    text: helpText
  });
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

      const date = moment.tz(interview.interview_date, 'Asia/Taipei').format('YYYY-MM-DD');
      const time = interview.interview_time ? interview.interview_time.substring(0, 5) : interview.interview_time;
      const hoursText = reminderType === '24h' ? '24小時' : '3小時';
      
      const message = '🔔 面談提醒通知\n\n您有一個面談即將在' + hoursText + '後舉行：\n\n👤 面試者：' + interview.interviewee_name + '\n📅 日期：' + date + '\n⏰ 時間：' + time + '\n📝 理由：' + (interview.reason || '無') + '\n\n請做好準備！';

      // Diagnostic log: Did LINE pushMessage run?
      console.log('Pushing to user:', targetUserId);
      await client.pushMessage(targetUserId, {
        type: 'text',
        text: message
      }).catch(err => console.error('LINE push failed', err));

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

// Webhook endpoint
app.post('/callback', async (req, res) => {
  const events = req.body.events;

  try {
    await Promise.all(
      events.map(async (event) => {
        if (event.type === 'message' && event.message.type === 'text') {
          await handleMessage(event);
        }
      })
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'LINE Interview Bot is running!' });
});

// Manual reminder trigger endpoint (for external cron service)
// Accepts both GET and POST requests for flexibility
app.all('/trigger-reminders', async (req, res) => {
  try {
    // Verify API key if provided (optional security)
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedApiKey = process.env.CRON_API_KEY;
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.warn('⚠️ Invalid API key provided for reminder trigger');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🕐 Processing reminders via serverless endpoint...');
    const result = await ReminderManager.processReminders();
    
    if (result.success) {
      res.json({ 
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
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ error: 'Failed to process reminders' });
  }
});

// Validate bishop configuration
if (!BISHOP_LINE_USER_ID) {
  console.warn('⚠️ BISHOP_LINE_USER_ID not configured - reminders will be sent to interview creator instead');
} else {
  console.log('✅ Bishop LINE user ID configured for reminders');
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LINE Interview Bot server is running on port ${PORT}`);
});

module.exports = app;
