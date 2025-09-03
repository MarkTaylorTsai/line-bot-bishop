const request = require('supertest');
const crypto = require('crypto');
const app = require('../app');

// Mock LINE service
jest.mock('../services/lineService', () => ({
  sendMessage: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
}));

// Mock Supabase service
jest.mock('../services/supabaseService', () => ({
  createReminder: jest.fn().mockResolvedValue({ id: 1, message: 'Test reminder' }),
  getReminders: jest.fn().mockResolvedValue([]),
  deleteReminder: jest.fn().mockResolvedValue(true),
  updateReminder: jest.fn().mockResolvedValue({ id: 1, message: 'Updated reminder' })
}));

// Mock LINE crypto module
jest.mock('@line/bot-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    pushMessage: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    multicast: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })),
  crypto: {
    createHmac: jest.fn().mockImplementation((algorithm, secret) => {
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mock-signature')
      };
      return mockHmac;
    })
  }
}));

describe('LINE Webhook', () => {
  const mockChannelSecret = 'test-channel-secret';
  const mockUserId = 'U1234567890abcdef';

  // Helper function to create LINE signature
  const createSignature = (body) => {
    return crypto
      .createHmac('SHA256', mockChannelSecret)
      .update(JSON.stringify(body), 'utf8')
      .digest('base64');
  };

  beforeEach(() => {
    // Set environment variables for testing
    process.env.CHANNEL_SECRET = mockChannelSecret;
    process.env.CHANNEL_ACCESS_TOKEN = 'test-access-token';
    process.env.AUTHORIZED_USERS = mockUserId;

    // Clear rate limit stores between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /callback', () => {
    it('should return 401 without signature', async () => {
      const response = await request(app)
        .post('/callback')
        .send({ events: [] })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No signature provided');
    });

    it('should return 401 with invalid signature', async () => {
      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', 'invalid-signature')
        .send({ events: [] })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    it('should return 200 with valid signature and no events', async () => {
      const body = { events: [] };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle help command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/help' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle add reminder command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/add 2024-12-25 14:30 Test reminder' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle list reminders command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/list' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle delete reminder command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/delete 1' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle update reminder command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/update 1 2024-12-26 15:00 Updated reminder' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle unknown command', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/unknown' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should reject unauthorized users', async () => {
      const unauthorizedUserId = 'Uunauthorized';
      const body = {
        events: [{
          type: 'message',
          source: { userId: unauthorizedUserId },
          message: { type: 'text', text: '/help' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle non-text messages', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'image', id: 'image-id' }
        }]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle multiple events', async () => {
      const body = {
        events: [
          {
            type: 'message',
            source: { userId: mockUserId },
            message: { type: 'text', text: '/help' }
          },
          {
            type: 'message',
            source: { userId: mockUserId },
            message: { type: 'text', text: '/list' }
          }
        ]
      };
      const signature = createSignature(body);

      const response = await request(app)
        .post('/callback')
        .set('x-line-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle rate limiting', async () => {
      const body = {
        events: [{
          type: 'message',
          source: { userId: mockUserId },
          message: { type: 'text', text: '/help' }
        }]
      };
      const signature = createSignature(body);

      // Make multiple requests to trigger rate limiting
      const promises = Array(35).fill().map(() =>
        request(app)
          .post('/callback')
          .set('x-line-signature', signature)
          .send(body)
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
