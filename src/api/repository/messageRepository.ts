// src/service/messageService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface ConversationDTO {
  id: number;
  name?: string;
  role?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  participants?: Array<{ id: number; name: string; role?: string }>;
}

export interface MessageDTO {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: { id?: number; name?: string; role?: string };
}

export const getConversations = async (): Promise<ConversationDTO[]> => {
  const res = await API.get("/chats/conversations", getAuthHeaders());
  return res.data;
};

export const createOrGetConversation = async (pai: number, psicologo: number) => {
  const res = await API.post("/chats/conversations", { pai, psicologo }, getAuthHeaders());
  return res.data as ConversationDTO;
};

export const getMessages = async (conversationId: number, limit = 50, before?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = { limit };
  if (before) params.before = before;
  const res = await API.get(`/chats/conversations/${conversationId}/messages`, {
    ...getAuthHeaders(),
    params,
  });
  return res.data as { participants?: ConversationDTO["participants"]; messages: MessageDTO[] } | MessageDTO[];
};

export const postMessage = async (conversationId: number, senderId: number, content: string) => {
  const res = await API.post(
    `/chats/conversations/${conversationId}/messages`,
    { senderId, content },
    getAuthHeaders()
  );
  return res.data as MessageDTO;
};

export const addPsychologistToConversation = async (conversationId: number, psicologoId: number) => {
  const res = await API.post(
    `/chats/conversations/${conversationId}/add-psychologist`,
    { psicologoId },
    getAuthHeaders()
  );
  return res.data as ConversationDTO; // controller retorna conversa atualizada
};

export const getConversationsByUser = async (userId: number): Promise<ConversationDTO[]> => {
  const res = await API.get(`/chats/conversations/user/${userId}`, getAuthHeaders());
  return res.data;
};
