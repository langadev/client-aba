// src/service/goalService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

// -------------------- auth
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// -------------------- tipos
export type GoalStatus =
  | "pending" | "in_progress" | "completed"
  | "PENDING" | "IN_PROGRESS" | "COMPLETED"
  | string;

export interface Goal {
  id: number;
  title: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  dueDate?: string | null;         // YYYY-MM-DD ou ISO (conforme backend)
  consultationId: number;
  categoryId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  dueDate?: string;
  consultationId: number;     // obrigatório
  status?: GoalStatus;        // default: pending
  progress?: number;          // default: 0
  categoryId?: number;        // opcional, use se o backend exigir
}

// -------------------- helpers de payload
const normalizeStatus = (s?: GoalStatus): "pending" | "in_progress" | "completed" => {
  const k = String(s || "pending").toLowerCase();
  if (k.includes("progress")) return "in_progress";
  if (k.includes("complete") || k === "done") return "completed";
  return "pending";
};

const clamp0to100 = (n?: number) => {
  const v = Number.isFinite(n) ? Math.round(n as number) : 0;
  return Math.max(0, Math.min(100, v));
};

const buildGoalPayload = (g: CreateGoalInput) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    title: g.title?.trim(),
    description: g.description?.trim() || null,
    status: normalizeStatus(g.status),
    progress: clamp0to100(g.progress),
    consultationId: Number(g.consultationId),
  };
  if (g.dueDate) payload.dueDate = g.dueDate;
  if (g.categoryId != null) payload.categoryId = Number(g.categoryId);
  return payload;
};

// -------------------- CRUD
export const createGoal = async (goalData: CreateGoalInput): Promise<Goal> => {
  const body = buildGoalPayload(goalData);
  const response = await API.post("/goals", body, getAuthHeaders());
  return response.data as Goal;
};

export const getGoals = async (): Promise<Goal[]> => {
  const response = await API.get("/goals", getAuthHeaders());
  return response.data as Goal[];
};

export const getGoalById = async (id: number | string): Promise<Goal> => {
  const response = await API.get(`/goals/${id}`, getAuthHeaders());
  return response.data as Goal;
};

export const updateGoal = async (
  id: number | string,
  updateData: Partial<CreateGoalInput & Omit<Goal, "id" | "createdAt" | "updatedAt">>
): Promise<Goal> => {
  // opcional: normalizar campos se vierem (status/progress)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = { ...updateData };
  if ("status" in body) body.status = normalizeStatus(body.status);
  if ("progress" in body) body.progress = clamp0to100(body.progress);
  if ("consultationId" in body && body.consultationId != null) {
    body.consultationId = Number(body.consultationId);
  }
  const response = await API.put(`/goals/${id}`, body, getAuthHeaders());
  return response.data as Goal;
};

export const deleteGoal = async (id: number | string) => {
  const response = await API.delete(`/goals/${id}`, getAuthHeaders());
  return response.data;
};

// metas por consulta (rota do backend)
export const getGoalsByConsultationId = async (
  consultationId: number | string
): Promise<Goal[]> => {
  const response = await API.get(`/consultations/${consultationId}/goals`, getAuthHeaders());
  return response.data as Goal[];
};

// metas por criança (seu endpoint auxiliar)
export const getGoalsByChildId = async (childId: number | string): Promise<Goal[]> => {
  const response = await API.get(`/goals/child/${childId}`, getAuthHeaders());
  return response.data as Goal[];
};
