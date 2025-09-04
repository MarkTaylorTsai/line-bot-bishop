// Test script to verify logger works in local development environment
require('dotenv').config();

// Set environment variables for testing
process.env.NODE_ENV = 'development';
process.env.VERCEL = '0';

// console.log('Testing logger in local development environment...');
// console.log('VERCEL:', process.env.VERCEL);
// console.log('NODE_ENV:', process.env.NODE_ENV);

// Import logger after setting environment variables
// const { logger } = require('./services/loggerService');

// console.log('Logger created successfully');

// Test basic logging
// logger.info('This is an info message');
// logger.warn('This is a warning message');
// logger.error('This is an error message');

// console.log('All log messages sent successfully');

// Test structured logging
// logger.info({
//   message: 'Structured log test',
//   userId: 'test-user-123',
//   action: 'test-action',
//   timestamp: new Date().toISOString()
// });

// console.log('Structured logging test completed');

// Check logger configuration
// console.log('Logger transports:', logger.transports.length);
// logger.transports.forEach((transport, index) => {
//   console.log(`Transport ${index}:`, transport.constructor.name);
// });

// console.log('Logger test completed successfully!');
