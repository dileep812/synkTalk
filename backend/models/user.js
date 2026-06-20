// backend/user.js
import mongoose from 'mongoose';

// A pool of preset avatar choices for the application
export const PROFILE_IMAGES = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Harley',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha'
];

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [20, 'Username cannot exceed 20 characters']
    },
    profileImage: {
        type: String,
        // Enforces a random selection from the 4 default images if none is provided
        default: () => PROFILE_IMAGES[Math.floor(Math.random() * PROFILE_IMAGES.length)]
    }
}, {
    // Automatically creates 'createdAt' and 'updatedAt' fields as ISO strings
    timestamps: true 
});

// Create the model using the schema
const User = mongoose.model('User', userSchema);

export default User;