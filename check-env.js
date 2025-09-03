require('dotenv').config();

console.log('🔍 Environment Variables Check\n');

// Required environment variables
const requiredVars = [
  'CHANNEL_SECRET',
  'CHANNEL_ACCESS_TOKEN', 
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'AUTHORIZED_USERS'
];

// Optional environment variables
const optionalVars = [
  'NODE_ENV',
  'PORT',
  'ALLOWED_ORIGINS',
  'API_KEY'
];

console.log('📋 Required Variables:');
let allRequiredPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    // Mask sensitive values
    const displayValue = varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('KEY') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allRequiredPresent = false;
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (using defaults)`);
  }
});

console.log('\n🔧 Environment Configuration:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`PORT: ${process.env.PORT || '3000'}`);

// Test service imports
console.log('\n🧪 Testing Service Imports:');
try {
  const { logger } = require('./services/loggerService');
  console.log('✅ Logger service: OK');
} catch (error) {
  console.log('❌ Logger service: FAILED -', error.message);
}

try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('✅ Supabase client: OK');
  } else {
    console.log('⚠️  Supabase client: SKIPPED (missing credentials)');
  }
} catch (error) {
  console.log('❌ Supabase client: FAILED -', error.message);
}

try {
  const line = require('@line/bot-sdk');
  if (process.env.CHANNEL_ACCESS_TOKEN && process.env.CHANNEL_SECRET) {
    const config = {
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.CHANNEL_SECRET
    };
    const client = new line.Client(config);
    console.log('✅ LINE client: OK');
  } else {
    console.log('⚠️  LINE client: SKIPPED (missing credentials)');
  }
} catch (error) {
  console.log('❌ LINE client: FAILED -', error.message);
}

// Summary
console.log('\n📊 Summary:');
if (allRequiredPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('🚀 Your application should work correctly.');
} else {
  console.log('❌ Some required environment variables are missing!');
  console.log('⚠️  Please check your .env file and ensure all required variables are set.');
}

console.log('\n💡 Tips:');
console.log('- Make sure your .env file is in the root directory');
console.log('- For Vercel deployment, set environment variables in Vercel dashboard');
console.log('- Never commit .env files to version control');
