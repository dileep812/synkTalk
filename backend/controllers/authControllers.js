// backend/controllers/authController.js
import User from '../models/user.js';
import { sendEmailOTP } from '../services/email.js'; 

const generateOtpId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Clean set omitting 0, O, I, 1
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const requestOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const lowerEmail = email.toLowerCase();
    console.log(`[Auth Controller | requestOtp] OTP request initiated for Email: ${lowerEmail}`);

    // 1. Generate a 6-digit random code and a 3-character reference ID
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = generateOtpId();

    try {
        // Find if user already exists to personalize the email name greeting
        const user = await User.findOne({ email: lowerEmail });
        const emailGreetingName = user ? user.username : 'Future SyncTalker';

        // 🌟 2. Save OTP data directly inside the SECURE session (MongoDB backed)
        // Set an explicit expiration timestamp (5 minutes from now)
        req.session.otpData = {
            email: lowerEmail,
            otp: otp,
            otpId: otpId,
            expiresAt: Date.now() + 5 * 60 * 1000 
        };

        // 🌟 3. Trigger the email dispatcher with the required parameters
        await sendEmailOTP(lowerEmail, emailGreetingName, otp, otpId);
        
        // 🌟 4. Return the otpId back to the frontend so your UI can display it
        console.log(`[Auth Controller | requestOtp] OTP dispatched successfully to: ${lowerEmail} | otpId: ${otpId}`);
        res.json({ 
            message: 'OTP successfully dispatched to your email address!',
            otpId: otpId 
        });
    } catch (error) {
        console.error('OTP delivery failure:', error);
        res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
}
    export const verifyOtp = async (req, res) => {
    const { email, otp, username, profileImage } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const lowerEmail = email.toLowerCase();
    console.log(`[Auth Controller | verifyOtp] Verifying OTP for Email: ${lowerEmail} | OTP Code: ${otp} | Username (Registration): ${username || 'N/A'}`);
    
    // 🌟 1. Grab the OTP data out of the current user's session vault
    const sessionOtpData = req.session.otpData;

    // 🌟 2. Validate session existence, email match, code match, and expiration timestamp
    if (
        !sessionOtpData || 
        sessionOtpData.email !== lowerEmail || 
        sessionOtpData.otp !== otp || 
        Date.now() > sessionOtpData.expiresAt
    ) {
        return res.status(400).json({ error: 'Invalid or expired OTP sequence.' });
    }

    try {
        let userProfile = await User.findOne({ email: lowerEmail });

        // Registration loop for new users
        if (!userProfile) {
            // If user doesn't exist and didn't provide a username yet, tell frontend to ask for it
            if (!username) return res.status(200).json({ step: 'user name profile_required' });
            
            userProfile = new User({ email: lowerEmail, username, profileImage });
            await userProfile.save();
        }

        // 🌟 3. Initialize Persistent Logged-In Session Memory block
        req.session.user = {
            id: userProfile._id.toString(),
            email: userProfile.email,
            username: userProfile.username,
            profileImage: userProfile.profileImage
        };

        // 🌟 4. Wipe out the single-use OTP data structure out of the session vault
        delete req.session.otpData;

        console.log(`[Auth Controller | verifyOtp] OTP verified successfully. User logged in: ${userProfile._id} (${userProfile.username})`);
        res.json({ success: true, user: req.session.user });

    } catch (error) {
        console.error('Registration processing error:', error);
        res.status(500).json({ error: 'Internal server registration error.' });
    }
};
export const getMe = (req, res) => {
       console.log(`[Auth Controller | getMe] Checking auth session for User: ${req.session.user?.username || 'Guest'}`);
       return res.json({ authenticated: true, user: req.session.user });
   
};

export const logout = (req, res) => {
    const username = req.session?.user?.username || 'Unknown User';
    console.log(`[Auth Controller | logout] Terminating session for User: ${username}`);
    req.session.destroy((err) => {
        if (err) {
            console.error(`[Auth Controller | logout] Session destruction failed for User: ${username}. Error:`, err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        console.log(`[Auth Controller | logout] Session terminated cleanly for User: ${username}`);
        res.json({ success: true, message: 'Session terminated.' });
    });
};