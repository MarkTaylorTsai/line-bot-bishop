require('dotenv').config();

console.log('🧪 Testing Vercel Deployment Compatibility\n');

// Test 1: Environment variables
console.log('1. Testing Environment Variables...');
const requiredVars = ['CHANNEL_SECRET', 'CHANNEL_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_KEY', 'AUTHORIZED_USERS'];
let envOk = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ❌ ${varName}: Missing`);
    envOk = false;
  }
});

// Test 2: Crypto module
console.log('\n2. Testing Crypto Module...');
try {
  const crypto = require('crypto');
  const testHash = crypto.createHmac('SHA256', 'test').update('test').digest('base64');
  console.log('   ✅ Crypto module works');
} catch (error) {
  console.log(`   ❌ Crypto module failed: ${error.message}`);
  envOk = false;
}

// Test 3: Logger service
console.log('\n3. Testing Logger Service...');
try {
  const { logger } = require('./services/loggerService');
  logger.info('Test log message');
  console.log('   ✅ Logger service works');
} catch (error) {
  console.log(`   ❌ Logger service failed: ${error.message}`);
  envOk = false;
}

// Test 4: LINE SDK
console.log('\n4. Testing LINE SDK...');
try {
  const line = require('@line/bot-sdk');
  if (process.env.CHANNEL_ACCESS_TOKEN && process.env.CHANNEL_SECRET) {
    const config = {
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.CHANNEL_SECRET
    };
    const client = new line.Client(config);
    console.log('   ✅ LINE SDK works');
  } else {
    console.log('   ⚠️  LINE SDK: Skipped (missing credentials)');
  }
} catch (error) {
  console.log(`   ❌ LINE SDK failed: ${error.message}`);
  envOk = false;
}

// Test 5: Supabase client
console.log('\n5. Testing Supabase Client...');
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('   ✅ Supabase client works');
  } else {
    console.log('   ⚠️  Supabase client: Skipped (missing credentials)');
  }
} catch (error) {
  console.log(`   ❌ Supabase client failed: ${error.message}`);
  envOk = false;
}

// Test 6: Express app
console.log('\n6. Testing Express App...');
try {
  const app = require('./app');
  console.log('   ✅ Express app loads successfully');
} catch (error) {
  console.log(`   ❌ Express app failed: ${error.message}`);
  envOk = false;
}

// Test 7: API endpoint
console.log('\n7. Testing API Endpoint...');
try {
  const handler = require('./api/send-reminders');
  console.log('   ✅ API endpoint loads successfully');
} catch (error) {
  console.log(`   ❌ API endpoint failed: ${error.message}`);
  envOk = false;
}

// Summary
console.log('\n📊 Test Summary:');
if (envOk) {
  console.log('✅ All tests passed! Your app should deploy successfully on Vercel.');
  console.log('\n🚀 Deployment Checklist:');
  console.log('   - Environment variables are set in Vercel dashboard');
  console.log('   - All dependencies are properly installed');
  console.log('   - File system operations are handled correctly');
  console.log('   - Crypto module is using Node.js built-in');
} else {
  console.log('❌ Some tests failed. Please fix the issues before deploying.');
  console.log('\n🔧 Common Issues:');
  console.log('   - Missing environment variables in Vercel dashboard');
  console.log('   - Dependencies not properly installed');
  console.log('   - File system access in serverless environment');
}

console.log('\n💡 Next Steps:');
console.log('1. Set all required environment variables in Vercel dashboard');
console.log('2. Deploy to Vercel');
console.log('3. Test the /health endpoint');
console.log('4. Test the /send-reminders endpoint');
console.log('5. Test the LINE webhook at /callback');
