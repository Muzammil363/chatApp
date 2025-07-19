import { io } from "socket.io-client";

export function connectSocket(token) {
  return io("http://localhost:3000", {
    auth: { token },
    transports: ["websocket"],
    withCredentials: true,
  });
}

export default connectSocket;