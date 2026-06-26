import 'dotenv/config'

import express from "express"
import session from 'express-session';
import cors from 'cors';
import MongoStore from 'connect-mongo';

import { connectDB } from './config/db.js';
import {sendDeploymentSuccessEmail} from "./services/email.js"

import authRouter from "./routes/auth.js";

const app=express()
const PORT=process.env.PORT || 3000
const DATABASE_URL=process.env.DATABASE_URL

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // 2. Restrict origin
    credentials: true // 3. Required to allow cookies/sessions over CORS
}));

await connectDB(DATABASE_URL)
app.use(express.json());


// 2. Session Configuration using MongoDB Store
app.use(session({
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
}));

    app.get("/", (req, res) => {
       res.json({
            success: true,
            message: "SyncTalk Backend is Running 🚀"
        });
    });


app.use("/auth",authRouter);
// sendDeploymentSuccessEmail()
app.listen(PORT,()=>console.log(`the server is started at ${PORT}`))