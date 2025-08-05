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
  },
  createdAt: {
    type:String
  },
  unreadCounts: {
    type: [
      {
        user: { type: String, required: true }, // email
        count: { type: Number, default: 0 }
      }
    ],
    default: []
  }
}, { timestamps: true });

chatSchema.index({ chatId: 1 });

export const Chat = mongoose.model("Chat", chatSchema);
