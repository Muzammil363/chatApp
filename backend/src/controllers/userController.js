import cloudinary from '../connections/cloudinary.js'
import { User } from '../models/User.js';
import { Contacts } from '../models/Contacts.js'
import { Request } from '../models/Requests.js';
import { generateChatId } from '../utils/chat.js'
import { Chat } from '../models/ChatData.js';
import moment from "moment"
import { Messages } from '../models/Messages.js';
import { ensureDirectConversation } from './conversationController.js';

export const profile = async (req, res) => {
    let user = await User.findOne({ email: req.user }).select('email fullName profilePic');

    if (user) {
        return res.status(200).json({ profile: user, message: "Fetched Profile" });
    }
    return res.status(404).json({ message: "User not found" });
}

export const updateProfile = async (req, res) => {
    const { fullName, profilePic } = req.body;

    if (fullName) {
        try {
            let updatedUser = await User.findOneAndUpdate({ email: req.user }, { fullName: fullName }, { new: true });
            return res.status(200).json({ message: "Profile updated successfully" });
        } catch (err) {
            return res.status(500).json({ message: "error in updating fullName" })
        }
    }

    if (profilePic) {
        try {
            let response = await User.findOneAndUpdate({ email: req.user }, { profilePic: profilePic }, { new: true });
            return res.status(200).json({ messsage: "updated profile successfully" });
        } catch (error) {
            console.error("error in updateProfile: ", error);
            return res.status(500).json({ message: "Error in updating profile" });
        }
    }
}

export const getContacts = async (req, res) => {
    try {
        const loggedIn = req.user;

        const contactDocs = await Contacts.find({ user: loggedIn });
        let contactEmails = contactDocs.map(contact => contact.contact);

        const contacts = await User.find({ email: { $in: contactEmails } })
            .select('email fullName profilePic status lastSeen publicKey');

        let emailToChatId = {}; // chatId , email
        let chatIdList = [];
        contactDocs.forEach(doc => {
            emailToChatId[doc.contact] = doc.chatId;
            chatIdList.push(doc.chatId);
        })

        let lastMessagesList = await Chat.find({ chatId: { $in: chatIdList } }); // docs of chatId , members , lastMessage , unreads

        let lastMsg = {}; // chatId ,a doc from  lastMessageList
        lastMessagesList.forEach(msg => {
            lastMsg[msg.chatId] = msg; // store message and unread count
        })

        const data = contacts.map(contact => {
            const chatId = emailToChatId[contact.email];
            const lm = lastMsg[chatId] ? lastMsg[chatId].lastMessage.message : null;
            const unreadMap = lastMsg[chatId] ? lastMsg[chatId].unreadCounts : []
            let createdAt = lastMsg[chatId] ? lastMsg[chatId].createdAt : null;

            return ({
                email: contact.email,
                type: "direct",
                fullName: contact.fullName,
                name: contact.fullName,
                profilePic: contact.profilePic,
                publicKey: contact.publicKey,
                online: contact.status === "online" ? true : false,
                lastSeen: contact.status === "offline" ? moment(contact.lastSeen).fromNow() : null,
                chatId: chatId,
                lastMessage: lm,
                createdAt: createdAt,
                unread: unreadMap.find(u => u.user == loggedIn)?.count || 0
            })
        }
        );
        data.sort((a, b) => {
            const tA = a.lastMessage ? new Date(a.createdAt).getTime() : 0;
            const tB = b.lastMessage ? new Date(b.createdAt).getTime() : 0;
            return tB - tA;
        });

        return res.status(200).json({ contacts: data, message: "Fetched contacts" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "sever side error while fetching contacts" });
    }
}

export const fetchFor = async (req, res) => {
    let loggedIn = req.user;
    try {
        const findBy = req.params.id;
        const users = await User.find({
            $or: [
                { fullName: new RegExp(`^${findBy}$`, 'i') },
                { email: new RegExp(`^${findBy}$`, 'i') }
            ]
        }).select('email fullName profilePic');

        const result = users.filter(u => u.email !== loggedIn);
        return res.status(200).json({ result: result });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server side error while fetching for" + req.params.id })
    }
};

