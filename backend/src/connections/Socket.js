import { socketMap } from "../index.js";
import { io } from "../index.js";
import { User } from "../models/User.js";
import { Chat } from "../models/ChatData.js";
import { PendingMessage } from "../models/PendingMessage.js";
import { SeenReceipt } from "../models/SeenReceipt.js";
import { generateChatId, queueConversationMessage, toPendingClientMessage, toSeenReceiptPayload } from "../utils/chat.js";
import { ensureDirectConversation } from "../controllers/conversationController.js";

const findUserSocketByEmail = (email) => socketMap.get(email);

const emitToMembers = (members, event, payload, exceptEmail) => {
    members.forEach(member => {
        if (member === exceptEmail) return;
        const socketId = findUserSocketByEmail(member);
        if (socketId) {
            io.to(socketId).emit(event, payload);
        }
    });
};

const handleConversationSend = async (socket, data) => {
    const sender = socket.email;
    const chatId = data.chatId || data.conversationId;
    if (!chatId) return;

    const clientMessageId = String(data.clientMessageId || data.time || data.mid || Date.now());
    const result = await queueConversationMessage({
        chatId,
        sender,
        encryptedFor: data.encryptedFor,
        clientMessageId,
        mid: data.time || data.mid || clientMessageId
    });

    socket.emit("message:accepted", {
        clientMessageId,
        serverId: String(result.message._id),
        chatId
    });

    const senderProfile = await User.findOne({ email: sender }).select("publicKey");
    result.message.pendingRecipients.forEach(member => {
        const socketId = findUserSocketByEmail(member);
        if (socketId) {
            io.to(socketId).emit("message:receive", {
                conversationId: chatId,
                chatId,
                message: toPendingClientMessage(result.message, member, senderProfile?.publicKey || null),
                fromMail: sender
            });
        }
    });
};

const emitPendingMessages = async (socket) => {
    const pendingMessages = await PendingMessage.find({
        pendingRecipients: socket.email
    }).sort({ createdAt: 1 });

    const senderEmails = [...new Set(pendingMessages.map(message => message.sender))];
    const senders = await User.find({ email: { $in: senderEmails } }).select("email publicKey");
    const publicKeyByEmail = new Map(senders.map(sender => [sender.email, sender.publicKey]));

    pendingMessages.forEach(message => {
        socket.emit("message:receive", {
            conversationId: message.chatId,
            chatId: message.chatId,
            message: toPendingClientMessage(message, socket.email, publicKeyByEmail.get(message.sender) || null),
            fromMail: message.sender
        });
    });
};

const activeConversationMembers = (conversation) => {
    return conversation.members.filter(member => !conversation.leftMembers.includes(member));
};

const toSeenPayload = (receipt, conversation = null) => {
    return toSeenReceiptPayload(receipt, conversation ? activeConversationMembers(conversation) : []);
};

const emitPendingSeenReceipts = async (socket) => {
    const receipts = await SeenReceipt.find({ sender: socket.email }).sort({ createdAt: 1 });
    if (!receipts.length) return;

    const chatIds = [...new Set(receipts.map(receipt => receipt.chatId))];
    const conversations = await Chat.find({ chatId: { $in: chatIds } });
    const conversationByChatId = new Map(conversations.map(conversation => [conversation.chatId, conversation]));

    receipts.forEach(receipt => {
        socket.emit("message:seen:update", toSeenPayload(receipt, conversationByChatId.get(receipt.chatId)));
    });

    await SeenReceipt.deleteMany({ _id: { $in: receipts.map(receipt => receipt._id) } });
};

const handleMessageSaved = async (socket, data = {}) => {
    const serverId = data.serverId || data.id;
    if (!serverId) return;

    const pendingMessage = await PendingMessage.findById(serverId);
    if (!pendingMessage || !pendingMessage.pendingRecipients.includes(socket.email)) return;

    pendingMessage.pendingRecipients = pendingMessage.pendingRecipients.filter(
        recipient => recipient !== socket.email
    );
    pendingMessage.deliveredRecipients = [...new Set([
        ...pendingMessage.deliveredRecipients,
        socket.email
    ])];
    pendingMessage.encryptedFor = pendingMessage.encryptedFor.filter(
        entry => entry.userEmail !== socket.email
    );
    pendingMessage.deliveryStatus = pendingMessage.pendingRecipients.length ? "partial" : "delivered";

    const allDelivered = pendingMessage.pendingRecipients.length === 0;
    const senderSocketId = findUserSocketByEmail(pendingMessage.sender);
    if (senderSocketId) {
        io.to(senderSocketId).emit("message:delivered", {
            serverId: String(pendingMessage._id),
            clientMessageId: pendingMessage.clientMessageId,
            chatId: pendingMessage.chatId,
            deliveredTo: socket.email,
            allDelivered
        });
    }

    if (allDelivered) {
        await PendingMessage.deleteOne({ _id: pendingMessage._id });
        return;
    }

    await pendingMessage.save();
};

