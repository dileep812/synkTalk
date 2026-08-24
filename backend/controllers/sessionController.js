import mongoose from 'mongoose';
import { getIO } from '../io.js';

const getSessionCollection = (customCollection) => {
    if (customCollection && typeof customCollection.find === 'function' && typeof customCollection.deleteMany === 'function') {
        return customCollection;
    }
    return mongoose.connection?.db ? mongoose.connection.db.collection('sessions') : mongoose.connection?.collection('sessions');
};

/**
 * Displays diagnostic info and active sessions for the current logged in user.
 * @route GET /sessions
 */
export const getSessionStats = async (req, res, customCollection) => {
    try {
        const currentUserId = (req.session?.user?.id || req.session?.user?._id)?.toString();
        if (!currentUserId) {
            return res.status(401).json({ success: false, error: "Unauthorized. Session required." });
        }

        const collection = getSessionCollection(customCollection);
        if (!collection) {
            return res.status(500).json({ success: false, error: "Database session collection not ready." });
        }

        const rawSessions = await collection.find({}).toArray();
        const userSessions = [];

        for (const doc of rawSessions) {
            let sessionObj = {};
            try {
                sessionObj = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session || {};
            } catch {
                continue;
            }

            const sessionUserId = (sessionObj?.user?.id || sessionObj?.user?._id)?.toString();

            if (sessionUserId === currentUserId) {
                userSessions.push({
                    id: doc._id,
                    expires: doc.expires,
                    ip: sessionObj.ip || 'Unknown',
                    userAgent: sessionObj.userAgent || 'Unknown',
                    loginTime: sessionObj.loginTime || null,
                    lastAccess: sessionObj.lastAccess || null,
                    isCurrent: doc._id === req.sessionID
                });
            }
        }

        // Sort: current session always at the top, then by loginTime desc
        userSessions.sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return new Date(b.loginTime || 0) - new Date(a.loginTime || 0);
        });

        return res.status(200).json({
            success: true,
            activeSessionsCount: userSessions.length,
            sessions: userSessions,
            message: "Active user sessions compiled successfully."
        });
    } catch (error) {
        console.error('[Session Controller] Error fetching stats:', error);
        return res.status(500).json({ success: false, error: "Failed to fetch session collection metrics." });
    }
};

/**
 * Handles three session cleanup workflows: 'all', 'except-me', or a specific 'sessionId'.
 * @route DELETE /sessions?type=all|except-me|specific&id=SESSION_ID
 */
export const manageSessions = async (req, res, customCollection) => {
    const { type, id } = req.query; // e.g., /sessions?type=except-me
    const currentUserId = req.session?.user?.id || req.session?.user?._id;
    const currentSessionId = req.sessionID;

    try {
        const collection = getSessionCollection(customCollection);
        if (!collection) {
            return res.status(500).json({ success: false, error: "Database session collection not ready." });
        }

        switch (type) {
            case 'all': {
                let result;
                if (currentUserId) {
                    try {
                        const io = getIO();
                        io.in(currentUserId.toString()).emit('auth:revoked');
                        io.in(currentUserId.toString()).disconnectSockets(true);
                    } catch {}

                    const rawSessions = await collection.find({}).toArray();
                    const userSessionIds = [];
                    for (const doc of rawSessions) {
                        try {
                            const sessionObj = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session || {};
                            if ((sessionObj?.user?.id || sessionObj?.user?._id) === currentUserId) {
                                userSessionIds.push(doc._id);
                            }
                        } catch {}
                    }
                    result = await collection.deleteMany(userSessionIds.length ? { _id: { $in: userSessionIds } } : {});
                } else {
                    result = await collection.deleteMany({});
                }
                res.clearCookie('connect.sid');
                return res.status(200).json({ success: true, message: `Wiped all ${result.deletedCount || 0} platform sessions.` });
            }

            case 'except-me': {
                let result;
                if (currentUserId) {
                    const rawSessions = await collection.find({}).toArray();
                    const otherSessionIds = [];
                    for (const doc of rawSessions) {
                        try {
                            const sessionObj = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session || {};
                            if ((sessionObj?.user?.id || sessionObj?.user?._id) === currentUserId && doc._id !== currentSessionId) {
                                otherSessionIds.push(doc._id);
                            }
                        } catch {}
                    }
                    result = await collection.deleteMany(otherSessionIds.length ? { _id: { $in: otherSessionIds } } : { _id: { $ne: currentSessionId } });
                } else {
                    result = await collection.deleteMany({ _id: { $ne: currentSessionId } });
                }
                return res.status(200).json({ success: true, message: `Cleared all other active devices (${result.deletedCount || 0}).` });
            }

            case 'specific': {
                if (!id) return res.status(400).json({ success: false, error: "Missing session 'id' parameter." });
                
                const result = await collection.deleteOne({ _id: id });
                if (id === currentSessionId) res.clearCookie('connect.sid');
                
                return res.status(200).json({ 
                    success: result.deletedCount > 0, 
                    message: result.deletedCount ? "Target session terminated." : "Session not found." 
                });
            }

            default:
                return res.status(400).json({ success: false, error: "Invalid clear type. Must be 'all', 'except-me', or 'specific'." });
        }
    } catch (error) {
        console.error('[Session Controller] Error managing sessions:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};