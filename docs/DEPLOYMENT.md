# Deployment Guide

## Overview

This guide covers deploying the LINE Bot with Reminders service to different environments, including local development, staging, and production.

## Prerequisites

- Node.js 16+ installed
- Git repository access
- LINE Developer account
- Supabase account
- Vercel account (for production deployment)

## Environment Setup

### 1. Local Development

#### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd line-bot
npm install
```

#### Step 2: Environment Configuration

Create a `.env` file:

```bash
cp env.example .env
```

Configure the environment variables:

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

# Optional: API Key for additional security
API_KEY=your-secret-api-key-here

# Optional: CORS origins
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

#### Step 3: Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema from `database/schema.sql`

#### Step 4: LINE Bot Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider and channel (Messaging API)
3. Get your Channel Secret and Channel Access Token
4. Note your LINE user ID (send a message to your bot to get it)

#### Step 5: Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

#### Step 6: Test with ngrok (Optional)

For testing LINE webhooks locally:

```bash
npx ngrok http 3000
```

Use the ngrok URL as your LINE webhook URL: `https://your-ngrok-url.ngrok.io/callback`

### 2. Staging Environment

#### Step 1: Create Staging Environment

```bash
# Create staging branch
git checkout -b staging

# Set staging environment variables
export NODE_ENV=staging
export SUPABASE_URL=your_staging_supabase_url
export SUPABASE_KEY=your_staging_supabase_key
```

#### Step 2: Deploy to Staging

```bash
# Deploy to Vercel staging
vercel --env NODE_ENV=staging
```

#### Step 3: Configure Staging LINE Bot

1. Create a separate LINE channel for staging
2. Set webhook URL to your staging Vercel URL
3. Test all functionality

### 3. Production Deployment

#### Step 1: Prepare Production Environment

```bash
# Ensure you're on main branch
git checkout main

# Run tests
npm test

# Run linting
npm run lint

# Check for any issues
npm run lint:fix
```

#### Step 2: Deploy to Vercel

```bash
# Deploy to production
vercel --prod
```

#### Step 3: Configure Environment Variables

Set production environment variables in Vercel:

```bash
vercel env add CHANNEL_SECRET
vercel env add CHANNEL_ACCESS_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add AUTHORIZED_USERS
vercel env add NODE_ENV production
vercel env add API_KEY
vercel env add ALLOWED_ORIGINS
```

#### Step 4: Update LINE Webhook URL

1. Go to LINE Developers Console
2. Set webhook URL to: `https://your-vercel-app.vercel.app/callback`
3. Enable webhook

#### Step 5: Set Up Monitoring

1. **Health Checks**: Monitor `/health` endpoint
2. **Metrics**: Monitor `/metrics` endpoint
3. **Logs**: Check Vercel function logs
4. **Cron Jobs**: Set up cron-job.org for reminder processing

## Monitoring and Maintenance

### Health Checks

Set up monitoring for the health endpoint:

```bash
# Example health check
curl https://your-vercel-app.vercel.app/health
```

### Logs

Monitor logs in Vercel:

```bash
vercel logs
```

### Metrics

Monitor system metrics:

```bash
curl https://your-vercel-app.vercel.app/metrics
```

### Database Monitoring

1. Monitor Supabase dashboard
2. Check database performance
3. Monitor connection limits

## Security Checklist

### Pre-Deployment

- [ ] Environment variables are secure
- [ ] API keys are properly configured
- [ ] LINE signature verification is enabled
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Input validation is enabled
- [ ] Error messages don't leak sensitive information

### Post-Deployment

- [ ] Test all endpoints
- [ ] Verify LINE webhook functionality
- [ ] Test reminder creation and sending
- [ ] Check rate limiting
- [ ] Verify logging is working
- [ ] Test error handling

## Troubleshooting

### Common Deployment Issues

#### 1. Environment Variables Not Set

**Error**: `Supabase configuration is missing`

**Solution**:

```bash
vercel env ls
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
```

#### 2. LINE Webhook Not Working

**Error**: `401 Unauthorized`

**Solution**:

1. Check LINE signature verification
2. Verify channel secret
3. Check webhook URL format

#### 3. Database Connection Issues

**Error**: `Database connection failed`

**Solution**:

1. Verify Supabase URL and key
2. Check database schema
3. Verify network connectivity

#### 4. Rate Limiting Issues

**Error**: `429 Too Many Requests`

**Solution**:

1. Check rate limit configuration
2. Monitor request patterns
3. Adjust rate limits if needed

### Performance Optimization

#### 1. Database Optimization

- Add database indexes
- Optimize queries
- Monitor connection pooling

#### 2. Caching

- Implement Redis caching (if needed)
- Cache frequently accessed data
- Use CDN for static assets

#### 3. Monitoring

- Set up alerts for errors
- Monitor response times
- Track resource usage

## Backup and Recovery

### Database Backup

1. **Supabase Backups**: Automatic daily backups
2. **Manual Backups**: Export data periodically
3. **Schema Versioning**: Track database changes

### Application Backup

1. **Code Repository**: Git version control
2. **Environment Variables**: Secure storage
3. **Configuration Files**: Version controlled

### Disaster Recovery

1. **Database Recovery**: Restore from Supabase backups
2. **Application Recovery**: Redeploy from Git
3. **Configuration Recovery**: Restore environment variables

## Scaling Considerations

### Horizontal Scaling

- Vercel automatically scales based on demand
- Monitor function execution limits
- Consider edge functions for global distribution

### Database Scaling

- Supabase handles database scaling
- Monitor connection limits
- Consider read replicas for heavy read workloads

### Performance Monitoring

- Monitor response times
- Track error rates
- Monitor resource usage
- Set up alerts for performance degradation

## Security Best Practices

### Environment Variables

- Never commit secrets to Git
- Use Vercel's secure environment variable storage
- Rotate secrets regularly

### API Security

- Validate all inputs
- Implement rate limiting
- Use HTTPS everywhere
- Monitor for suspicious activity

### Database Security

- Use connection pooling
- Implement row-level security
- Monitor database access
- Regular security audits

## Support and Maintenance

### Regular Maintenance

1. **Weekly**: Check logs and metrics
2. **Monthly**: Update dependencies
3. **Quarterly**: Security audit
4. **Annually**: Performance review

### Support Channels

1. **Documentation**: Check this guide and API docs
2. **Logs**: Check Vercel function logs
3. **Monitoring**: Use health check and metrics endpoints
4. **Community**: GitHub issues and discussions

### Emergency Procedures

1. **Service Down**: Check health endpoint and logs
2. **Database Issues**: Check Supabase status
3. **LINE Issues**: Check LINE service status
4. **Security Breach**: Rotate all secrets immediately
