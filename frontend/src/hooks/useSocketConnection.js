import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { connectSocket } from '../socket.js';

export const useSocketConnection = (
  handleStopTyping,
  handleTypingReceive,
  handleReceive,
  setSocket,
  handleDeletedMessage
) => {
  const handlersRef = useRef({
    handleStopTyping,
    handleTypingReceive,
    handleReceive,
    setSocket,
    handleDeletedMessage
  });

  useEffect(() => {
    handlersRef.current = {
      handleStopTyping,
      handleTypingReceive,
      handleReceive,
      setSocket,
      handleDeletedMessage
    };
  }, [handleStopTyping, handleTypingReceive, handleReceive, setSocket, handleDeletedMessage]);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      handlersRef.current.setSocket(socket);
    };

    const onDisconnect = () => {
      handlersRef.current.setSocket(null);
    };

    const onReceive = (data) => {
      handlersRef.current.handleReceive(data);
    };

    const onTyping = (data) => {
      handlersRef.current.handleTypingReceive(data);
    };

    const onStopTyping = (data) => {
      handlersRef.current.handleStopTyping(data.from);
    };

    const onDeletedId = (data) => {
      handlersRef.current.handleDeletedMessage(data.id);
    };

    const onMessageError = (data = {}) => {
      toast.error(data.message || data.error || 'Message could not be sent');
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("recieve", onReceive);
    socket.on("message:receive", onReceive);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("deletedId", onDeletedId);
    socket.on("message:error", onMessageError);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("recieve", onReceive);
      socket.off("message:receive", onReceive);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("deletedId", onDeletedId);
      socket.off("message:error", onMessageError);
      socket.disconnect();
    };
  }, []);
};
