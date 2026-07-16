import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockSendEmailOTP = jest.fn();

class MockUser {
    constructor(doc = {}) {
        Object.assign(this, doc);
        this._id = this._id || 'user-1';
        this.save = jest.fn().mockResolvedValue(this);
    }
}

MockUser.findOne = mockFindOne;

await jest.unstable_mockModule('../models/user.js', () => ({
    default: MockUser
}));

await jest.unstable_mockModule('../services/email.js', () => ({
    sendEmailOTP: mockSendEmailOTP
}));

const { default: authRouter } = await import('../routes/authRouters.js');

const createApp = ({ injectSessionUser = false } = {}) => {
    const app = express();
    app.use(express.json());
    if (injectSessionUser) {
        app.use((req, res, next) => {
            req.session = {
                user: { id: 'user-1', username: 'Avery', email: 'user@example.com' },
                destroy: jest.fn((callback) => callback?.())
            };
            next();
        });
    } else {
        app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
    }
    app.use('/auth', authRouter);
    return app;
};

describe('auth routes', () => {
    beforeEach(() => {
        mockFindOne.mockReset();
        mockSendEmailOTP.mockReset();
    });

    it('stores otp data in session and returns otp metadata', async () => {
        mockFindOne.mockResolvedValue({ username: 'Avery', email: 'user@example.com', _id: 'user-1' });
        mockSendEmailOTP.mockResolvedValue(undefined);
        jest.spyOn(Math, 'random').mockReturnValue(0.111111);

        const app = createApp();
        const agent = request.agent(app);

        const response = await agent.post('/auth/request-otp').send({ email: 'User@Example.com' });

        expect(response.status).toBe(200);
        expect(response.body.otpId).toMatch(/^[A-Z2-9]{3}$/);
        expect(mockSendEmailOTP).toHaveBeenCalledWith('user@example.com', 'Avery', expect.any(String), expect.any(String));
    });

    it('verifies otp, clears otp state, and persists session user details', async () => {
        const app = createApp();
        const agent = request.agent(app);

        mockFindOne.mockResolvedValue({ username: 'Avery', email: 'user@example.com', profileImage: 'https://example.com/avatar.png', _id: 'user-1' });
        mockSendEmailOTP.mockResolvedValueOnce(undefined);
        jest.spyOn(Math, 'random').mockReturnValue(0.111111);
        const requestOtpResponse = await agent.post('/auth/request-otp').send({ email: 'user@example.com' });
        expect(requestOtpResponse.status).toBe(200);

        const otpCode = '199999';

        const verifyResponse = await agent.post('/auth/verify-otp').send({
            email: 'user@example.com',
            otp: otpCode,
            username: 'Avery',
            profileImage: 'https://example.com/avatar.png'
        });

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.success).toBe(true);
    });

    it('returns the authenticated session through /me', async () => {
        const app = createApp({ injectSessionUser: true });

        const response = await request(app).get('/auth/me');

        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe('Avery');
    });

    it('logs out the authenticated session', async () => {
        const app = createApp({ injectSessionUser: true });

        const response = await request(app).post('/auth/logout');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});