// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set default test environment variables if not present
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CHANNEL_SECRET = process.env.CHANNEL_SECRET || 'test_channel_secret_1234567890';
process.env.CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || 'test_channel_access_token_1234567890';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test_supabase_key_1234567890';
process.env.AUTHORIZED_USERS = process.env.AUTHORIZED_USERS || 'U1234567890abcdef,U0987654321fedcba';
process.env.PORT = process.env.PORT || '3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(10000);
