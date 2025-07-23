import { socketMap } from "../index.js";
import { io } from "../index.js";

const findUserSocketByEmail=(find)=>{
    for(const [email,id] of socketMap.entries()) {
        if(email==find) {
            return id;
        }
    }
}

export const socketActions = (socket) => {
    socket.on("connect", () => {
        console.log("updated socket map on connect", socketMap);
    })

    socket.on("send",(data)=>{
        console.log(data);
        let sendTo=data.sendTo;
        let message=data.message;
        if(sendTo && message) {
            let socketId=findUserSocketByEmail(sendTo);
            console.log("emitting to client",socketId);
            io.to(socketId).emit("recieve",{message:message,fromMail:socket.email});
        }
    })

    socket.on("disconnect", () => {
        for (const [email, id] of socketMap.entries()) {
            if (id === socket.id) {
                socketMap.delete(email);
                break; 
            }
        }
        console.log("updated socket map on disconnect", socketMap);
    });

    socket.on("client", (data) => {
        console.log("received data: ", data);
    })
}