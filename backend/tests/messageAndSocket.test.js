import { describe, expect, it, jest } from '@jest/globals';
import { createMockRequest } from './helpers/mockRequest.js';
import { createMockResponse } from './helpers/mockResponse.js';

class MockMessage {
    constructor(fields = {}) {
        Object.assign(this, fields);
        this._id = this._id || 'message-1';
        this.save = jest.fn().mockResolvedValue(this);
    }
}

MockMessage.find = jest.fn();
MockMessage.insertMany = jest.fn();

const mockRedisClient = {
    lPush: jest.fn(),
    rPop: jest.fn()
};

await jest.unstable_mockModule('../models/Message.js', () => ({ default: MockMessage }));
await jest.unstable_mockModule('../config/redis.js', () => ({ default: mockRedisClient }));

const { getChatHistory } = await import('../controllers/messageControllers.js');
const { registerChatHandlers } = await import('../sockets/chatHandler.js');
const { startRedisToMongoSync } = await import('../services/reddisToDb.js');

describe('message and socket pipelines', () => {
    it('returns a bounded chat history window', async () => {
        MockMessage.find.mockReturnValueOnce({
            sort: jest.fn().mockReturnValueOnce({
                limit: jest.fn().mockReturnValueOnce({
                    lean: jest.fn().mockResolvedValueOnce([
                        { _id: 'msg-2', timestamp: new Date('2026-07-15T10:05:00Z') },
                        { _id: 'msg-1', timestamp: new Date('2026-07-15T10:00:00Z') }
                    ])
                })
            })
        });

        const req = createMockRequest({
            session: { user: { id: 'user-1' } },
            params: { chatUserId: 'user-2' },
            query: { limit: '1' }
        });
        const res = createMockResponse();

        await getChatHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasMore: true }));
    });

    it('pushes outgoing chat events to the queue and emits delivery updates', async () => {
        const socket = {
            user: { id: 'user-1' },
            on: jest.fn(),
            emit: jest.fn(),
            join: jest.fn(),
            request: {}
        };
        const io = {
            sockets: { adapter: { rooms: new Map([['user-2', new Set(['socket-2'])]]) } },
            to: jest.fn().mockReturnValue({ emit: jest.fn() })
        };

        mockRedisClient.lPush.mockResolvedValueOnce(1);
        registerChatHandlers(io, socket);

        const handler = socket.on.mock.calls.find(([event]) => event === 'message:send')[1];
        await handler({ receiverId: 'user-2', text: 'hello' });

        expect(mockRedisClient.lPush).toHaveBeenCalled();
        expect(socket.emit).toHaveBeenCalledWith('message:sent', expect.any(Object));
        expect(io.to).toHaveBeenCalledWith('user-2');
    });

    it('re-queues Redis batch work into MongoDB on successful polling', async () => {
        let scheduledCallback;
        const intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((callback) => {
            scheduledCallback = callback;
            return 1;
        });

        mockRedisClient.rPop.mockResolvedValueOnce(JSON.stringify({ sender: 'user-1', recipient: 'user-2', text: 'hello' }));
        mockRedisClient.rPop.mockResolvedValueOnce(null);
        MockMessage.insertMany.mockResolvedValueOnce([{ _id: 'msg-1' }]);

        await startRedisToMongoSync();
        await scheduledCallback();
        await Promise.resolve();

        expect(intervalSpy).toHaveBeenCalled();
        expect(MockMessage.insertMany).toHaveBeenCalledWith(
            [expect.objectContaining({ sender: 'user-1', recipient: 'user-2', text: 'hello' })],
            { ordered: false }
        );

        intervalSpy.mockRestore();
    });
});