import { describe, expect, it, jest } from '@jest/globals';
import { createMockRequest } from './helpers/mockRequest.js';
import { createMockResponse } from './helpers/mockResponse.js';

const mockCollection = {
    find: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn()
};

const { getSessionStats, manageSessions } = await import('../controllers/sessionController.js');

describe('sessionController', () => {
    it('returns session stats for the active user', async () => {
        mockCollection.find.mockReturnValueOnce({
            toArray: async () => ([
                { _id: 'session-current', expires: new Date('2026-07-17T00:00:00Z'), session: JSON.stringify({ user: { id: 'user-1' }, loginTime: '2026-07-15T10:00:00Z' }) },
                { _id: 'session-other', expires: new Date('2026-07-17T00:00:00Z'), session: JSON.stringify({ user: { id: 'user-2' } }) }
            ])
        });

        const req = createMockRequest({ session: { user: { id: 'user-1' } }, sessionID: 'session-current' });
        const res = createMockResponse();

        await getSessionStats(req, res, mockCollection);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            activeSessionsCount: 1
        }));
    });

    it('prunes all other sessions when requested', async () => {
        mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 4 });
        const req = createMockRequest({ query: { type: 'except-me' }, sessionID: 'session-current' });
        const res = createMockResponse();

        await manageSessions(req, res, mockCollection);

        expect(mockCollection.deleteMany).toHaveBeenCalledWith({ _id: { $ne: 'session-current' } });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects invalid manage session modes', async () => {
        const req = createMockRequest({ query: { type: 'unknown' }, sessionID: 'session-current' });
        const res = createMockResponse();

        await manageSessions(req, res, mockCollection);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});