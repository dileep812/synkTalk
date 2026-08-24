import dotenv from 'dotenv/config';
import axios from 'axios';

const getGmailAccessToken = async () => {
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GMAIL_CLIENT_ID,
            client_secret: process.env.GMAIL_CLIENT_SECRET,
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        });
        return response.data.access_token;
    } catch (error) {
        console.error('[Gmail API] Token Refresh Failure:', error.response?.data || error.message);
        throw new Error('Gmail API authentication failed');
    }
};


const encodeRawEmail = (to, fromName, fromEmail, subject, text, html) => {
    const boundary = '__SyncTalkBoundary__';
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const messageParts = [
        `From: "${fromName}" <${fromEmail}>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="utf-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(text).toString('base64'),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html).toString('base64'),
        '',
        `--${boundary}--`
    ];

    return Buffer.from(messageParts.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};


const sendEmailViaGmailAPI = async (to, fromName, subject, text, html) => {
    // Fail silently or fallback to demo logs if credentials don't exist yet
    if (!process.env.EMAIL_USER || !process.env.GMAIL_CLIENT_ID) {
        console.log(`[DEMO SIMULATION] To: ${to} | Subject: ${subject}\nText Payload: ${text}\n`);
        return { demo: true };
    }

    const accessToken = await getGmailAccessToken();
    const raw = encodeRawEmail(to, fromName, process.env.EMAIL_USER, subject, text, html);

    const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data;
};

export const sendEmailOTP = async (email, username, otp, otpId) => {
    const subject = `[${otpId}] SyncTalk - Your Verification Code`;
    const text = `Hello ${username},\n\nYour 6-digit verification code is: ${otp} (Reference ID: ${otpId}). It will expire in 5 minutes.`;
    
    const html = `
        <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; max-width: 450px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <h2 style="color: #4A90E2; margin-top: 0; font-size: 20px;">SyncTalk Verification</h2>
            <p style="color: #555; font-size: 15px;">Hello <strong>${username}</strong>,</p>
            <p style="color: #555; font-size: 14px;">Use the verification code below to complete your request. Please ensure the Reference ID matches the one shown on your screen.</p>
            
            <div style="margin: 15px 0 5px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                Reference ID: <strong style="color: #333; background: #eef2f7; padding: 2px 6px; border-radius: 4px;">${otpId}</strong>
            </div>

            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2C3E50; background: #f8f9fa; padding: 12px 20px; display: inline-block; border-radius: 8px; border: 1px solid #eaeded; margin-bottom: 10px;">
                ${otp}
            </div>
            
            <p style="font-size: 13px; color: #e74c3c; margin-top: 10px;">⏰ This code is uniquely tied to ID <b>${otpId}</b> and will expire in 5 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999; line-height: 1.4;">If you did not request this code, please ignore this email or update your account security parameters.</p>
        </div>
    `;

    return await sendEmailViaGmailAPI(email, 'SyncTalk Verification', subject, text, html);
};


export const sendLoginAlert = async (email, details) => {
    const { ip, userAgent, time, location } = details;
    const subject = 'New Login Detected - SyncTalk';
    const text = `New Login Detected - Time: ${time}, IP: ${ip}, Location: ${location}, Device: ${userAgent}`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #d32f2f; margin-top: 0;">New Login Detected</h2>
            <p>Your SyncTalk account was just accessed from a new device.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="margin: 8px 0;"><b>Time:</b> ${time}</p>
            <p style="margin: 8px 0;"><b>IP Address:</b> ${ip}</p>
            <p style="margin: 8px 0;"><b>Location:</b> ${location}</p>
            <p style="margin: 8px 0;"><b>Device:</b> ${userAgent}</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #666; margin-bottom: 0;">If this wasn't you, please change your security settings immediately.</p>
        </div>
    `;

    return await sendEmailViaGmailAPI(email, 'SyncTalk Security', subject, text, html);
};


export const sendDeploymentSuccessEmail = async () => {
    const subject = '🚀 SyncTalk Successfully Deployed!';
    const text = `SyncTalk Deployed - Healthy, Timestamp: ${new Date().toLocaleString()}`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; background-color: #fcfcfc;">
            <h2 style="color: #2e7d32; margin-top: 0;">🚀 Deployment Successful!</h2>
            <p>Your SyncTalk backend server has been successfully built and deployed to the cloud.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p style="margin: 8px 0;"><b>Server Status:</b> Running & Healthy ✅</p>
            <p style="margin: 8px 0;"><b>Timestamp:</b> ${new Date().toLocaleString()}</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
        </div>
    `;
    return await sendEmailViaGmailAPI('dileep.y23@iiits.in', 'SyncTalk System', subject, text, html);
};

let lastRedisAlertTimestamp = 0;
const REDIS_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown between repeated error emails

export const sendRedisFailureAlert = async (errorMessage, extraDetails = {}) => {
    const now = Date.now();
    if (now - lastRedisAlertTimestamp < REDIS_ALERT_COOLDOWN_MS) {
        return; // Suppress duplicate email bursts within cooldown period
    }
    lastRedisAlertTimestamp = now;

    const targetEmail = 'yarramanenidileep@gmail.com';
    const subject = '🚨 ALERT: Redis Failure - Automatic Database Fallback Triggered';
    const time = new Date().toLocaleString();
    const text = `ALERT: Redis failure detected in SyncTalk at ${time}.\nError: ${errorMessage}\nFallback: Messages are now being written directly to MongoDB database.`;
    const html = `
        <div style="font-family: sans-serif; padding: 25px; border: 1px solid #ffcdd2; border-radius: 12px; max-width: 520px; background-color: #fffaf0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
            <h2 style="color: #c62828; margin-top: 0; font-size: 19px;">
                🚨 Redis Failure Alert
            </h2>
            <p style="color: #333; font-size: 14px; line-height: 1.5;">
                A connection or operation failure occurred with the <strong>Redis Queue Matrix</strong>.
            </p>
            
            <div style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 12px; margin: 15px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #b71c1c; font-family: monospace; word-break: break-all;">
                    <b>Failure Reason:</b> ${errorMessage || 'Redis unreachable or operation timed out.'}
                </p>
            </div>

            <div style="background-color: #e8f5e9; border-left: 4px solid #2e7d32; padding: 12px; margin: 15px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #1b5e20; font-weight: bold;">
                    ✅ Database Direct Write Active:
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #2e7d32;">
                    Messages are automatically and immediately being saved directly into MongoDB to prevent any data loss.
                </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #ffe0b2; margin: 15px 0;" />
            <p style="font-size: 11px; color: #777; margin: 0;"><b>Incident Timestamp:</b> ${time}</p>
        </div>
    `;

    try {
        console.log(`[Alert System] Dispatching Redis failure email to: ${targetEmail}`);
        return await sendEmailViaGmailAPI(targetEmail, 'SyncTalk Alert System', subject, text, html);
    } catch (err) {
        console.error('[Alert System] Failed to dispatch Redis failure alert email:', err.message);
    }
};

