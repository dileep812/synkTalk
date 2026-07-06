// backend/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Optimized for loading conversation histories quickly
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Optimized for filtering unread counts or logs
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent' 
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Guarantees fast chronological sorting
    }
}, { 
    timestamps: true // Automatically injects and handles createdAt/updatedAt fields
});

// Compound index to speed up the fetching of dual-direction chat streams
messageSchema.index({ sender: 1, recipient: 1, timestamp: 1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema);