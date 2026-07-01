// backend/models/Request.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Optimized for "Sent Requests" dashboards
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Optimized for "Inbox Requests" dashboards
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

// Prevent duplicate requests between the same two users
requestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

export default mongoose.model('Request', requestSchema);