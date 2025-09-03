# LINE Bot API Documentation

## Overview

This document describes the API endpoints for the LINE Bot with Reminders service. The API provides endpoints for LINE webhook handling, reminder management, and system monitoring.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-vercel-app.vercel.app`

## Authentication

### LINE Webhook Authentication

All LINE webhook requests must include a valid signature in the `X-Line-Signature` header.

### API Key Authentication (Optional)

Some endpoints support API key authentication via the `X-API-Key` header.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General**: 100 requests per 15 minutes per IP
- **LINE Webhook**: 30 requests per minute per IP
- **Reminder Endpoint**: 10 requests per 5 minutes per IP
- **Health Check**: 60 requests per minute per IP

Rate limit headers are included in responses:

- `RateLimit-Limit`: Maximum requests per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Endpoints

### 1. Health Check

**GET** `/health`

Returns the health status of the service.

#### Response

```json
{
  "status": "OK",
  "message": "LINE Bot is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0",
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 10485760,
    "external": 1048576
  },
  "database": "connected"
}
```

#### Status Codes

- `200` - Service is healthy
- `429` - Rate limit exceeded

---

### 2. Metrics

**GET** `/metrics`

Returns system metrics and performance data.

#### Response

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 10485760,
    "external": 1048576
  },
  "cpu": {
    "user": 1000000,
    "system": 500000
  },
  "activeConnections": 0,
  "requestsPerMinute": 25,
  "errorsPerMinute": 2
}
```

#### Status Codes

- `200` - Metrics retrieved successfully
- `500` - Failed to retrieve metrics

---

### 3. LINE Webhook

**POST** `/callback`

Handles incoming LINE webhook events. This endpoint processes LINE messages and executes bot commands.

#### Headers

```
X-Line-Signature: <signature>
Content-Type: application/json
```

#### Request Body

```json
{
  "events": [
    {
      "type": "message",
      "source": {
        "userId": "U1234567890abcdef"
      },
      "message": {
        "type": "text",
        "text": "/help"
      }
    }
  ]
}
```

#### Supported Commands

| Command   | Description        | Example                                       |
| --------- | ------------------ | --------------------------------------------- |
| `/help`   | Show help message  | `/help`                                       |
| `/add`    | Add a new reminder | `/add 2024-01-15 14:30 Interview with Google` |
| `/list`   | List all reminders | `/list`                                       |
| `/delete` | Delete a reminder  | `/delete 123`                                 |
| `/update` | Update a reminder  | `/update 123 2024-01-16 15:00 Updated time`   |

#### Response

```json
{
  "status": "OK"
}
```

#### Status Codes

- `200` - Webhook processed successfully
- `401` - Invalid signature
- `400` - Invalid request format
- `429` - Rate limit exceeded
- `500` - Internal server error

---

### 4. Reminder Management

**POST** `/send-reminders`

Manually triggers the reminder processing system to send due reminders.

#### Headers (Optional)

```
X-API-Key: <api-key>
```

#### Request Body

```json
{}
```

#### Response

```json
{
  "success": true,
  "message": "Reminder check completed",
  "remindersSent": 5,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Status Codes

- `200` - Reminders processed successfully
- `401` - Invalid API key (if configured)
- `429` - Rate limit exceeded
- `500` - Internal server error

---

**GET** `/send-reminders`

Returns the status of the reminder service.

#### Response

```json
{
  "status": "OK",
  "service": "Reminder Service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoints": {
    "POST /": "Trigger manual reminder check",
    "GET /": "Service status"
  }
}
```

#### Status Codes

- `200` - Service status retrieved
- `500` - Service error

---

## Error Responses

All endpoints return consistent error responses:

### Validation Error

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "userId",
      "message": "userId is required"
    }
  ]
}
```

### Rate Limit Error

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

### Server Error

```json
{
  "error": "Internal server error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## LINE Bot Commands

### Command Format

All commands follow this pattern:

- **Date Format**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Time Format**: `HH:MM` (24-hour, e.g., `14:30`)
- **Message**: Any text after date and time

### Examples

#### Add Reminder

```
/add 2024-01-15 14:30 Interview with Google
/add 2024-01-20 09:00 Team meeting
/add 2024-01-25 16:00 Doctor appointment
```

#### Update Reminder

```
/update 123 2024-01-16 15:00 Updated interview time
/update 456 2024-01-21 10:00 Rescheduled meeting
```

#### Delete Reminder

```
/delete 123
/delete 456
```

## Webhook Events

The LINE webhook processes these event types:

- `message` - Text messages from users
- `follow` - User follows the bot
- `unfollow` - User unfollows the bot
- `join` - Bot joins a group
- `leave` - Bot leaves a group

Currently, only `message` events with `text` type are processed.

## Security

### LINE Signature Verification

All webhook requests are verified using LINE's signature to prevent spoofing:

1. Extract signature from `X-Line-Signature` header
2. Create HMAC-SHA256 hash of request body using channel secret
3. Compare computed hash with provided signature

### User Authorization

Only users listed in the `AUTHORIZED_USERS` environment variable can use the bot.

### Rate Limiting

Multiple layers of rate limiting protect against abuse:

- IP-based rate limiting
- User-based rate limiting (for LINE users)
- Burst rate limiting for short periods

## Monitoring

### Health Checks

Monitor the `/health` endpoint to ensure service availability.

### Metrics

Use the `/metrics` endpoint to track system performance and resource usage.

### Logs

The service logs all requests, errors, and important events. Logs are available in:

- Console (development)
- Log files (production)
- Vercel function logs (production)

## Troubleshooting

### Common Issues

1. **401 Unauthorized**

   - Check LINE signature verification
   - Verify channel secret configuration

2. **429 Too Many Requests**

   - Rate limit exceeded
   - Wait for rate limit window to reset

3. **500 Internal Server Error**
   - Check service logs
   - Verify database connectivity
   - Check environment variables

### Debug Mode

Set `NODE_ENV=development` to enable detailed error messages and debug logging.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review service logs
3. Contact the development team
