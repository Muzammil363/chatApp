import cloudinary from '../connections/cloudinary.js';
import { Messages } from '../models/Messages.js'
import { User } from '../models/User.js';
import { generateChatId } from '../utils/chat.js';
import { Chat } from '../models/ChatData.js';

export const getMessagesForId = async (req, res) => {
    const { id: email } = req.params;
    const { cursor, limit = 20 } = req.query;
    console.log("id , cursor,limit: ", email, cursor, limit);
    try {
        const chatId = generateChatId(email, req.user);
        const query = { chatId };
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const messages = await Messages.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit));
        console.log(`messages for ${email}`, messages);
        return res.status(200).json({
            messages,
            nextCursor: messages.length ? messages[messages.length - 1]._id : null,
        })
    } catch (err) {
        res.status(500).json({ error: 'Failed to load messages' });
    }
};


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
                receiverEmail: sendTo,
                text: text,
                image: imageUrl
            }
        );

        // realtime function calls to be done here

        return res.status(200).json({ message: "Message sent successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server side error while sending message" });
    }
}


export const clearUnread = async (req, res) => {
    try {
        const clearTo = req.params.user;
        const currentUser = req.user;
        const chatId = generateChatId(clearTo, currentUser);

        const chat = await Chat.findOne({ chatId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }
        const updatedUnreadCounts = chat.unreadCounts.map(entry => {
            if (entry.user === currentUser) {
                return { ...entry, count: 0 };
            }
            return entry;
        });
        chat.unreadCounts = updatedUnreadCounts;
        await chat.save();
        return res.status(200).json({ message: "Unread count cleared" });
    } catch (err) {
        return res.status(500).json({ message: "Sever side error while clearing unread" });
    }
};

export const clearChat = async (req, res) => {
    try {
        const loggedIn = req.user;
        const email = req.params.id;
        const chatId = generateChatId(email, loggedIn);
        console.log("chat id generated to clear: ", chatId);

        let clear = await Messages.deleteMany({ chatId });
        return res.status(200).json({ message: "deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server side error" });
    }
}

export const deleteMessage = async (req, res) => {
    try {
        const id = req.params.id;
        let message=await Messages.findOne({_id:id});
        if(message && message.sender!== req.user) {
            return res.status(403).json({msg:"Forbidden"})
        }
        let del = await Messages.deleteOne({ _id: id});
        return res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server side error while deleting message" });
    }
}