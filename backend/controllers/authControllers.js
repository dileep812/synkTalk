// backend/controllers/authController.js
import User from '../models/user.js';
import Otp from '../models/Otp.js';
import { sendEmailOTP } from '../services/email.js'; 
import { getIO } from '../io.js'; 

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

    const lowerEmail = email.toLowerCase().trim();
    console.log(`[Auth Controller | requestOtp] OTP request initiated for Email: ${lowerEmail}`);

    // 1. Generate a 6-digit random code and a 3-character reference ID
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = generateOtpId();

    try {
        // Find if user already exists to personalize the email name greeting
        const user = await User.findOne({ email: lowerEmail });
        const emailGreetingName = user ? user.username : 'Future SyncTalker';

        // 2. Save OTP in Session
        req.session.otpData = {
            email: lowerEmail,
            otp: otp,
            otpId: otpId,
            expiresAt: Date.now() + 5 * 60 * 1000 
        };

        // 3. Save OTP in MongoDB as a resilient fallback
        try {
            await Otp.findOneAndUpdate(
                { email: lowerEmail },
                { 
                    otp: otp, 
                    otpId: otpId, 
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) 
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.warn('[Auth Controller] Otp DB backup write warning:', err?.message);
        }

        // 4. Ensure session is flushed to store before responding
        await new Promise((resolve) => {
            if (req.session && typeof req.session.save === 'function') {
                req.session.save(resolve);
            } else {
                resolve();
            }
        });

        // 5. Trigger email dispatcher
        await sendEmailOTP(lowerEmail, emailGreetingName, otp, otpId);
        
        console.log(`[Auth Controller | requestOtp] OTP dispatched successfully to: ${lowerEmail} | otpId: ${otpId}`);
        res.json({ 
            message: 'OTP successfully dispatched to your email address!',
            otpId: otpId 
        });
    } catch (error) {
        console.error('OTP delivery failure:', error);
        res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
};

export const verifyOtp = async (req, res) => {
    const { email, otp, username, profileImage } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const lowerEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    console.log(`[Auth Controller | verifyOtp] Verifying OTP for Email: ${lowerEmail} | OTP Code: ${cleanOtp} | Username (Registration): ${username || 'N/A'}`);
   
    // 1. Check session OTP data
    const sessionOtpData = req.session?.otpData;
    let isValidOtp = false;

    if (
        sessionOtpData &&
        sessionOtpData.email === lowerEmail &&
        sessionOtpData.otp === cleanOtp &&
        Date.now() <= sessionOtpData.expiresAt
    ) {
        isValidOtp = true;
    }

    // 2. If session OTP data didn't match (e.g. cross-origin cookie not sent), check Database Otp document
    if (!isValidOtp) {
        try {
            const dbOtp = await Otp.findOne({
                email: lowerEmail,
                otp: cleanOtp,
                expiresAt: { $gt: new Date() }
            });
            if (dbOtp) {
                isValidOtp = true;
            }
        } catch (dbErr) {
            console.warn('[Auth Controller] DB Otp lookup error:', dbErr?.message);
        }
    }

    if (!isValidOtp) {
        return res.status(400).json({ error: 'Invalid or expired OTP sequence.' });
    }

    try {
        let userProfile = await User.findOne({ email: lowerEmail });

        // Registration loop for new users
        if (!userProfile) {
            if (!username) return res.status(200).json({ step: 'user name profile_required' });
            
            userProfile = new User({ email: lowerEmail, username, profileImage });
            await userProfile.save();
        }

        // 3. Initialize Persistent Logged-In Session Memory block
        req.session.user = {
            id: userProfile._id.toString(),
            email: userProfile.email,
            username: userProfile.username,
            profileImage: userProfile.profileImage
        };
        req.session.ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'Unknown';
        req.session.userAgent = req.headers['user-agent'] || 'Unknown';
        req.session.loginTime = new Date();

        // 4. Wipe OTP from session and database
        if (req.session) {
            delete req.session.otpData;
        }
        try {
            await Otp.deleteMany({ email: lowerEmail });
        } catch (delErr) {
            console.warn('[Auth Controller] Otp cleanup error:', delErr?.message);
        }

        // 5. Ensure session is flushed to store before responding
        await new Promise((resolve) => {
            if (req.session && typeof req.session.save === 'function') {
                req.session.save(resolve);
            } else {
                resolve();
            }
        });

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
    const userId = (req.session?.user?.id || req.session?.user?._id)?.toString();
    console.log(`[Auth Controller | logout] Terminating session for User: ${username}`);

    if (userId) {
        try {
            const io = getIO();
            io.in(userId).emit('auth:revoked');
            io.in(userId).disconnectSockets(true);
        } catch (e) {
            console.warn('[Auth Controller | logout] Could not disconnect sockets:', e?.message);
        }
    }

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