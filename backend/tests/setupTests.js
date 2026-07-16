import { afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/synktalk-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

afterEach(() => {
    jest.restoreAllMocks();
});