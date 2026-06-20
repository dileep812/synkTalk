import 'dotenv/config'
import express from "express"
import mongoose from "mongoose"
import users from "./models/user.js"
import { connectDB } from './config/database.js';
const app=express()
const PORT=3000
const DATABASE_URL=process.env.DATABASE_URL
connectDB(DATABASE_URL)
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
        secure: false // Set to true if you use HTTPS later
    }
}));
app.listen(PORT,()=>console.log(`the server is started at ${PORT}`))