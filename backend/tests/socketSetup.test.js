import { describe, expect, it, jest } from '@jest/globals';

const registerChatHandlers = jest.fn();
const registerStatusHandlers = jest.fn();

await jest.unstable_mockModule('../sockets/chatHandler.js', () => ({
    registerChatHandlers
}));

await jest.unstable_mockModule('../sockets/statusHandler.js', () => ({
    registerStatusHandlers
}));

const { setupSockets } = await import('../sockets/index.js');

describe('setupSockets', () => {
    it('rejects unauthenticated socket connections', () => {
        const middlewareCalls = [];
        const io = {
            use: jest.fn((fn) => middlewareCalls.push(fn)),
            on: jest.fn()
        };
        const sessionMiddleware = jest.fn((req, res, next) => next());

        setupSockets(io, sessionMiddleware);

        const authMiddleware = middlewareCalls[1];
        const next = jest.fn();

        authMiddleware({ request: { session: null } }, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});