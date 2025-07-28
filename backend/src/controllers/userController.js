import cloudinary from '../connections/cloudinary.js'
import { User } from '../models/User.js';
import { Contacts } from '../models/Contacts.js'
import { Request } from '../models/Requests.js';
import { generateChatId } from '../utils/chat.js'
import { Chat } from '../models/ChatData.js';
import moment from "moment"

export const profile = async (req, res) => {
    console.log("req.user in profile: ", req.user); // email

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
            console.log("req.user: ", req.user);
            let updatedUser = await User.findOneAndUpdate({ email: req.user }, { fullName: fullName }, { new: true });
            console.log("updated user");
            return res.status(200).json({ message: "Profile updated successfully" });
        } catch (err) {
            return res.status(500).json({ message: "error in updating fullName" })
        }
    }

    if (profilePic) {
        try {
            console.log("req.user in profile update: ", req.user);
            let response =await User.findOneAndUpdate({email:req.user},{profilePic:profilePic},{new:true});
            console.log("updated profile: ",response);
            return res.status(200).json({ messsage: "updated profile successfully" });
        } catch (error) {
            console.log("error in updateProfile: ", error);
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

        let emailToChatId = {};
        let chatIdList = [];
        contactDocs.forEach(doc => {
            emailToChatId[doc.contact] = doc.chatId;
            chatIdList.push(doc.chatId);
        })

        let lastMessagesList = await Chat.find({ chatId: { $in: chatIdList } });

        let lastMsg = {};
        lastMessagesList.forEach(msg => {
            lastMsg[msg.chatId] = msg;
        })
        const data = contacts.map(contact => {
            const chatId = emailToChatId[contact.email]
            return ({
                email: contact.email,
                fullName: contact.fullName,
                profilePic: contact.profilePic,
                publicKey:contact.publicKey,
                online:contact.status==="online"?true:false,
                lastSeen:contact.status==="offline"?moment(contact.lastSeen).fromNow():null,
                chatId: emailToChatId[contact.email],
                lastMessage: lastMsg[chatId]
            })
        }
        );

        data.sort((a, b) => {
            const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return tB - tA;
        });

        return res.status(200).json({ contacts: data, message: "Fetched contacts" });
    } catch (error) {
        console.log(error);
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
        console.log(error);
        return res.status(500).json({ message: "Server side error while fetching for" + req.params.id })
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

        console.log(sentTousers);
        return res.status(200).json({
            requests: users,
            sentReq: sentTousers,
            message: "Fetched requests successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Sever side error while finding request" })
    }
}

export const sendRequest = async (req, res) => {
    const loggedIn = req.user;  // this user sends to 
    const sendTo = req.body.email // this user
    try {
        let user = await User.findOne({ email: sendTo }); // to user
        // check this user
        if (user) {
            console.log("Sending request from " + loggedIn + " to " + sendTo);
            await Request.insertOne({ user: sendTo, sentBy: loggedIn });
            return res.status(200).json({ message: "Sent request successfully" });
        }
        else {
            return res.status(404).json({ message: "User not found!" });
        }
    } catch (error) {
        console.log(error);
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
        ]);

        await Request.deleteOne({ user: loggedIn, sentBy: acceptFor });
        return res.status(200).json({ message: "Accepted request successfully" });
    } catch (error) {
        console.log(error);
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