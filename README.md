# 🤖 LINE Bot with Reminders

A personal secretary assistant LINE Bot that helps you schedule, manage, and receive reminders for interviews and appointments.

## 🎯 Features

- **📝 Reminder Management**: Create, update, delete, and list reminders
- **⏰ Scheduled Notifications**: Automatic reminder delivery via LINE push messages
- **🔐 User Authorization**: Restrict access to specific LINE user IDs
- **📊 Real-time Processing**: Instant response to LINE messages
- **🛡️ Security**: LINE signature verification and API key protection

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (serverless functions)
- **Messaging API**: LINE Messaging API
- **Scheduler**: cron-job.org (or built-in cron for production)

## 📁 Project Structure

```
line-bot/
│── app.js                 # Express app entry point
│── api/
│    └── send-reminders.js # Vercel serverless function
│── routes/
│    └── line.js           # LINE webhook (/callback)
│    └── reminders.js      # Reminder API (/send-reminders)
│── services/
│    └── lineService.js    # LINE API functions
│    └── supabaseService.js# Supabase DB functions
│    └── reminderService.js# Reminder coordination logic
│── utils/
│    └── commandParser.js  # Command parsing utilities
│── database/
│    └── schema.sql        # Supabase database schema
│── test-reminders.js      # Local reminder service test
│── test-server.js         # Local endpoint test server
│── .env                   # Environment variables
│── vercel.json            # Vercel configuration
│── package.json           # Dependencies & scripts
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 16+ installed
- LINE Developer account
- Supabase account
- Vercel account (for deployment)

### 2. Vercel Serverless Function Setup

The bot uses Vercel serverless functions for deployment. The main components are:

- **`app.js`**: Main Express app for LINE webhook (`/callback`)
- **`api/send-reminders.js`**: Serverless function for reminder processing
- **`vercel.json`**: Routing configuration

#### Testing Locally

1. **Test the reminder service directly:**

   ```bash
   node test-reminders.js
   ```

2. **Test the endpoint locally:**

   ```bash
   node test-server.js
   curl http://localhost:3001/send-reminders
   ```

3. **Test the main app:**
   ```bash
   npm start
   curl http://localhost:3000/health
   ```

### 3. Setup LINE Bot

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider and channel (Messaging API)
3. Get your **Channel Secret** and **Channel Access Token**
4. Note your LINE user ID (you can get this by sending a message to your bot)

### 4. Setup Supabase

1. Create a new project at [Supabase](https://supabase.com/)
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Get your **Project URL** and **Service Role Key** from Settings > API

### 5. Local Development

1. **Clone and install dependencies:**

   ```bash
   git clone <your-repo>
   cd line-bot
   npm install
   ```

2. **Create environment file:**

   ```bash
   cp env.example .env
   ```

3. **Configure environment variables:**

   ```env
   # LINE Bot Configuration
   CHANNEL_SECRET=your_line_channel_secret_here
   CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_KEY=your_supabase_service_role_key_here

   # Authorization
   AUTHORIZED_USERS=U1234567890abcdef,U0987654321fedcba

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Start development server:**

   ```bash
   npm run dev
   ```

5. **Test locally with ngrok:**

   ```bash
   npx ngrok http 3000
   ```

   Use the ngrok URL as your LINE webhook URL: `https://your-ngrok-url.ngrok.io/callback`

### 5. Deploy to Vercel

1. **Install Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

2. **Deploy:**

   ```bash
   vercel
   ```

3. **Set environment variables in Vercel:**

   ```bash
   vercel env add CHANNEL_SECRET
   vercel env add CHANNEL_ACCESS_TOKEN
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_KEY
   vercel env add AUTHORIZED_USERS
   ```

4. **Update LINE webhook URL:**
   - Go to LINE Developers Console
   - Set webhook URL to: `https://your-vercel-app.vercel.app/callback`

## 📱 Bot Commands

### Available Commands

