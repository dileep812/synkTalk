// backend/controllers/requestController.js
import Request from '../models/Request.js';

/**
 * Sends a connection request to a peer user.
 * Route: POST /api/v1/requests/send
 */
export const sendRequest = async (req, res) => {
    try {
    const senderId = req.session.user.id;
        const { recipientId } = req.body;
        if (senderId.toString() === recipientId.toString()) {
            return res.status(400).json({ error: "You cannot send a connection request to yourself." });
        }
        // Check if a connection already exists
        const existingConnection = await Request.findOne({
            $or: [
                { sender: senderId, recipient: recipientId },
                { sender: recipientId, recipient: senderId }
            ]
        });

        if (existingConnection) {
            // If it's already accepted, they are already friends
            if (existingConnection.status === 'accepted') {
                return res.status(400).json({ error: "You are already connected with this user." });
            }
            // If it's pending, prevent spamming multiple requests
            return res.status(400).json({ error: "A pending request already exists between you two." });
        }

        // Create a new request document
        const newRequest = await Request.create({ sender: senderId, recipient: recipientId });
        res.status(201).json({ success: true, request: newRequest });
    } catch (error) {
        console.error('[Request Controller] Send Error:', error.message);
        res.status(500).json({ error: "Failed to process connection request." });
    }
};

/**
 * Handles accepting a request or rejecting it (which deletes it from the database).
 * Route: POST /api/v1/requests/handle
 */
export const handleRequestStatus = async (req, res) => {
    try {
        const myId = req.session.user.id;
        const { requestId, action } = req.body; // action: 'accepted' or 'rejected'

        if (!['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({ error: "Invalid action type. Must be 'accepted' or 'rejected'." });
        }

        // Locate the target request where the current user is strictly the recipient
        const request = await Request.findOne({ _id: requestId, recipient: myId });
        if (!request) {
            return res.status(404).json({ error: "Request not found or unauthorized." });
        }

        // EDGE CASE REQUIREMENT: If rejected, delete it so the sender can try again later
        if (action === 'rejected') {
            await Request.deleteOne({ _id: requestId });
            return res.json({ success: true, message: "Connection request rejected and cleared from database." });
        }

        // If accepted, change the state to 'accepted'
        request.status = 'accepted';
        await request.save();

        res.json({ success: true, status: 'accepted', message: "Connection accepted successfully!" });
    } catch (error) {
        console.error('[Request Controller] Handle Error:', error.message);
        res.status(500).json({ error: "Failed to update connection status." });
    }
};

/**
 * Allows the sender to cancel/withdraw their pending request at any time.
 * Route: DELETE /api/v1/requests/withdraw/:requestId
 */
export const withdrawRequest = async (req, res) => {
    try {
        const myId = req.session.user.id;
        const { requestId } = req.params;

        // Ensure the request exists, is still pending, and belongs to the active sender
        const pendingRequest = await Request.findOne({ _id: requestId, sender: myId, status: 'pending' });
        
        if (!pendingRequest) {
            return res.status(404).json({ error: "Pending request not found or cannot be withdrawn." });
        }

        // Hard delete the document
        await Request.deleteOne({ _id: requestId });

        res.json({ success: true, message: "Connection request withdrawn successfully." });
    } catch (error) {
        console.error('[Request Controller] Withdraw Error:', error.message);
        res.status(500).json({ error: "Failed to withdraw connection request." });
    }
};

/**
 * Retrieves incoming pending requests for the logged-in user's inbox
 * Route: GET /api/v1/requests/inbox
 */
export const getIncomingRequests = async (req, res) => {
    try {
        const myId = req.session.user.id;
        const requests = await Request.find({ recipient: myId, status: 'pending' })
                                      .populate('sender', 'username email profileImage');

        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch incoming requests inbox." });
    }
};