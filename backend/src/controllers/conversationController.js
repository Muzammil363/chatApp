import { randomUUID } from "crypto";
import { Chat } from "../models/ChatData.js";
import { Contacts } from "../models/Contacts.js";
import { Messages } from "../models/Messages.js";
import { User } from "../models/User.js";
import { assertConversationMember, generateChatId, saveConversationMessage, toClientMessage } from "../utils/chat.js";

const buildLastMessagePreview = async (chatId, currentUser) => {
    const latestMessage = await Messages.findOne({ chatId }).sort({ _id: -1 });
    if (!latestMessage) return null;

    const sender = await User.findOne({ email: latestMessage.sender }).select("publicKey");
    const clientMessage = toClientMessage(latestMessage, currentUser);

    return {
        sender: clientMessage.sender,
        message: clientMessage.message,
        createdAt: clientMessage.createdAt,
        senderPublicKey: sender?.publicKey || null
    };
};

const buildDirectConversation = async (currentUser, contactDoc) => {
    const contact = await User.findOne({ email: contactDoc.contact })
        .select("email fullName profilePic status lastSeen publicKey");
    if (!contact) return null;

    let chat = await Chat.findOne({ chatId: contactDoc.chatId });
    if (!chat) {
        chat = await Chat.create({
            chatId: contactDoc.chatId,
            type: "direct",
            members: [currentUser, contactDoc.contact],
            unreadCounts: [
                { user: currentUser, count: 0 },
                { user: contactDoc.contact, count: 0 }
            ]
        });
    }
    const unread = chat?.unreadCounts?.find(entry => entry.user === currentUser)?.count || 0;
    const lastMessage = await buildLastMessagePreview(chat.chatId, currentUser);

    return {
        type: "direct",
        chatId: contactDoc.chatId,
        email: contact.email,
        fullName: contact.fullName,
        name: contact.fullName,
        profilePic: contact.profilePic,
        publicKey: contact.publicKey,
        online: contact.status === "online",
        lastSeen: contact.lastSeen,
        members: [currentUser, contact.email],
        lastMessage,
        createdAt: lastMessage?.createdAt || chat?.createdAt || null,
        unread
    };
};

export const getConversations = async (req, res) => {
    try {
        const currentUser = req.user;
        const contacts = await Contacts.find({ user: currentUser });
        const directConversations = (await Promise.all(
            contacts.map(contact => buildDirectConversation(currentUser, contact))
        )).filter(Boolean);

        const groupChats = await Chat.find({
            type: "group",
            members: currentUser,
            leftMembers: { $ne: currentUser }
        });

        const groups = await Promise.all(groupChats.map(async group => {
            const activeMembers = group.members.filter(member => !group.leftMembers.includes(member));
            const lastMessage = await buildLastMessagePreview(group.chatId, currentUser);

            return {
                type: "group",
                chatId: group.chatId,
                name: group.name,
                fullName: group.name,
                profilePic: "",
                members: activeMembers,
                memberCount: activeMembers.length,
                lastMessage,
                createdAt: lastMessage?.createdAt || group.createdAt || null,
                unread: group.unreadCounts?.find(entry => entry.user === currentUser)?.count || 0
            };
        }));

        const conversations = [...directConversations, ...groups].sort((a, b) => {
            const tA = a.createdAt ? Number(new Date(a.createdAt)) || Number(a.createdAt) : 0;
            const tB = b.createdAt ? Number(new Date(b.createdAt)) || Number(b.createdAt) : 0;
            return tB - tA;
        });

        return res.status(200).json({ conversations });
    } catch (error) {
        console.error("Failed to get conversations", error);
        return res.status(500).json({ message: "Server side error while fetching conversations" });
    }
};

