// src/store/messageStore.ts
import { create } from "zustand";
import * as messageService from "../service/messageService";
import { useAuthStore } from "./userStore";

type Conversation = messageService.ConversationDTO;
type Message = messageService.MessageDTO;

interface MessageState {
  conversations: Conversation[];
  messagesByConversation: Record<number, Message[]>;
  selectedConversationId: number | null;
  loading: boolean;

  fetchConversations: () => Promise<void>;
  fetchConversationsByUser: (userId: number) => Promise<void>;
  createConversation: (otherUserId: number) => Promise<Conversation>;
  selectConversation: (conversationId: number) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addPsychologistToConversation: (conversationId: number, psychologistId: number) => Promise<void>;
  updateConversationName: (conversationId: number, name: string) => void;

  // ▼▼ novos
  refreshConversation: (conversationId: number, limit?: number) => Promise<void>;
  refreshSelectedConversation: (limit?: number) => Promise<void>;
}

// Helper: nome exibido (outros participantes)
const computeDisplayName = (
  conv: Conversation,
  currentUserId?: number | null
): string | undefined => {
  if (!conv?.participants || !Array.isArray(conv.participants)) return conv.name;
  const me = Number(currentUserId);
  const others = conv.participants.filter((p) => p && p.id !== me);
  if (others.length === 0 && conv.participants.length > 0) return conv.participants[0].name || conv.name;
  if (others.length === 1) return others[0].name || conv.name;
  return others.map((o) => o.name).filter(Boolean).join(", ") || conv.name;
};

export const useMessageStore = create<MessageState>((set, _get) => ({
  conversations: [],
  messagesByConversation: {},
  selectedConversationId: null,
  loading: false,

  fetchConversations: async () => {
    set({ loading: true });
    try {
      const convs = await messageService.getConversations();
      const currentUserId = useAuthStore.getState().user?.id ?? null;
      const mapped = convs.map((c) => ({ ...c, name: computeDisplayName(c, currentUserId) || c.name }));
      set({ conversations: mapped, loading: false });
    } catch (err) {
      console.warn("fetchConversations failed:", err);
      set({ conversations: [], loading: false });
    }
  },

  fetchConversationsByUser: async (userId: number) => {
    set({ loading: true });
    try {
      const convs = await messageService.getConversationsByUser(userId);
      const mapped = convs.map((c) => ({ ...c, name: computeDisplayName(c, userId) || c.name }));
      set({ conversations: mapped, loading: false });
    } catch (err) {
      console.error("fetchConversationsByUser error:", err);
      set({ loading: false });
    }
  },

  createConversation: async (otherUserId: number) => {
    try {
      const userRaw = useAuthStore.getState().user;
      if (!userRaw?.id) throw new Error("Usuário não autenticado");
      const myId = Number(userRaw.id);
      if (Number.isNaN(myId)) throw new Error("ID do usuário inválido");

      const isParent = userRaw.role === "PAI";
      const parentId = isParent ? myId : otherUserId;
      const psychologistId = isParent ? otherUserId : myId;

      const conv = await messageService.createOrGetConversation(parentId, psychologistId);
      const displayName = computeDisplayName(conv, myId) || conv.name;

      set((state) => {
        const merged = [...state.conversations.filter((c) => c.id !== conv.id), { ...conv, name: displayName }];
        return { conversations: merged, selectedConversationId: conv.id };
      });

      await get().selectConversation(conv.id);
      return { ...conv, name: displayName };
    } catch (err) {
      console.error("createConversation error:", err);
      throw err;
    }
  },

  selectConversation: async (conversationId: number) => {
    set({ loading: true });
    try {
      const data = await messageService.getMessages(conversationId);
      let msgs: Message[] = [];
      if (Array.isArray(data)) msgs = data as Message[];
      else if (data && (data as any).messages) msgs = (data as any).messages as Message[];

      set((state) => ({
        selectedConversationId: conversationId,
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: msgs },
        loading: false,
      }));
    } catch (err) {
      console.error("selectConversation error:", err);
      set({ loading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { selectedConversationId, messagesByConversation } = get();
    if (!selectedConversationId) throw new Error("Nenhuma conversa selecionada.");
    const senderRaw = useAuthStore.getState().user?.id;
    const senderId = senderRaw === undefined || senderRaw === null ? undefined : Number(senderRaw);
    if (!senderId || Number.isNaN(senderId)) throw new Error("Usuário não autenticado (senderId inválido).");

    try {
      const created: Message = await messageService.postMessage(selectedConversationId, senderId, content);
      const prev = messagesByConversation[selectedConversationId] ?? [];
      set({
        messagesByConversation: {
          ...messagesByConversation,
          [selectedConversationId]: [...prev, created],
        },
      });
    } catch (err) {
      console.error("sendMessage error:", err);
      throw err;
    }
  },

  addPsychologistToConversation: async (conversationId: number, psychologistId: number) => {
    try {
      const updated = await messageService.addPsychologistToConversation(conversationId, psychologistId);
      const currentUserId = useAuthStore.getState().user?.id ?? null;
      const withDisplayName = { ...updated, name: computeDisplayName(updated as any, currentUserId) || updated.name };

      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? (withDisplayName as any) : c)),
      }));
    } catch (err) {
      console.error("addPsychologistToConversation error:", err);
      throw err;
    }
  },

  updateConversationName: (conversationId: number, name: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, name } : c)),
    }));
  },

  // ▼▼ novo: refresh por ID (sem mexer no loading)
  refreshConversation: async (conversationId: number, limit = 100) => {
    try {
      const data = await messageService.getMessages(conversationId, limit);
      const msgs: Message[] = Array.isArray(data) ? (data as Message[]) : ((data as any)?.messages ?? []);

      set((state) => ({
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: msgs },
      }));

      // se o backend retornou participants, atualiza a conversa (e o display name)
      if (!Array.isArray(data) && (data as any)?.participants) {
        const participants = (data as any).participants as Conversation["participants"];
        const currentUserId = useAuthStore.getState().user?.id ?? null;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  participants,
                  name: computeDisplayName({ ...c, participants } as any, currentUserId) || c.name,
                }
              : c
          ),
        }));
      }
    } catch (err) {
      console.error("refreshConversation error:", err);
    }
  },

  // ▼▼ novo: refresh da conversa selecionada
  refreshSelectedConversation: async (limit = 100) => {
    const convId = get().selectedConversationId;
    if (!convId) return;
    await get().refreshConversation(convId, limit);
  },
}));

// helper interno
const get = () => useMessageStore.getState();
export default useMessageStore;
