const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Check if we're in a serverless environment
const isServerless = () => {
  return process.env.VERCEL === '1' || 
         process.env.NODE_ENV === 'production' || 
         process.env.AWS_LAMBDA_FUNCTION_NAME ||
         process.env.FUNCTION_TARGET ||
         process.env.K_SERVICE;
};

// Define transports based on environment
const getTransports = () => {
  const transports = [
    // Console transport (always available)
    new winston.transports.Console({
      format
    })
  ];

  // Only add file transports in non-serverless environments
  if (!isServerless()) {
    try {
      // Error log file
      transports.push(new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));

      // Combined log file
      transports.push(new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));
    } catch (error) {
      console.warn('File logging not available in this environment:', error.message);
      console.warn('Falling back to console logging only');
    }
  } else {
    console.log('Serverless environment detected - using console logging only');
  }

  return transports;
};

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports: getTransports(),
  exitOnError: false
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper functions for structured logging
const logRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });

  next();
};

const logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };

  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip
    };
  }

  logger.error(errorInfo);
};

const logReminderEvent = (event, reminderId, userId) => {
  logger.info({
    event,
    reminderId,
    userId,
    timestamp: new Date().toISOString()
  });
};

const logLineEvent = (event, userId, messageType) => {
  logger.info({
    event,
    userId,
    messageType,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logRequest,
  logError,
  logReminderEvent,
  logLineEvent
};
