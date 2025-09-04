require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');

// Import middleware
const { generalLimiter, healthCheckLimiter } = require('./middleware/rateLimit');
const { sanitizeInput } = require('./middleware/validation');

// Import routes
const lineRoutes = require('./routes/line');
const reminderRoutes = require('./routes/reminders');

// Import services
const { sendDueReminders } = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Line-Signature', 'X-API-Key']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware with limits
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb'
}));



// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint with specific rate limiting
app.get('/health', healthCheckLimiter, (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      message: 'LINE Bot is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      database: 'connected' // You can add actual DB health check here
    };



    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      activeConnections: 0, // You can implement connection tracking
      requestsPerMinute: 0, // You can implement request counting
      errorsPerMinute: 0 // You can implement error counting
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Routes
app.use('/callback', lineRoutes);
app.use('/send-reminders', reminderRoutes);

if (process.env.NODE_ENV !== 'production') {
  // Only run cron locally for testing
  const cron = require('node-cron');

  cron.schedule('*/10 * * * *', async () => {
    try {
      const result = await sendDueReminders();
    } catch (error) {
      // Error handling
    }
  });
}

// 404 handler
app.use('*', (req, res) => {

  res.status(404).json({
    error: 'Endpoint not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(500).json(errorResponse);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  // Stop accepting new requests
  server.close(() => {
    // Close database connections if needed
    // await closeDatabaseConnections();

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    process.exit(1);
  }, 30000);
};

// Start server
let server;
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    // Server started successfully
  });
} else if (process.env.NODE_ENV === 'production') {
  // For production (Vercel), we don't start the server manually
} else {
  // For test environment, don't start server
}

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

module.exports = app;
