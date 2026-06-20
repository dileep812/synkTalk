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

export const sendEmailOTP = async (email, otp) => {
    const subject = 'SyncTalk - Your Verification Code';
    const text = `Your 6-digit verification code is: ${otp}. It will expire in 5 minutes.`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #4A90E2;">SyncTalk Verification</h2>
            <p>Your 6-digit verification code is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</p>
            <p style="font-size: 14px; color: #666;">It will expire in 5 minutes.</p>
        </div>
    `;

    return await sendEmailViaGmailAPI(email, 'SyncTalk', subject, text, html);
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
