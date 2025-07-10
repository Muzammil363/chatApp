import cloudinary from '../connections/cloudinary.js';
import { Messages } from '../models/Messages.js'
import { User } from '../models/User.js';

export const getMessagesForId = async (req, res) => {
    const email = req.params.id; // fetch Conversations with 
    const loggedUser = req.user; // email for currently logged user
    const page=req.body;
    if(!page) {
        return res.status(400).json({message:"Invalid page to fetch conversation"});
    }

    try {
        let user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let messages = await Messages.find({
            $or: [
                { senderEmail: email, receiverEmail: loggedUser },
                { senderEmail: loggedUser, receiverEmail: email }
            ]
        }).sort( {createdAt: -1} ).limit(50).skip(page*50);

        return res.status(200).json({ message: "fetched Conversation", messages: messages });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "server side error while fetching conversations" });
    }
}

export const sendMessageForId = async (req, res) => {
    const sendTo = req.params.id; // receiver email
    const sentBy = req.user; // sender email
    const { text, image } = req.body;

    if (!text && !image) {
        return res.status(400).json({ message: "Message Cannot be empty" });
    }
    try {
        let imageUrl;
        if (image) {
            let uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Messages.insertOne(
            {
                senderEmail: sentBy,
                receiverEmail:sendTo,
                text:text,
                image:imageUrl
            }
        );

        // realtime function calls to be done here

        return res.status(200).json({message:"Message sent successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server side error while sending message" });
    }
}