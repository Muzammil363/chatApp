import { socketMap } from "../index.js";
import { io } from "../index.js";
import { User } from "../models/User.js";
import { saveMessage } from "../utils/chat.js";

const findUserSocketByEmail = (find) => {
    for (const [email, id] of socketMap.entries()) {
        if (email == find) {
            return id;
        }
    }
}

export const socketActions = (socket) => {
    socket.on("connect", async () => {
        const user = await User.findOneAndUpdate(
            { email: socket.email },
            { status: "online" },
            { lastSeen:null},
            { new: true }
        )
        console.log("updated socket map on connect", socketMap);
    })

    socket.on("send", async (data) => {
        console.log(data);
        let sendTo = data.sendTo;
        const sender = socket.email;
        let message = data.message;
        if (sendTo && message) {
            let socketId = findUserSocketByEmail(sendTo);
            io.to(socketId).emit("recieve", { message: message, fromMail: socket.email });
        }
        await saveMessage(sender,sendTo,data);
    })

    socket.on("typing", (data) => {
        let emitTo = data.to;
        const sender = socket.email;
        if (data) {
            let socketId = findUserSocketByEmail(emitTo);
            io.to(socketId).emit("typing", { from: sender });
        }
    });

    socket.on("disconnect", async () => {
        for (const [email, id] of socketMap.entries()) {
            if (id === socket.id) {
                socketMap.delete(email);
                const user = await User.findOneAndUpdate(
                    { email: email },
                    { status: "offline" },
                    { lastSeen: Date.now() },
                    { new: true }
                )
                console.log("Updated last seen: ", user);
                break;
            }
        }

        console.log("updated socket map on disconnect", socketMap);
    });

}