export const createGroup = async (req, res) => {
    try {
        const currentUser = req.user;
        const { name, memberEmails = [] } = req.body;
        const groupName = String(name || "").trim();
        const uniqueMembers = [...new Set([currentUser, ...memberEmails])];

        if (!groupName) {
            return res.status(400).json({ message: "Group name is required" });
        }
        if (uniqueMembers.length < 2) {
            return res.status(400).json({ message: "Select at least one group member" });
        }

        const users = await User.find({ email: { $in: uniqueMembers } }).select("email");
        if (users.length !== uniqueMembers.length) {
            return res.status(400).json({ message: "One or more users do not exist" });
        }

        const chat = await Chat.create({
            chatId: `group_${randomUUID()}`,
            type: "group",
            name: groupName,
            createdBy: currentUser,
            members: uniqueMembers,
            unreadCounts: uniqueMembers.map(user => ({ user, count: 0 }))
        });

        return res.status(201).json({ message: "Group created", conversation: chat });
    } catch (error) {
        console.error("Failed to create group", error);
        return res.status(500).json({ message: "Server side error while creating group" });
    }
};

export const getGroupMembers = async (req, res) => {
    try {
        const conversation = await Chat.findOne({ chatId: req.params.id, type: "group" });
        if (!assertConversationMember(conversation, req.user)) {
            return res.status(404).json({ message: "Group not found" });
        }

        const activeMembers = conversation.members.filter(member => !conversation.leftMembers.includes(member));
        const members = await User.find({ email: { $in: activeMembers } })
            .select("email fullName profilePic publicKey status lastSeen");

        return res.status(200).json({ members });
    } catch (error) {
        console.error("Failed to get group members", error);
        return res.status(500).json({ message: "Server side error while fetching group members" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const conversation = await Chat.findOne({ chatId: req.params.id, type: "group" });
        if (!assertConversationMember(conversation, req.user)) {
            return res.status(404).json({ message: "Group not found" });
        }

        conversation.leftMembers = [...new Set([...conversation.leftMembers, req.user])];
        conversation.unreadCounts = conversation.unreadCounts.filter(entry => entry.user !== req.user);
        await conversation.save();

        return res.status(200).json({ message: "Left group" });
    } catch (error) {
        console.error("Failed to leave group", error);
        return res.status(500).json({ message: "Server side error while leaving group" });
    }
};

export const getConversationMessages = async (req, res) => {
    try {
        const { cursor, limit = 20 } = req.query;
        let conversation = await Chat.findOne({ chatId: req.params.id });
        if (!conversation) {
            const directContact = await Contacts.findOne({ user: req.user, chatId: req.params.id });
            if (directContact) {
                conversation = await ensureDirectConversation(req.user, directContact.contact);
            }
        }
        if (!assertConversationMember(conversation, req.user)) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const query = { chatId: conversation.chatId };
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const messages = await Messages.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit));

        return res.status(200).json({
            messages: messages.map(message => toClientMessage(message, req.user)),
            nextCursor: messages.length ? messages[messages.length - 1]._id : null
        });
    } catch (error) {
        console.error("Failed to get messages", error);
        return res.status(500).json({ message: "Failed to load messages" });
    }
};

export const sendConversationMessage = async (req, res) => {
    try {
        const { encryptedFor, message, mid } = req.body;
        const result = await saveConversationMessage({
            chatId: req.params.id,
            sender: req.user,
            encryptedFor,
            message,
            mid
        });

        return res.status(201).json({
            message: "Message sent successfully",
            data: toClientMessage(result.message, req.user)
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({ message: error.message || "Server side error while sending message" });
    }
};

export const ensureDirectConversation = async (userA, userB) => {
    const chatId = generateChatId(userA, userB);
    let chat = await Chat.findOne({ chatId });
    if (!chat) {
        chat = await Chat.create({
            chatId,
            type: "direct",
            members: [userA, userB],
            unreadCounts: [
                { user: userA, count: 0 },
                { user: userB, count: 0 }
            ]
        });
    }
    return chat;
};
