// backend/middleware/authMiddleware.js
export const isAuthenticated = (req, res, next) => {
    // 1. Check if the session has a 'user' object attached to it
    if (req.session && req.session.user) {
        // Yes! This is an authenticated session. Proceed to the route handler.
        return next(); 
    }
    
    // 2. No user object found? This is a non-authenticated session.
    res.status(401).json({ error: "Access denied. Please log in first." });
};