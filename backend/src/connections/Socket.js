export const socketActions=(socket)=>{
    console.log("socket id: ",socket.id);
    
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
}