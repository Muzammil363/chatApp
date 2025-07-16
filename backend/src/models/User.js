import mongoose from "mongoose";

mongoose.connect('mongodb://127.0.0.1:27017/chatApp');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    fullName: {
        type: String,
        required: true,
        default: 'newUser'
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profilePic: {
        type: String,
        default: ""
    },
    lastSeen: {
        type:Date
    },
    status: {
        type:String,
        default:"offline"
    }
},
    { timestamps: true }
)

userSchema.index({email:1});
export const User=mongoose.model("User",userSchema);

