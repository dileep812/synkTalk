// backend/config/database.js
import mongoose from 'mongoose';

export const connectDB = async (uri) => {
    try {
        await mongoose.connect(uri);
        console.log('🍃 Connected to MongoDB for synkTalk');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};