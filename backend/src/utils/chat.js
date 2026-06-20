import { Messages } from "../models/Messages.js";
import { Chat } from "../models/ChatData.js";
import { PendingMessage } from "../models/PendingMessage.js";

export const generateChatId = (user1, user2) => {
    return [user1, user2].sort().join("_");
};

export const toClientMessage = (message, currentUser) => {
    const userPayload = message.encryptedFor?.find(entry => entry.userEmail === currentUser);
    return {
        _id: message._id,
        chatId: message.chatId,
        mid: message.mid,
        sender: message.sender,
        message: userPayload?.ciphertext || message.message,
        createdAt: message.createdAt
    };
};

export const assertConversationMember = (conversation, email) => {
    return conversation
        && conversation.members.includes(email)
        && !conversation.leftMembers.includes(email);
};

export const toPendingClientMessage = (message, currentUser, senderPublicKey = null) => {
    const userPayload = message.encryptedFor?.find(entry => entry.userEmail === currentUser);
    return {
        serverId: String(message._id),
        clientMessageId: message.clientMessageId,
        chatId: message.chatId,
        sender: message.sender,
        senderPublicKey,
        encryptedPayload: userPayload?.ciphertext || null,
        createdAt: message.createdAt
    };
};

export const toSeenReceiptPayload = (receipt, activeMembers = []) => {
    const activeRecipients = activeMembers.filter(member => member !== receipt.sender);
    const seenBy = receipt.seenBy || [];
    return {
        chatId: receipt.chatId,
        serverId: receipt.serverId,
        clientMessageId: receipt.clientMessageId,
        seenBy,
        allSeen: activeRecipients.length > 0
            && activeRecipients.every(member => seenBy.includes(member))
    };
};

export const queueConversationMessage = async ({ chatId, sender, encryptedFor, clientMessageId, mid }) => {
    const conversation = await Chat.findOne({ chatId });
    if (!assertConversationMember(conversation, sender)) {
        const error = new Error("Conversation not found");
        error.statusCode = 404;
        throw error;
    }

    const activeMembers = conversation.members.filter(member => !conversation.leftMembers.includes(member));
    const recipients = activeMembers.filter(member => member !== sender);
    if (recipients.length === 0) {
        const error = new Error("No active recipients in this conversation");
        error.statusCode = 400;
        throw error;
    }

    const targetPayloads = Array.isArray(encryptedFor)
        ? encryptedFor.filter(entry => recipients.includes(entry.userEmail) && entry.ciphertext)
        : [];

    if (targetPayloads.length !== recipients.length) {
        const error = new Error("Missing encrypted payloads for one or more recipients");
        error.statusCode = 400;
        throw error;
    }

    const createdAt = String(mid || Date.now());
    const pendingMessage = await PendingMessage.create({
        chatId,
        clientMessageId: String(clientMessageId || mid || Date.now()),
        sender,
        encryptedFor: targetPayloads,
        pendingRecipients: targetPayloads.map(entry => entry.userEmail),
        deliveredRecipients: [],
        deliveryStatus: targetPayloads.length ? "accepted" : "delivered",
        createdAt
    });

    conversation.createdAt = createdAt;
    await conversation.save();

    return { conversation, message: pendingMessage };
};

export const saveConversationMessage = async ({ chatId, sender, encryptedFor, message, mid }) => {
    const conversation = await Chat.findOne({ chatId });
    if (!assertConversationMember(conversation, sender)) {
        const error = new Error("Conversation not found");
        error.statusCode = 404;
        throw error;
    }

    const activeMembers = conversation.members.filter(member => !conversation.leftMembers.includes(member));
    const targetPayloads = Array.isArray(encryptedFor)
        ? encryptedFor.filter(entry => activeMembers.includes(entry.userEmail) && entry.ciphertext)
        : [];

    if (!message && targetPayloads.length === 0) {
        const error = new Error("Message cannot be empty");
        error.statusCode = 400;
        throw error;
    }

    const createdAt = String(mid || Date.now());
    const fallbackMessage = message || targetPayloads[0]?.ciphertext;
    const newMessage = await Messages.create({
        chatId,
        mid: new Date(Number(mid) || Date.now()),
        sender,
        message: fallbackMessage,
        encryptedFor: targetPayloads,
        createdAt
    });

    const unreadCounts = activeMembers.map(member => {
        const existing = conversation.unreadCounts.find(entry => entry.user === member);
        return {
            user: member,
            count: member === sender ? 0 : (existing?.count || 0) + 1
        };
    });

    conversation.lastMessage = {
        message: fallbackMessage,
        sender
    };
    conversation.createdAt = createdAt;
    conversation.unreadCounts = unreadCounts;
    await conversation.save();

    return { conversation, message: newMessage };
};
