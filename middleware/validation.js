const Joi = require('joi');
const { validationResult } = require('express-validator');
// const { logger } = require('../services/loggerService');

// Joi schemas for validation
const reminderSchema = Joi.object({
  userId: Joi.string().required().min(1).max(255),
  message: Joi.string().required().min(1).max(1000),
  reminderTime: Joi.date().greater('now').required(),
  status: Joi.string().valid('pending', 'sent', 'cancelled').default('pending')
});

const lineEventSchema = Joi.object({
  events: Joi.array().items(
    Joi.object({
      type: Joi.string().required(),
      source: Joi.object({
        userId: Joi.string().required()
      }).required(),
      message: Joi.object({
        type: Joi.string().required(),
        text: Joi.string().when('type', {
          is: 'text',
          then: Joi.required(),
          otherwise: Joi.optional()
        })
      }).optional()
    })
  ).required()
});

// Express-validator rules
const reminderValidationRules = [
  require('express-validator').body('userId').isString().isLength({ min: 1, max: 255 }),
  require('express-validator').body('message').isString().isLength({ min: 1, max: 1000 }),
  require('express-validator').body('reminderTime').isISO8601().custom((value) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Reminder time must be in the future');
    }
    return true;
  }),
  require('express-validator').body('status').optional().isIn(['pending', 'sent', 'cancelled'])
];

const lineWebhookValidationRules = [
  require('express-validator').body('events').isArray({ min: 1 }),
  require('express-validator').body('events.*.type').isString(),
  require('express-validator').body('events.*.source.userId').isString(),
  require('express-validator').body('events.*.message.type').optional().isString(),
  require('express-validator').body('events.*.message.text').optional().isString()
];

// Generic validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      // logger.warn({
      //   message: 'Validation failed',
      //   errors,
      //   url: req.url,
      //   method: req.method
      // });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

// Express-validator middleware
const validateExpressValidator = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    // logger.warn({
    //   message: 'Validation failed',
    //   errors: errorDetails,
    //   url: req.url,
    //   method: req.method
    // });

    return res.status(400).json({
      error: 'Validation failed',
      details: errorDetails
    });
  }

  next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

// Rate limiting validation
const validateRateLimit = (req, res, next) => {
  const { rateLimit } = req;

  if (rateLimit && rateLimit.remaining === 0) {
    // logger.warn({
    //   message: 'Rate limit exceeded',
    //   ip: req.ip,
    //   url: req.url,
    //   method: req.method
    // });

    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(rateLimit.resetTime / 1000)
    });
  }

  next();
};

// Specific validation middlewares
const validateReminder = validateRequest(reminderSchema);
const validateLineEvent = validateRequest(lineEventSchema);

// Command validation
const validateCommand = (req, res, next) => {
  const { message } = req.body.events?.[0]?.message || {};

  if (!message) {
    return res.status(400).json({
      error: 'Invalid message format'
    });
  }

  // Validate command format
  const validCommands = ['/help', '/add', '/list', '/delete', '/update'];
  const isValidCommand = validCommands.some(cmd => message.startsWith(cmd));

  if (!isValidCommand) {
    // logger.warn({
    //   message: 'Invalid command received',
    //   command: message,
    //   userId: req.body.events?.[0]?.source?.userId
    // });

    return res.status(400).json({
      error: 'Invalid command'
    });
  }

  next();
};

// Date validation helper
const validateDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date > new Date();
};

// Time validation helper
const validateTime = (timeString) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

module.exports = {
  validateReminder,
  validateLineEvent,
  validateCommand,
  reminderValidationRules,
  lineWebhookValidationRules,
  validateExpressValidator,
  sanitizeInput,
  validateRateLimit,
  validateDate,
  validateTime
};
