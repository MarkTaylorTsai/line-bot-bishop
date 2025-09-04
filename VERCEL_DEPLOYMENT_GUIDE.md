# Vercel Deployment Guide

## Issues Fixed

The following issues have been resolved to make your LINE Bot work on Vercel:

### 1. Crypto Module Issue

**Problem**: `Cannot read properties of undefined (reading 'createHmac')`
**Solution**: Replaced `line.crypto.createHmac()` with Node.js built-in `crypto.createHmac()`

### 2. File System Access Issue

**Problem**: Logger service trying to write to log files in serverless environment
**Solution**: Modified logger to only use console logging in production/serverless environments

### 3. Logger Function Calls

**Problem**: Incorrect logger function calls in API endpoints
**Solution**: Fixed logger calls to use proper methods (`logger.info()` instead of `logger()`)

## Environment Variables Required

Make sure to set these environment variables in your Vercel dashboard:

### Required Variables

- `CHANNEL_SECRET` - Your LINE Bot channel secret
- `CHANNEL_ACCESS_TOKEN` - Your LINE Bot channel access token
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/service key
- `AUTHORIZED_USERS` - Comma-separated list of authorized LINE user IDs

### Optional Variables

- `NODE_ENV` - Set to "production" (automatically set by Vercel)
- `ALLOWED_ORIGINS` - CORS allowed origins
- `API_KEY` - Optional API key for additional security

## Deployment Steps

### 1. Set Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all required environment variables listed above

### 2. Deploy to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or push to your connected Git repository
git add .
git commit -m "Fix Vercel deployment issues"
git push
```

### 3. Test Your Deployment

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.vercel.app/health`
2. **Reminders API**: `https://your-app.vercel.app/send-reminders`
3. **LINE Webhook**: `https://your-app.vercel.app/callback`

## Testing Locally

Run the test script to verify everything works:

```bash
node test-vercel.js
```

## Common Issues and Solutions

### Issue: "FUNCTION_INVOCATION_FAILED"

**Cause**: Missing environment variables or crypto module issues
**Solution**:

1. Check all environment variables are set in Vercel dashboard
2. Verify the crypto module fix is applied

### Issue: "Cannot read properties of undefined"

**Cause**: Missing dependencies or incorrect imports
**Solution**:

1. Ensure all dependencies are in `package.json`
2. Check import statements are correct

### Issue: File system errors

**Cause**: Trying to write to files in serverless environment
**Solution**:

1. Use console logging instead of file logging
2. Avoid file system operations in production

## Monitoring and Debugging

### Vercel Logs

1. Go to your Vercel dashboard
2. Select your project
3. Go to Functions tab
4. Check function logs for errors

### Health Check Endpoint

Use the `/health` endpoint to verify your app is running:

```bash
curl https://your-app.vercel.app/health
```

### LINE Webhook Testing

Test your LINE webhook with a tool like ngrok or by setting up a test LINE Bot.

## Production Checklist

- [ ] All environment variables set in Vercel dashboard
- [ ] LINE Bot webhook URL updated to Vercel URL
- [ ] Health check endpoint responding
- [ ] Reminders API working
- [ ] LINE webhook receiving messages
- [ ] Database connections working
- [ ] Error logging to console (not files)

## Support

If you're still experiencing issues:

1. Check Vercel function logs
2. Run `node test-vercel.js` locally
3. Verify all environment variables are set
4. Test each endpoint individually

## Files Modified

- `routes/line.js` - Fixed crypto module usage
- `services/loggerService.js` - Made serverless-compatible
- `api/send-reminders.js` - Fixed logger calls
- `vercel.json` - Updated configuration
- `test-vercel.js` - Added deployment testing script
