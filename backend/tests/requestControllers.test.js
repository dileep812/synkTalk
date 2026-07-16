import { describe, expect, it, jest } from '@jest/globals';
import { createMockRequest } from './helpers/mockRequest.js';
import { createMockResponse } from './helpers/mockResponse.js';

const mockRequestModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn()
};

await jest.unstable_mockModule('../models/Request.js', () => ({
    default: mockRequestModel
}));

const {
    getIncomingRequests,
    handleRequestStatus,
    removeConnection,
    sendRequest,
    withdrawRequest
} = await import('../controllers/requestControllers.js');

describe('requestControllers', () => {
    it('creates a new outgoing connection request', async () => {
        mockRequestModel.findOne.mockResolvedValueOnce(null);
        mockRequestModel.create.mockResolvedValueOnce({ _id: 'request-1', sender: 'user-1', recipient: 'user-2', status: 'pending' });

        const req = createMockRequest({ session: { user: { id: 'user-1' } }, body: { recipientId: 'user-2' } });
        const res = createMockResponse();

        await sendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(mockRequestModel.create).toHaveBeenCalledWith({ sender: 'user-1', recipient: 'user-2' });
    });

    it('accepts or rejects requests based on the action', async () => {
        const storedRequest = { _id: 'request-1', recipient: 'user-2', status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
        mockRequestModel.findOne.mockResolvedValueOnce(storedRequest);

        const req = createMockRequest({ session: { user: { id: 'user-2' } }, body: { requestId: 'request-1', action: 'accepted' } });
        const res = createMockResponse();

        await handleRequestStatus(req, res);

        expect(storedRequest.status).toBe('accepted');
        expect(storedRequest.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, status: 'accepted' }));
    });

    it('withdraws a pending request that belongs to the sender', async () => {
        mockRequestModel.findOne.mockResolvedValueOnce({ _id: 'request-1' });
        mockRequestModel.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

        const req = createMockRequest({ session: { user: { id: 'user-1' } }, params: { requestId: 'request-1' } });
        const res = createMockResponse();

        await withdrawRequest(req, res);

        expect(mockRequestModel.deleteOne).toHaveBeenCalledWith({ _id: 'request-1' });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('lists incoming requests for the active user', async () => {
        mockRequestModel.find.mockReturnValueOnce({ populate: jest.fn().mockResolvedValueOnce([{ _id: 'request-1' }]) });

        const req = createMockRequest({ session: { user: { id: 'user-2' } } });
        const res = createMockResponse();

        await getIncomingRequests(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('removes an accepted connection from either participant', async () => {
        mockRequestModel.findOneAndDelete.mockResolvedValueOnce({ _id: 'connection-1' });

        const req = createMockRequest({ session: { user: { id: 'user-1' } }, params: { friendId: 'user-2' } });
        const res = createMockResponse();

        await removeConnection(req, res);

        expect(mockRequestModel.findOneAndDelete).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});