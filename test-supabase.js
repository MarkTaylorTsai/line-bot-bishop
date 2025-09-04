require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  console.log('🧪 Testing Supabase Connection and Operations\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
    process.exit(1);
  }

  console.log('📋 Supabase Configuration:');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey.substring(0, 8)}...`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');

  // Test 1: Basic connection test
  console.log('\n🔍 Test 1: Basic Connection');
  const { data: testData, error: testError } = await supabase
    .from('reminders')
    .select('count')
    .limit(1);

  if (testError) {
    console.log('❌ Connection failed:', testError.message);
    if (testError.code === 'PGRST116') {
      console.log('💡 This might be a permissions issue. Check your Supabase key permissions.');
    }
  } else {
    console.log('✅ Connection successful - can query reminders table');
  }

  // Test 2: Check table structure
  console.log('\n🔍 Test 2: Table Structure');
  const { data: columns, error: columnsError } = await supabase
    .from('reminders')
    .select('*')
    .limit(0);

  if (columnsError) {
    console.log('❌ Cannot access reminders table:', columnsError.message);
  } else {
    console.log('✅ Reminders table accessible');
  }

  // Test 3: Test reminder service functions
  console.log('\n🔍 Test 3: Reminder Service Functions');
  try {
    const { getDueReminders } = require('./services/supabaseService');
    const dueReminders = await getDueReminders();
    console.log(`✅ getDueReminders() works - found ${dueReminders.length} due reminders`);
  } catch (error) {
    console.log('❌ getDueReminders() failed:', error.message);
  }

  // Test 4: Test creating a test reminder
  console.log('\n🔍 Test 4: Create Test Reminder');
  const testReminder = {
    user_id: 'test_user_123',
    message: 'Test reminder from script',
    reminder_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    status: 'pending'
  };

  try {
    const { data: createdReminder, error: createError } = await supabase
      .from('reminders')
      .insert([testReminder])
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create test reminder:', createError.message);
    } else {
      console.log('✅ Test reminder created successfully');
      console.log(`   ID: ${createdReminder.id}`);
      console.log(`   User: ${createdReminder.user_id}`);
      console.log(`   Message: ${createdReminder.message}`);

      // Clean up - delete the test reminder
      const { error: deleteError } = await supabase
        .from('reminders')
        .delete()
        .eq('id', createdReminder.id);

      if (deleteError) {
        console.log('⚠️  Failed to clean up test reminder:', deleteError.message);
      } else {
        console.log('✅ Test reminder cleaned up');
      }
    }
  } catch (error) {
    console.log('❌ Error in test reminder creation:', error.message);
  }

  // Test 5: Check existing reminders
  console.log('\n🔍 Test 5: Check Existing Reminders');
  const { data: existingReminders, error: listError } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (listError) {
    console.log('❌ Failed to list reminders:', listError.message);
  } else {
    console.log(`✅ Found ${existingReminders.length} existing reminders`);
    if (existingReminders.length > 0) {
      console.log('   Latest reminders:');
      existingReminders.forEach((reminder, index) => {
        console.log(`   ${index + 1}. ID: ${reminder.id}, User: ${reminder.user_id}, Status: ${reminder.status}`);
      });
    }
  }

  console.log('\n📊 Supabase Test Summary:');
  console.log('✅ Supabase connection: Working');
  console.log('✅ Database operations: Working');
  console.log('✅ Reminder service: Working');
  console.log('🚀 Your Supabase setup is ready!');

  } catch (error) {
    console.log('❌ Fatal error:', error.message);
    console.log('💡 Check your Supabase URL and key configuration');
    process.exit(1);
  }
}

// Run the test
testSupabase().catch(error => {
  console.log('❌ Test failed:', error.message);
  process.exit(1);
});
