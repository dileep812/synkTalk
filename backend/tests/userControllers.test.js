import { describe, expect, it, jest } from '@jest/globals';
import { createMockRequest } from './helpers/mockRequest.js';
import { createMockResponse } from './helpers/mockResponse.js';

const mockUserModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn()
};

const mockRequestModel = {
    find: jest.fn()
};

const mockMessageModel = {
    find: jest.fn()
};

await jest.unstable_mockModule('../models/user.js', () => ({ default: mockUserModel }));
await jest.unstable_mockModule('../models/Request.js', () => ({ default: mockRequestModel }));
await jest.unstable_mockModule('../models/Message.js', () => ({ default: mockMessageModel }));

const { getMyFriends, searchUsersExceptMe, updateProfile } = await import('../controllers/userControllers.js');

describe('userControllers', () => {
    it('searches the directory and merges relationship state', async () => {
        mockUserModel.find.mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
                skip: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce({
                        sort: jest.fn().mockResolvedValueOnce([
                            { _id: 'user-2', username: 'Bea', email: 'bea@example.com', profileImage: 'img' }
                        ])
                    })
                })
            })
        });
        mockUserModel.countDocuments.mockResolvedValueOnce(1);
        mockRequestModel.find.mockResolvedValueOnce([
            { sender: 'user-1', recipient: 'user-2', status: 'pending', _id: 'request-1' }
        ]);

        const req = createMockRequest({
            session: { user: { id: 'user-1', email: 'me@example.com' } },
            body: { search: 'bea', page: 1 }
        });
        const res = createMockResponse();

        await searchUsersExceptMe(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            users: [expect.objectContaining({ relationship: expect.objectContaining({ status: 'pending' }) })]
        }));
    });

    it('loads the active friends list and unread counts', async () => {
        mockRequestModel.find.mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce([
                {
                    _id: 'request-1',
                    sender: { _id: 'user-1', username: 'Me', email: 'me@example.com', profileImage: 'me.png' },
                    recipient: { _id: 'user-2', username: 'Bea', email: 'bea@example.com', profileImage: 'bea.png' },
                    status: 'accepted'
                }
            ])
        });
        mockMessageModel.find.mockReturnValueOnce({ select: jest.fn().mockReturnValueOnce({ limit: jest.fn().mockReturnValueOnce({ lean: jest.fn().mockResolvedValueOnce([{ _id: 'msg-1' }]) }) }) });

        const req = createMockRequest({ session: { user: { id: 'user-1' } } });
        const res = createMockResponse();

        await getMyFriends(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            friends: [expect.objectContaining({ unreadCount: 1 })]
        }));
    });

    it('updates the profile and syncs the session cache', async () => {
        mockUserModel.findOne.mockResolvedValueOnce(null);
        mockUserModel.findByIdAndUpdate.mockReturnValueOnce({
            lean: jest.fn().mockResolvedValueOnce({ _id: 'user-1', username: 'Updated', email: 'updated@example.com', profileImage: 'img-2' })
        });

        const req = createMockRequest({
            session: { user: { id: 'user-1', username: 'Old', email: 'old@example.com', profileImage: 'img-1' } },
            body: { username: 'Updated', email: 'updated@example.com', profileImage: 'img-2' }
        });
        const res = createMockResponse();

        await updateProfile(req, res);

        expect(req.session.user.username).toBe('Updated');
        expect(res.status).toHaveBeenCalledWith(200);
    });
});