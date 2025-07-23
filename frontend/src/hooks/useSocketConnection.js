import { useEffect,useState } from "react";
import toast from "react-hot-toast";
import { connectSocket } from '../socket.js';
// import socket from "../socket";// adjust the path if needed

export const useSocketConnection = (handleReceive,setSocket) => {
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

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("recieve",onRecieve)
  
      // Cleanup
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
      };
    }, []);
};
