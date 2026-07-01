// backend/controllers/userController.js
import User from '../models/user.js';
import Request from '../models/Request.js';
/**
 * Retrieves a paginated list of users (max 20) matching a search query in the request body.
 * Always excludes the currently authenticated session user.
 * Route: POST /api/users/search
 */
export const searchUsersExceptMe = async (req, res) => {
    try {
        // 1. Guard Clause: Session Validation
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Unauthorized. Active session required.' });
        }
        const myId = req.session.user.id;
        const myEmail = req.session.user.email;
        // 2. Extract, Cast, and Sanitize Inputs from the Request Body
        const page = Math.max(1, parseInt(req.body.page, 10) || 1);
        const limit = 20; // Enforces exactly 20 profiles per view
        const skip = (page - 1) * limit;
        const searchString = req.body.search?.trim() || '';

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

        // // 5. Parallel Database Transactions
        // const [users, totalUsers] = await Promise.all([
        //     User.find(queryFilter)
        //         .select('username email profileImage')
        //         .skip(skip)
        //         .limit(limit)
        //         .sort({ username: 1 }), // Groups results alphabetically
        //     User.countDocuments(queryFilter)
        // ]);

        // 5. Run parallel database queries for optimal performance
        const [users, totalUsers, allMyRequests] = await Promise.all([
            User.find(queryFilter).select('username email profileImage').skip(skip).limit(limit).sort({ username: 1 }),
            User.countDocuments(queryFilter),
            Request.find({ $or: [{ sender: myId }, { recipient: myId }] }) // Fetch all my interactions
        ]);

        // 6. Merge Logic: Map through found users and inject their relationship state (KISS)
        const usersWithConnectionState = users.map(user => {
            // Find if there is an existing request document involving this specific searched user
            const structuralMatch = allMyRequests.find(reqDoc => 
                reqDoc.sender.toString() === user._id.toString() || 
                reqDoc.recipient.toString() === user._id.toString()
            );

            let connectionStatus = 'none'; // Default state: absolute strangers
            let requestId = null;
            let amISender = false;

            if (structuralMatch) {
                connectionStatus = structuralMatch.status; // 'pending' or 'accepted'
                requestId = structuralMatch._id;
                amISender = structuralMatch.sender.toString() === myId.toString();
            }
            // Return the user profile decorated with its explicit UI state indicators
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
        res.json({
            success: true,
            users,
            pagination: {
                totalUsers,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit)||1,
                hasNextPage: skip + users.length < totalUsers
            }
        });

    } catch (error) {
        console.error('[User Controller] Body-Based Search Failed:', error.message);
        res.status(500).json({ error: 'Failed to process the user directory search.' });
    }
};


export const getMyFriends = async (req, res) => {
    try {
        // 1. Guard Clause: Session Validation
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Unauthorized. Active session required.' });
        }

        const myId = req.session.user.id;

        // 2. Find all accepted requests where the current user is either the sender or recipient
        const relationships = await Request.find({
            status: 'accepted',
            $or: [{ sender: myId }, { recipient: myId }]
        });

        // 3. Extract the peer user's ID from each relationship document
        const friendIds = relationships.map(rel => {
            return rel.sender.toString() === myId.toString() ? rel.recipient : rel.sender;
        });

        // 4. Query the User collection to get profile details for those specific IDs
        const friends = await User.find({ _id: { $in: friendIds } })
                                  .select('username email profileImage')
                                  .sort({ username: 1 }); // Keeps friends list alphabetical

        // 5. Return structured response (returns empty array [] natively if no friends match)
        return res.json({ 
            success: true, 
            friends 
        });

    } catch (error) {
        console.error('[User Controller] Friends Fetch Failure:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve friends list.' });
    }
};