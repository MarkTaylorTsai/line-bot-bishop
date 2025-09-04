# LINE Interview Management Bot

A LINE bot for managing upcoming interviews, including adding, updating, deleting, and viewing interview information.

## Features

- **Add Interview**: Add new interviews with interviewee name, date, time, and reason
- **View List**: Get a complete list of scheduled interviews
- **Update Interview**: Modify existing interview information
- **Delete Interview**: Remove scheduled interviews
- **Automatic Reminders**: Send notifications 24 hours and 3 hours before interviews
- **Reminder Status**: Check the status of reminder notifications
- **User-friendly Interface**: Simple Chinese commands for easy interaction

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **LINE Bot SDK**: Official LINE Bot SDK for Node.js

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- LINE Developer Account
- Supabase Account

### 2. LINE Bot Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider and channel (Messaging API)
3. Get your Channel Access Token and Channel Secret
4. Set up your webhook URL (will be your deployed app URL + `/webhook`)

### 3. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com/)
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Get your project URL and anon key from Settings > API

### 4. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Bishop Configuration
BISHOP_LINE_USER_ID=your_bishop_line_user_id_here

# Server Configuration
PORT=3000
```

### 5. Installation

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run in production
npm start
```

### 6. Deployment to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard
4. Update your LINE webhook URL to point to your Vercel deployment

## Usage

### Commands

#### Add Interview

```
加入 {人名} {日期} {時間} {理由}
```

Example:

```
加入 張三 2024-01-15 14:30 技術面試
```

#### View Interview List

```
面談清單
```

#### Update Interview

```
更新 {ID} {欄位} {新值}
```

Example:

```
更新 1 姓名 李四
更新 1 日期 2024-01-16
更新 1 時間 15:00
更新 1 理由 最終面試
```

#### Delete Interview

```
刪除 {ID}
```

Example:

```
刪除 1
```

#### Check Reminder Status

```
提醒狀態
```

This command shows all your interviews with their reminder status (24h and 3h notifications).

### Available Fields for Update

- `姓名` (interviewee_name)
- `日期` (interview_date) - Format: YYYY-MM-DD
- `時間` (interview_time) - Format: HH:mm
- `理由` (reason)

## Database Schema

The bot uses the following table structure:

```sql
CREATE TABLE interviews (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    interviewee_name VARCHAR(255) NOT NULL,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    reason TEXT,
    reminder_24h_sent BOOLEAN DEFAULT FALSE,
    reminder_3h_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

- `GET /` - Health check
- `POST /webhook` - LINE webhook endpoint
- `POST /trigger-reminders` - Manually trigger reminder processing (for testing)

## Reminder System

The bot automatically sends reminder notifications:

- **24 hours before** each scheduled interview
- **3 hours before** each scheduled interview
- Reminders are sent via LINE messages to the bishop
- Each reminder type is sent only once per interview
- Reminder status is tracked in the database to prevent duplicates

### Reminder Features

- **Automatic Processing**: Cron job runs every 10 minutes to check for due reminders
- **Precise Timing**: Uses exact datetime calculations (23.5-24.5 hours for 24h, 2.5-3.5 hours for 3h)
- **Duplicate Prevention**: Database tracks which reminders have been sent
- **Edge Case Handling**: Automatically skips reminders for interviews added too close to start time
- **Bishop Targeting**: All reminders sent to configured bishop LINE user ID
- **Error Handling**: Failed reminders are logged but don't stop the system
- **Manual Trigger**: `/trigger-reminders` endpoint for testing

### Edge Case Handling

- **Late Additions**: If an interview is added less than 3 hours before start time, the 24h reminder is automatically skipped
- **Very Late Additions**: If an interview is added less than 1 hour before start time, both 24h and 3h reminders are skipped
- **Precise Timing**: Uses 30-minute windows around the target times to ensure reminders are sent even if the cron job runs slightly off schedule

## Error Handling

The bot includes comprehensive error handling for:

- Invalid command formats
- Database connection issues
- Invalid date/time formats
- Non-existent interview IDs
- LINE API errors
- Reminder processing errors

## Development

### Project Structure

```
line-bot/
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── database/
│   └── schema.sql        # Database schema
└── README.md             # This file
```

### Running Tests

```bash
# Install dependencies
npm install

# Run the application
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please create an issue in the repository.
