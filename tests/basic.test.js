const request = require('supertest');

// Mock all services before requiring app
jest.mock('../services/lineService', () => ({
  sendMessage: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
}));

jest.mock('../services/supabaseService', () => ({
  createReminder: jest.fn().mockResolvedValue({ id: 1, message: 'Test reminder' }),
  getReminders: jest.fn().mockResolvedValue([]),
  deleteReminder: jest.fn().mockResolvedValue(true),
  updateReminder: jest.fn().mockResolvedValue({ id: 1, message: 'Updated reminder' })
}));

jest.mock('@line/bot-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    pushMessage: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    multicast: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })),
  crypto: {
    createHmac: jest.fn().mockImplementation((algorithm, secret) => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-signature')
    }))
  }
}));

const app = require('../app');

describe('Basic App Tests', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'LINE Bot is running');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and metrics data', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('method', 'GET');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
