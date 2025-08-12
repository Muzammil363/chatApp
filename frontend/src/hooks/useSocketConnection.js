import { useEffect,useState } from "react";
import toast from "react-hot-toast";
import { connectSocket } from '../socket.js';
// import socket from "../socket";// adjust the path if needed

export const useSocketConnection = (handleStopTyping,handleTypingReceive,handleReceive,setSocket ,handleDeletedMessage) => {
  // const [connected,setConnected]=useState(false);
    useEffect(() => {
      let token = localStorage.getItem("accessToken");
      let socket = connectSocket(token);
      if (socket.connected) {
        console.log("Already connected with socket id:", socket.id);
        // setConnected(true);
      }
  
      const onConnect = () => {
        console.log("Connected with socket id:", socket.id);
        setSocket(socket);
        // setConnected(true);
      };
  
      const onDisconnect = () => {
        console.log("Disconnected from socket.");
        setSocket(null);
        // setConnected(false);
      };
      
      const onRecieve=(data)=>{
        handleReceive(data);
      }

      const onTyping=(data)=>{
        handleTypingReceive(data.from);
      }
      
      const onStopTyping=(data)=>{
        handleStopTyping(data.from)
      }

      const onDeletedId=(data)=>{
        console.log("delete event occured");
        handleDeletedMessage(data.id);
      }

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("recieve",onRecieve);
      socket.on("typing",onTyping);
      socket.on("stop-typing",onStopTyping);
      socket.on("deletedId",onDeletedId);
  
      // Cleanup
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
      };
    }, []);
};
