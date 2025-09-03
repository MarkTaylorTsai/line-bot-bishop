const rateLimit = require('express-rate-limit');
const { logger } = require('../services/loggerService');

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - General',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiter for LINE webhook
const lineWebhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: {
    error: 'Too many LINE webhook requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - LINE Webhook',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many LINE webhook requests, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

// Rate limiter for reminder endpoint
const reminderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per 5 minutes
  message: {
    error: 'Too many reminder requests, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - Reminder Endpoint',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many reminder requests, please try again later.',
      retryAfter: '5 minutes'
    });
  }
});

// Rate limiter for health check endpoint
const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    error: 'Too many health check requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - Health Check',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many health check requests, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

// User-specific rate limiter (for LINE users)
const userSpecificLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each user to 20 requests per minute
  keyGenerator: (req) => {
    // Use LINE user ID if available, otherwise fall back to IP
    const userId = req.body?.events?.[0]?.source?.userId || req.ip;
    return userId;
  },
  message: {
    error: 'Too many requests from this user, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const userId = req.body?.events?.[0]?.source?.userId || req.ip;

    logger.warn({
      message: 'Rate limit exceeded - User Specific',
      userId,
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests from this user, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

// Burst rate limiter for short periods
const burstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Limit each IP to 5 requests per 10 seconds
  message: {
    error: 'Too many requests in a short time, please slow down.',
    retryAfter: '10 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - Burst',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests in a short time, please slow down.',
      retryAfter: '10 seconds'
    });
  }
});

// Rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per 15 minutes
  message: {
    error: 'API rate limit exceeded, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - API',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'API rate limit exceeded, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded - Authentication',
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

module.exports = {
  generalLimiter,
  lineWebhookLimiter,
  reminderLimiter,
  healthCheckLimiter,
  userSpecificLimiter,
  burstLimiter,
  apiLimiter,
  authLimiter
};
