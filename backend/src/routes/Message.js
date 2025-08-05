import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMessagesForId
    ,sendMessageForId
    ,clearUnread,
    clearChat,
    deleteMessage
 } from "../controllers/MessageController.js";

const router=express.Router();

router.get('/inbox/:id/messages', authMiddleware, getMessagesForId);
router.post('/send/:id',authMiddleware,sendMessageForId);
router.patch('/clear/:user',authMiddleware,clearUnread);
router.delete('/clearChat/:id',authMiddleware,clearChat);
router.delete('/deleteMessage/:id',authMiddleware,deleteMessage);

export default router;