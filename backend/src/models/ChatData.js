import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  members: {
    type: [String], 
    required: true
  },
  lastMessage: {
    message: String,
    sender: String,
    createdAt: String
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

chatSchema.index({ chatId: 1 });

export const Chat = mongoose.model("Chat", chatSchema);
