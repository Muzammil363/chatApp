export const socketActions = (socket) => {
    socket.on("connect",()=>{
        console.log("socket connected");
    })
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });

    socket.on("client",(data)=>{
        console.log("received data: ",data);
    })
}