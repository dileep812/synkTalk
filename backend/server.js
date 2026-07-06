import 'dotenv/config'

import express from "express"
import { createServer } from 'http';
import session from 'express-session';
import cors from 'cors';
import MongoStore from 'connect-mongo';

import { connectDB } from './config/db.js';
import {sendDeploymentSuccessEmail} from "./services/email.js"
import {initSocket,getIO} from "./io.js";
import { setupSockets } from './sockets/index.js';

import authRouter from "./routes/authRouters.js";
import userRouter from "./routes/userRoutes.js"
import requestRouter from "./routes/requestRoutes.js"
import messageRouter from "./routes/messageRoutes.js"

const app=express()
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
        secure: process.env.NODE_ENV === 'production' ,// Set to true if you use HTTPS later
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 5. Cross-origin cookie handling
    }
})
app.use(sessionMiddleware);
setupSockets(io, sessionMiddleware);
    app.get("/", (req, res) => {
       res.json({
            success: true,
            message: "SyncTalk Backend is Running 🚀"
        });
    });


app.use("/auth",authRouter);
app.use("/users",userRouter);
app.use("/request",requestRouter);
app.use("/messages",messageRouter);

// sendDeploymentSuccessEmail()

http.listen(PORT,()=>console.log(`the server is started at ${PORT}`))