| Command   | Description        | Example                                       |
| --------- | ------------------ | --------------------------------------------- |
| `/help`   | Show help message  | `/help`                                       |
| `/add`    | Add a new reminder | `/add 2024-01-15 14:30 Interview with Google` |
| `/list`   | List all reminders | `/list`                                       |
| `/delete` | Delete a reminder  | `/delete 123`                                 |
| `/update` | Update a reminder  | `/update 123 2024-01-16 15:00 Updated time`   |

### Command Format

- **Date Format**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Time Format**: `HH:MM` (24-hour, e.g., `14:30`)
- **Message**: Any text after date and time

### Examples

```
/add 2024-01-15 14:30 Interview with Google
/add 2024-01-20 09:00 Team meeting
/add 2024-01-25 16:00 Doctor appointment
```

## ⏰ Scheduled Reminders

### Automatic Processing

The bot automatically checks for due reminders every 5 minutes in production. You can also:

1. **Manual trigger**: POST to `/send-reminders`
2. **Cron-job.org**: Set up a cron job to hit your endpoint every 5 minutes

### Cron Job Setup (cron-job.org)

1. Go to [cron-job.org](https://cron-job.org/)
2. Create a new cron job
3. Set URL: `https://your-vercel-app.vercel.app/send-reminders`
4. Set schedule: Every 5 minutes (`*/5 * * * *`)
5. Add header: `X-API-Key: your-api-key` (optional)

## 🔐 Security

### Authorization

Only users listed in `AUTHORIZED_USERS` environment variable can use the bot:

```env
AUTHORIZED_USERS=U1234567890abcdef,U0987654321fedcba
```

### LINE Signature Verification

All webhook requests are verified using LINE's signature to prevent spoofing.

### API Key Protection (Optional)

You can add an API key to protect the `/send-reminders` endpoint:

```env
API_KEY=your-secret-api-key
```

## 📊 Database Schema

### Reminders Table

| Column          | Type         | Description            |
| --------------- | ------------ | ---------------------- |
| `id`            | BIGSERIAL    | Primary key            |
| `user_id`       | VARCHAR(255) | LINE user ID           |
| `message`       | TEXT         | Reminder message       |
| `reminder_time` | TIMESTAMP    | When to send reminder  |
| `status`        | VARCHAR(50)  | pending/sent/cancelled |
| `created_at`    | TIMESTAMP    | Creation time          |
| `updated_at`    | TIMESTAMP    | Last update time       |
| `sent_at`       | TIMESTAMP    | When reminder was sent |

## 🧪 Testing

### Health Check

```bash
curl https://your-vercel-app.vercel.app/health
```

### Manual Reminder Check

```bash
curl -X POST https://your-vercel-app.vercel.app/send-reminders
```

### Test LINE Commands

1. Add your LINE user ID to `AUTHORIZED_USERS`
2. Send messages to your bot:
   ```
   /help
   /add 2024-01-15 14:30 Test reminder
   /list
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding**: Check LINE webhook URL and signature verification
2. **Database errors**: Verify Supabase credentials and table schema
3. **Reminders not sending**: Check cron job setup and `/send-reminders` endpoint
4. **Authorization errors**: Ensure user ID is in `AUTHORIZED_USERS`

### Logs

Check Vercel function logs:

```bash
vercel logs
```

### Environment Variables

Verify all environment variables are set:

```bash
vercel env ls
```

## 🔄 API Endpoints

| Endpoint          | Method | Description             |
| ----------------- | ------ | ----------------------- |
| `/callback`       | POST   | LINE webhook endpoint   |
| `/send-reminders` | POST   | Manual reminder trigger |
| `/send-reminders` | GET    | Service status          |
| `/health`         | GET    | Health check            |

## 📈 Monitoring

### Built-in Monitoring

- Health check endpoint: `/health`
- Reminder statistics via database queries
- Vercel function logs and metrics

### Custom Monitoring

You can add custom monitoring by extending the services:

```javascript
// Add to reminderService.js
async function getSystemStats() {
  // Custom monitoring logic
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review LINE and Supabase documentation
3. Open an issue on GitHub

---

**Happy scheduling! 🎉**
