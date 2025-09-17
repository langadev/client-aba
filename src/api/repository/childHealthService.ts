// src/service/childHealthService.ts
import API from "../../utils/axios";
import { useAuthStore } from "../store/userStore";

const auth = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface ChildHealthDTO {
  childId: number;
  allergies?: string | null;
  medications?: string | null;
  diagnoses?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const getChildHealth = async (childId: number): Promise<ChildHealthDTO | null> => {
  const res = await API.get(`/childrenHealth/${childId}/health`, auth());
  return res.data ?? null;
};


// Atualiza / upsert
export const upsertChildHealth = async (
  childId: number,
  payload: Partial<ChildHealthDTO>
): Promise<ChildHealthDTO> => {
  const res = await API.patch(`/childrenHealth/${childId}/health`, payload, auth());
  return res.data as ChildHealthDTO;
};
