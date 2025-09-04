require('dotenv').config();

// console.log('🔍 Environment Variables Check\n');

// Required environment variables
const requiredVars = [
  'CHANNEL_ACCESS_TOKEN',
  'CHANNEL_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

// Optional environment variables
const optionalVars = [
  'NODE_ENV',
  'PORT',
  'VERCEL',
  'VERCEL_URL',
  'VERCEL_ENV',
  'API_KEY',
  'AUTHORIZED_USERS',
  'ALLOWED_ORIGINS'
];

// Check required variables
let missingRequired = 0;

// console.log('📋 Required Variables:');
for (const varName of requiredVars) {
  const value = process.env[varName];
  const displayValue = value ? (varName.includes('SECRET') || varName.includes('KEY') ? '***HIDDEN***' : value) : 'MISSING';
  
  if (value) {
    // console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    missingRequired++;
    // console.log(`❌ ${varName}: MISSING`);
  }
}

// Check optional variables
// console.log('\n📋 Optional Variables:');
for (const varName of optionalVars) {
  const value = process.env[varName];
  if (value) {
    // console.log(`✅ ${varName}: ${value}`);
  } else {
    // console.log(`⚠️  ${varName}: Not set (using defaults)`);
  }
}

// Environment configuration
// console.log('\n🔧 Environment Configuration:');
// console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
// console.log(`PORT: ${process.env.PORT || '3000'}`);
// console.log(`VERCEL: ${process.env.VERCEL || 'false'}`);

// Test service imports
// console.log('\n🧪 Testing Service Imports:');

// Test logger service
try {
  // const { logger } = require('./services/loggerService');
  // console.log('✅ Logger service: OK');
} catch (error) {
  // console.log('❌ Logger service: FAILED -', error.message);
}

// Test Supabase service
try {
  const { supabase } = require('./services/supabaseService');
  if (supabase) {
    // console.log('✅ Supabase client: OK');
  } else {
    // console.log('⚠️  Supabase client: SKIPPED (missing credentials)');
  }
} catch (error) {
  // console.log('❌ Supabase client: FAILED -', error.message);
}

// Test LINE service
try {
  const { client } = require('./services/lineService');
  if (client) {
    // console.log('✅ LINE client: OK');
  } else {
    // console.log('⚠️  LINE client: SKIPPED (missing credentials)');
  }
} catch (error) {
  // console.log('❌ LINE client: FAILED -', error.message);
}

// Test crypto module
try {
  const crypto = require('crypto');
  crypto.createHmac('SHA256', 'test').update('test').digest('base64');
  // console.log('✅ Crypto module: OK');
} catch (error) {
  // console.log('❌ Crypto module: FAILED -', error.message);
}

// Test file system access
try {
  const fs = require('fs');
  const path = require('path');
  const testFile = path.join(__dirname, 'test-write-access.tmp');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  // console.log('✅ File system access: OK');
} catch (error) {
  // console.log('⚠️  File system access: LIMITED -', error.message);
  // console.log('   This is expected in serverless environments like Vercel');
}

// Summary
// console.log('\n📊 Summary:');
if (missingRequired === 0) {
  // console.log('✅ All required environment variables are set!');
  // console.log('🚀 Your application should work correctly.');
} else {
  // console.log('❌ Some required environment variables are missing!');
  // console.log('⚠️  Please check your .env file and ensure all required variables are set.');
}

// console.log('\n💡 Tips:');
// console.log('- Make sure your .env file is in the root directory');
// console.log('- For Vercel deployment, set environment variables in Vercel dashboard');
// console.log('- Never commit .env files to version control');
// console.log('- In serverless environments, file system access is limited');
// console.log('- Use console logging instead of file logging in production');
