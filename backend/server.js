import 'dotenv/config'

import express from "express"
import { createServer } from 'http';
import session from 'express-session';
import cors from 'cors';
import MongoStore from 'connect-mongo';

import { connectDB } from './config/db.js';
import {initSocket,getIO} from "./io.js";
import { setupSockets } from './sockets/index.js';

import authRouter from "./routes/authRouters.js";
import userRouter from "./routes/userRoutes.js"
import requestRouter from "./routes/requestRoutes.js"
import messageRouter from "./routes/messageRoutes.js"

const app=express()

const isProduction = process.env.NODE_ENV === 'production';
const isSecureClient = process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith('https://');
const useSecureCookies = isProduction || isSecureClient;

// Enable trust proxy so secure cookies (HTTPS) are correctly set when behind load balancers
if (useSecureCookies) {
    app.set('trust proxy', 1);
}

// Local Development HTTPS Spoofing:
// If we are running the backend locally under HTTP but connecting to a secure deployed origin (like Vercel),
// we must spoof the connection as HTTPS to allow the browser to accept and send cross-site session cookies.
if (!isProduction && useSecureCookies) {
    app.use((req, res, next) => {
        req.headers['x-forwarded-proto'] = 'https';
        next();
    });
}

const PORT=process.env.PORT || 5000
const DATABASE_URL=process.env.DATABASE_URL
const http=createServer(app)
const io=initSocket(http);
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // 2. Restrict origin
    credentials: true // 3. Required to allow cookies/sessions over CORS
}));

await connectDB(DATABASE_URL)
app.use(express.json());


// 2. Session Configuration using MongoDB Store
const sessionMiddleware=session({
    secret: process.env.SESSION_SECRET || 'synktalk-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: DATABASE_URL,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // Sessions valid for 1 day
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        // Set secure and sameSite dynamically based on the environment and client origin type
        secure: useSecureCookies,
        sameSite: useSecureCookies ? 'none' : 'lax'
    }
})
app.use(sessionMiddleware);
setupSockets(io, sessionMiddleware);
app.use("/auth",authRouter);
app.use("/users",userRouter);
app.use("/request",requestRouter);
app.use("/messages",messageRouter);

app.get("/", (req, res) => {
   res.json({
        success: true,
        message: "SyncTalk Backend is Running 🚀"
    });
});

http.listen(PORT,()=>console.log(`the server is started at ${PORT}`))