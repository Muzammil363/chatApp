import mongoose from "mongoose";

const seenReceiptSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        index: true
    },
    serverId: {
        type: String,
        default: null
    },
    clientMessageId: {
        type: String,
        default: null
    },
    sender: {
        type: String,
        required: true,
        index: true
    },
    seenBy: {
        type: [String],
        default: []
    },
    createdAt: {
        type: String,
        required: true
    }
});

seenReceiptSchema.index({ sender: 1, chatId: 1, serverId: 1, clientMessageId: 1 });

export const SeenReceipt = mongoose.model("SeenReceipt", seenReceiptSchema);
