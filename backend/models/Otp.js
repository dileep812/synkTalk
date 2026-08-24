import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    otpId: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 300 // Auto-delete after 5 minutes (TTL index)
    }
}, { timestamps: true });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
