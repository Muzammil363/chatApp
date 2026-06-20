import mongoose from "mongoose";

const pendingMessageSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        index: true
    },
    clientMessageId: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    encryptedFor: {
        type: [
            {
                userEmail: { type: String, required: true },
                ciphertext: { type: String, required: true }
            }
        ],
        default: []
    },
    pendingRecipients: {
        type: [String],
        default: [],
        index: true
    },
    deliveredRecipients: {
        type: [String],
        default: []
    },
    deliveryStatus: {
        type: String,
        enum: ["accepted", "partial", "delivered"],
        default: "accepted"
    },
    createdAt: {
        type: String,
        required: true
    }
});

pendingMessageSchema.index({ sender: 1, clientMessageId: 1 });
pendingMessageSchema.index({ pendingRecipients: 1, createdAt: 1 });

export const PendingMessage = mongoose.model("PendingMessage", pendingMessageSchema);