export const suggestUsers = async (req, res) => {
    const loggedIn = req.user;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 20);

    try {
        const [contacts, sentRequests, receivedRequests] = await Promise.all([
            Contacts.find({ user: loggedIn }).select("contact"),
            Request.find({ sentBy: loggedIn }).select("user"),
            Request.find({ user: loggedIn }).select("sentBy")
        ]);

        const excludedEmails = new Set([
            loggedIn,
            ...contacts.map(contact => contact.contact),
            ...sentRequests.map(request => request.user),
            ...receivedRequests.map(request => request.sentBy)
        ]);

        const users = await User.find({ email: { $nin: [...excludedEmails] } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("email fullName profilePic");

        return res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server side error while fetching suggestions" });
    }
};

export const fetchRequests = async (req, res) => {
    const loggedIn = req.user;
    try {
        const reqs = await Request.find({ user: loggedIn });
        const sentByEmails = reqs.map(r => r.sentBy);
        // Fetch all sender profiles in one query
        const users = await User.find({ email: { $in: sentByEmails } })
            .select('email fullName profilePic');

        //Fetch all sent requests 
        const sentReq = await Request.find({ sentBy: loggedIn });
        const sentToEmail = sentReq.map(r => r.user);

        const sentTousers = await User.find({ email: { $in: sentToEmail } })
            .select('email fullName profilePic');

        return res.status(200).json({
            requests: users,
            sentReq: sentTousers,
            message: "Fetched requests successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Sever side error while finding request" })
    }
}

export const sendRequest = async (req, res) => {
    const loggedIn = req.user;  // this user sends to 
    const sendTo = req.body.email // this user
    try {
        if (loggedIn === sendTo) {
            return res.status(400).json({ message: "Cannot send request to yourself" });
        }
        let user = await User.findOne({ email: sendTo }); // to user
        // check this user
        if (user) {
            const existingContact = await Contacts.findOne({ user: loggedIn, contact: sendTo });
            if (existingContact) {
                return res.status(409).json({ message: "Contact already exists" });
            }
            const existingRequest = await Request.findOne({ user: sendTo, sentBy: loggedIn });
            if (existingRequest) {
                return res.status(409).json({ message: "Request already sent" });
            }
            await Request.create({ user: sendTo, sentBy: loggedIn });
            return res.status(200).json({ message: "Sent request successfully" });
        }
        else {
            return res.status(404).json({ message: "User not found!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Sever side error while sending request" })
    }
}

export const acceptRequest = async (req, res) => {
    try {
        const loggedIn = req.user; // email
        const acceptFor = req.params.id; // email , this user sent to loggedIn user

        // add acceptFor in contacts list of loggedIn user and 
        // add loggedIn in contacts list for acceptFor user

        let acceptForUser = await User.findOne({ email: acceptFor });
        if (!acceptForUser) {
            return res.status(404).json({ message: "User not found with given email" });
        }

        const exists = await Contacts.findOne({ user: loggedIn, contact: acceptFor });
        if (exists) {
            return res.status(409).json({ message: "Contact already exists" });
        }

        const chatId = generateChatId(loggedIn, acceptFor);
        await Promise.all([
            Contacts.create({ user: loggedIn, contact: acceptFor, chatId }),
            Contacts.create({ user: acceptFor, contact: loggedIn, chatId }),
            ensureDirectConversation(loggedIn, acceptFor),
        ]);

        await Request.deleteOne({ user: loggedIn, sentBy: acceptFor });
        return res.status(200).json({ message: "Accepted request successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server side error while accepting request" })
    }
}

export const deleteRequest = async (req, res) => {
    const loggedIn = req.user;
    const reject = req.params.id; // email of request to be deleted

    try {
        let rejectUser = await User.findOne({ email: reject });
        if (!rejectUser) {
            return res.status(404).json({ message: "User not found" });
        }

        await Request.deleteOne({ user: loggedIn, sentBy: reject });
        return res.status(200).json({ message: "Declined user request" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server side error while declining request" });
    }

}

export const cancelRequest = async (req, res) => {
    const loggedIn = req.user; // this user sent to --> sentBy=loggedIn
    const cancelTo = req.params.id; // this user so --> user=cancelTo

    try {
        await Request.deleteOne({ user: cancelTo, sentBy: loggedIn });
        return res.status(200).json({ message: "Canceled Request successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server side error while canceling request" });
    }
}


export const deleteContact = async (req, res) => {
    try {
        const loggedIn = req.user;
        const toDelete = req.params.id;
        const chatId=generateChatId(loggedIn,toDelete);
    let del = await Contacts.deleteMany({
        $or: [
            { user: loggedIn, contact: toDelete },
            { user: toDelete, contact: loggedIn }
        ]
    });
    await Chat.deleteOne({chatId:chatId});
    await Messages.deleteMany({chatId:chatId});
    return res.status(200).json({message:"deleted succesfully"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({message:"server side error while deleting"});
    }
}
