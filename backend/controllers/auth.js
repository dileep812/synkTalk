// backend/controllers/authController.js
import User from '../models/User.js';
import { sendEmailOTP } from '../services/emailService.js'; // 🌟 Import the exact refactored function

const otpStore = new Map();

export const requestOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate a 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    try {
        // 🌟 Trigger the refactored Gmail REST API email dispatcher
        await sendEmailOTP(email.toLowerCase(), otp);
        
        res.json({ message: 'OTP successfully dispatched to your email address!' });
    } catch (error) {
        console.error('OTP delivery failure:', error);
        res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
};

export const verifyOtp = async (req, res) => {
    const { email, otp, username, profileImage } = req.body;
    const lowerEmail = email.toLowerCase();
    
    const record = otpStore.get(lowerEmail);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
        return res.status(400).json({ error: 'Invalid or expired OTP sequence.' });
    }

    try {
        let userProfile = await User.findOne({ email: lowerEmail });

        if (!userProfile) {
            if (!username) return res.status(200).json({ step: 'user name profile_required' });
            
            userProfile = new User({ email: lowerEmail, username, profileImage });
            await userProfile.save();
        }

        // Initialize Session Memory block
        req.session.user = {
            id: userProfile._id,
            email: userProfile.email,
            username: userProfile.username,
            profileImage: userProfile.profileImage
        };

        otpStore.delete(lowerEmail);
        res.json({ success: true, user: req.session.user });

    } catch (error) {
        res.status(500).json({ error: 'unable to register a user Internal server registration error.' });
    }
};

export const getMe = (req, res) => {
    if (req.session?.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.status(401).json({ authenticated: false, error: 'No active session.' });
    }
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Could not log out' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Session terminated.' });
    });
};