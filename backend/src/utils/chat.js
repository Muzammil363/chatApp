import { Messages } from "../models/Messages.js";
import { Chat } from "../models/ChatData.js";

export const generateChatId = (user1, user2) => {
    return [user1, user2].sort().join('_');
}


export const saveMessage = async (sender, sendTo, data) => {
    try {
        if (!sender || !sendTo || !data?.message || !data?.time) {
            console.log("Missing required fields.");
            return;
        }

        const chatId = generateChatId(sender, sendTo);
        const lastMessage = {
            message: data.message,
            sender: sender,
            createdAt: data.time
        };

        await Messages.create({
            chatId,
            sender,
            message: data.message,
            createdAt: data.time
        });

        const existingChat = await Chat.findOne({ chatId });

        if (existingChat) {
            const counts = new Map(existingChat.unreadCounts);
            counts.set(sender, counts.get(sender) || 0);
            counts.set(sendTo, (counts.get(sendTo) || 0) + 1);

            await Chat.updateOne(
                { chatId:chatId },
                { $set: { lastMessage:lastMessage, unreadCounts: counts } }
            );
        } else {
            const counts = new Map();
            counts.set(sender, 0);
            counts.set(sendTo, 1);

            await Chat.create({
                chatId,
                members: [sender, sendTo],
                lastMessage,
                unreadCounts: counts
            });
        }
    } catch (error) {
        console.error("Error in saveMessage:", error);
    }
};
