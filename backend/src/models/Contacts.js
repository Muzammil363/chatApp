import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    contact: {
        type: String,
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    chatId:{
        type:String,
        required:true,
    }
});

ContactSchema.index({user:1});
ContactSchema.index({user:1 , contact:1});
export const Contacts=mongoose.model("Contact",ContactSchema);