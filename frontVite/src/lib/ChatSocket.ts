import { io, Socket } from "socket.io-client";

let chatSocket: Socket | null = null;

export function connectChatSocket(baseURL: string, rawJwtToken: string) {
  if (chatSocket) return chatSocket;
  // IMPORTANTE: envia só o token CRU (sem "Bearer ")
  chatSocket = io(baseURL, {
    transports: ["websocket"],
    autoConnect: true,
    auth: { token: rawJwtToken },
  });
  return chatSocket;
}

export function getChatSocket(): Socket | null {
  return chatSocket;
}
