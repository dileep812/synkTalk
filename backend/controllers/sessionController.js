import mongoose from 'mongoose';

const getSessionCollection = () => mongoose.connection.db.collection('sessions');


/* Displays diagnostic info about all active data sessions in the database cluster.
   * @route GET /sessions/stats
   */

export const getSessionStats = async (req, res, sessionCollection = getSessionCollection()) => {
    try {
      const currentUserId = req.session?.user?.id;
      if (!currentUserId) {
          return res.status(401).json({ success: false, error: "Unauthorized. Session required." });
      }

      const rawSessions = await sessionCollection.find({}).toArray();
      
      const userSessions = [];

      for (const doc of rawSessions) {
          let sessionObj = {};
          try {
              sessionObj = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session || {};
          } catch (e) {
              continue;
          }

          if (sessionObj?.user?.id === currentUserId) {
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
export const manageSessions = async (req, res, sessionCollection = getSessionCollection()) => {
    const { type, id } = req.query; // e.g., /sessions?type=except-me
    const currentSessionId = req.sessionID;

    try {
        let result;

        switch (type) {
            case 'all':
                result = await sessionCollection.deleteMany({});
                res.clearCookie('connect.sid');
                return res.status(200).json({ success: true, message: `Wiped all ${result.deletedCount} platform sessions.` });

            case 'except-me':
                result = await sessionCollection.deleteMany({ _id: { $ne: currentSessionId } });
                return res.status(200).json({ success: true, message: `Cleared all other active devices (${result.deletedCount}).` });

            case 'specific':
                if (!id) return res.status(400).json({ success: false, error: "Missing session 'id' parameter." });
                
                result = await sessionCollection.deleteOne({ _id: id });
                if (id === currentSessionId) res.clearCookie('connect.sid');
                
                return res.status(200).json({ 
                    success: result.deletedCount > 0, 
                    message: result.deletedCount ? "Target session terminated." : "Session not found." 
                });

            default:
                return res.status(400).json({ success: false, error: "Invalid clear type. Must be 'all', 'except-me', or 'specific'." });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};