const mergeSeenReceipt = async ({ chatId, serverId, clientMessageId, sender, seenBy }) => {
    const query = {
        chatId,
        sender,
        serverId: serverId || null,
        clientMessageId: clientMessageId || null
    };
    const existing = await SeenReceipt.findOne(query);
    if (existing) {
        existing.seenBy = [...new Set([...existing.seenBy, ...seenBy])];
        await existing.save();
        return existing;
    }

    return SeenReceipt.create({
        ...query,
        seenBy: [...new Set(seenBy)],
        createdAt: String(Date.now())
    });
};

const handleMessageSeen = async (socket, data = {}) => {
    const chatId = data.chatId;
    const messages = Array.isArray(data.messages) ? data.messages : [];
    if (!chatId || !messages.length) return;

    const conversation = await Chat.findOne({ chatId });
    const activeMembers = conversation ? activeConversationMembers(conversation) : [];
    if (!conversation || !activeMembers.includes(socket.email)) return;

    for (const message of messages) {
        const sender = message.sender;
        if (!sender || sender === socket.email || !activeMembers.includes(sender)) continue;

        const receipt = {
            chatId,
            serverId: message.serverId || null,
            clientMessageId: message.clientMessageId || null,
            sender,
            seenBy: [socket.email],
            createdAt: String(Date.now())
        };
        const senderSocketId = findUserSocketByEmail(sender);
        if (senderSocketId) {
            io.to(senderSocketId).emit("message:seen:update", toSeenPayload(receipt, conversation));
        } else {
            await mergeSeenReceipt(receipt);
        }
    }
};

export const socketActions = (socket) => {
    User.findOneAndUpdate(
        { email: socket.email },
        { status: "online", lastSeen: null },
        { new: true }
    ).catch(error => console.error("Failed to mark socket user online", error));

    emitPendingMessages(socket).catch(error => {
        socket.emit("message:error", { message: error.message || "Unable to load pending messages" });
    });

    emitPendingSeenReceipts(socket).catch(error => {
        socket.emit("message:error", { message: error.message || "Unable to load seen receipts" });
    });

    socket.on("message:send", async (data) => {
        try {
            await handleConversationSend(socket, data);
        } catch (error) {
            socket.emit("message:error", { message: error.message || "Unable to send message" });
        }
    });

    socket.on("message:saved", async (data) => {
        try {
            await handleMessageSaved(socket, data);
        } catch (error) {
            socket.emit("message:error", { message: error.message || "Unable to acknowledge message" });
        }
    });

    socket.on("message:seen", async (data) => {
        try {
            await handleMessageSeen(socket, data);
        } catch (error) {
            socket.emit("message:error", { message: error.message || "Unable to acknowledge seen messages" });
        }
    });

    socket.on("send", async (data) => {
        try {
            const sender = socket.email;
            const sendTo = data.sendTo;
            if (!sendTo) return;

            const conversation = await ensureDirectConversation(sender, sendTo);
            await handleConversationSend(socket, {
                chatId: conversation.chatId,
                encryptedFor: data.encryptedFor,
                clientMessageId: data.clientMessageId || data.time,
                time: data.time
            });
        } catch (error) {
            socket.emit("message:error", { message: error.message || "Unable to send message" });
        }
    });

    socket.on("typing:start", async (data) => {
        const chatId = data.chatId || data.conversationId;
        const conversation = await Chat.findOne({ chatId });
        if (!conversation || !conversation.members.includes(socket.email)) return;

        const activeMembers = conversation.members.filter(
            member => !conversation.leftMembers.includes(member)
        );
        emitToMembers(activeMembers, "typing", { from: socket.email, chatId }, socket.email);
    });

    socket.on("typing", async (data) => {
        const sendTo = data.to;
        if (!sendTo) return;
        const chatId = generateChatId(socket.email, sendTo);
        const socketId = findUserSocketByEmail(sendTo);
        if (socketId) {
            io.to(socketId).emit("typing", { from: socket.email, chatId });
        }
    });

    socket.on("deleted", (data) => {
        const emitTo = data.to;
        if (!emitTo) return;
        const socketId = findUserSocketByEmail(emitTo);
        if (socketId) {
            io.to(socketId).emit("deletedId", { id: data.id });
        }
    });

    socket.on("disconnect", async () => {
        if (socketMap.get(socket.email) === socket.id) {
            socketMap.delete(socket.email);
            await User.findOneAndUpdate(
                { email: socket.email },
                { status: "offline", lastSeen: Date.now() },
                { new: true }
            );
        }
    });
};
