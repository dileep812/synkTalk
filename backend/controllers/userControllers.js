// backend/controllers/userControllers.js
import User from '../models/user.js';
import Request from '../models/Request.js';

/**
 * Performs a global directory search (excluding self), paginated, and cross-references
 * matches with the Request collection to attach relationship metadata.
 * If search query is empty, it returns the 20 most recently registered users.
 * Route: POST /users/search
 */
export const searchUsersExceptMe = async (req, res) => {
    try {
        // 1. Guard Clause: Session Validation
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Unauthorized. Active session required.' });
        }
        const myId = req.session.user.id;
        const myEmail = req.session.user.email;
        const searchString = req.body.search?.trim() || '';
        const page = Math.max(1, parseInt(req.body.page, 10) || 1);

        console.log(`[User Controller | searchUsersExceptMe] Directory search by User: ${myId} | Query: "${searchString}" | Page: ${page}`);
        
        // 2. Extract, Cast, and Sanitize Inputs from the Request Body
        const limit = 20; // Enforces exactly 20 profiles per view
        const skip = (page - 1) * limit;

        // 3. Base Query Configuration: Exclude current user from results
        const queryFilter = {
            email: { $ne: myEmail }
        };

        // 4. Combined Search Strategy 
        // Checks if the dynamic search string matches username OR email case-insensitively
        if (searchString) {
            queryFilter.$or = [
                { username: { $regex: searchString, $options: 'i' } },
                { email: { $regex: searchString, $options: 'i' } }
            ];
        }

        // Set sorting: If search is empty, show the last registered users (createdAt: -1).
        // Otherwise, show alphabetical matches (username: 1).
        const sortOption = searchString ? { username: 1 } : { createdAt: -1 };

        // 5. Run parallel database queries for optimal performance
        const [users, totalUsers, allMyRequests] = await Promise.all([
            User.find(queryFilter)
                .select('username email profileImage')
                .skip(skip)
                .limit(limit)
                .sort(sortOption),
            User.countDocuments(queryFilter),
            Request.find({ $or: [{ sender: myId }, { recipient: myId }] }) // Fetch all my interactions
        ]);

        // 6. Merge Logic: Map through found users and inject their relationship state (KISS)
        const usersWithConnectionState = users.map(user => {
            const targetUserIdStr = user._id.toString();
            // Find if there is an existing request document involving this specific searched user
            const structuralMatch = allMyRequests.find(reqDoc =>
                reqDoc.sender.toString() === targetUserIdStr ||
                reqDoc.recipient.toString() === targetUserIdStr
            );

            let connectionStatus = 'none'; // Default state: absolute strangers
            let requestId = null;
            let amISender = false;

            if (structuralMatch) {
                connectionStatus = structuralMatch.status; // 'pending' or 'accepted'
                requestId = structuralMatch._id;
                amISender = structuralMatch.sender.toString() === myId.toString();
            }

            return {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                relationship: {
                    status: connectionStatus, // 'none', 'pending', 'accepted'
                    requestId,
                    amISender
                }
            };
        });

        // 7. Return Structured Paginated Payload
        console.log(`[User Controller | searchUsersExceptMe] Search completed. Returning ${usersWithConnectionState.length} users (Total matching directory: ${totalUsers})`);
        res.json({
            success: true,
            users: usersWithConnectionState,
            pagination: {
                totalUsers,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit) || 1,
                hasNextPage: skip + users.length < totalUsers
            }
        });

    } catch (error) {
        console.error('[User Controller] Body-Based Search Failed:', error.message);
        res.status(500).json({ error: 'Failed to process the user directory search.' });
    }
};

/**
 * Retrieves a list of all active request documents involving the logged-in user,
 * whether they are 'accepted' or 'pending', populated with the peer user profile
 * and including relationship metadata.
 * Route: GET /users/friends
 */
export const getMyFriends = async (req, res) => {
    try {
        // 1. Guard Clause: Session Validation
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Unauthorized. Active session required.' });
        }

        const myId = req.session.user.id;
        console.log(`[User Controller | getMyFriends] Loading connections/friends list for User: ${myId}`);

// 2. Fetch all matching request documents involving the active user
const requests = await Request.find({
    status: 'accepted',
    $or: [
        { sender: myId },
        { recipient: myId }
    ]
}).populate('sender recipient', 'username email profileImage');
        // 3. Map requests to format peer user details with relationship metadata
        const friendsList = requests.map(reqDoc => {
            const isSender = reqDoc.sender._id.toString() === myId.toString();
            const peerUser = isSender ? reqDoc.recipient : reqDoc.sender;

            // Handle edge case where a referenced user might be deleted from the database
            if (!peerUser) return null;

            return {
                _id: peerUser._id,
                username: peerUser.username,
                email: peerUser.email,
                profileImage: peerUser.profileImage,
                relationship: {
                    status: reqDoc.status, // 'pending' or 'accepted'
                    requestId: reqDoc._id,
                    amISender: isSender
                }
            };
        }).filter(Boolean); // Filter out any null entries from deleted users

        // 4. Return structured response
        console.log(`[User Controller | getMyFriends] Friends list loaded for User: ${myId} | Count: ${friendsList.length}`);
        return res.json({
            success: true,
            friends: friendsList
        });

    } catch (error) {
        console.error('[User Controller] Friends Fetch Failure:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve friends list.' });
    }
};