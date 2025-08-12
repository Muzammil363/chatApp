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
        console.log("data: ",data)
        const chatId = generateChatId(sender, sendTo);
        const lastMessage = {
            message: data.message,
            sender: sender,
        };
        
        await Messages.create({
            chatId,
            mid:data.time,
            sender,
            message: data.message,
            createdAt: data.time
        });
        
        const existingChat = await Chat.findOne({ chatId });
        
        if (existingChat) {
            const counts = existingChat.unreadCounts;
            for(let i=0;i<counts.length;i++) {
                if(counts[i].user==sendTo) {
                    counts[i].count+=1;
                }
            }
            
            await Chat.updateOne(
                { chatId:chatId },
                { $set: { lastMessage:lastMessage, unreadCounts: counts , createdAt:data.time } }
            );
        } else {
            const counts = []
            counts.push({user:sender,count:0})
            counts.push({user:sendTo,count:1})
            
            await Chat.create({
                chatId,
                members: [sender, sendTo],
                lastMessage, 
                createdAt: data.time,
                unreadCounts: counts
            });
        }
    } catch (error) {
        console.error("Error in saveMessage:", error);
    }
};
