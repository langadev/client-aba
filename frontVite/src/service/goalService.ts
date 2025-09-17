// src/service/goalService.ts
import API from "../../utils/axios";
import { useAuthStore } from "../store/userStore";

// Função para pegar o token atual
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Tipo da Goal
export interface Goal {
  id: number;
  title: string;
  description: string;
  status?: "pending" | "in_progress" | "completed";
  dueDate?: string;
  consultationId: number;
  categoryId: number;
  createdAt?: string;
  updatedAt?: string;
}

// CREATE
export const createGoal = async (
  goalData: Omit<Goal, "id" | "createdAt" | "updatedAt">
): Promise<Goal> => {
  const response = await API.post("/goals", goalData, getAuthHeaders());
  return response.data;
};

// READ (todos)
export const getGoals = async (): Promise<Goal[]> => {
  const response = await API.get("/goals", getAuthHeaders());
  return response.data;
};

// READ (um pelo id)
export const getGoalById = async (id: number | string): Promise<Goal> => {
  const response = await API.get(`/goals/${id}`, getAuthHeaders());
  return response.data;
};

// UPDATE
export const updateGoal = async (
  id: number | string,
  updateData: Partial<Omit<Goal, "id" | "createdAt" | "updatedAt">>
): Promise<Goal> => {
  const response = await API.put(`/goals/${id}`, updateData, getAuthHeaders());
  return response.data;
};

// DELETE
export const deleteGoal = async (id: number | string) => {
  const response = await API.delete(`/goals/${id}`, getAuthHeaders());
  return response.data;
};
// READ (metas por ID da consulta)
export const getGoalsByConsultationId = async (consultationId: number | string): Promise<Goal[]> => {
  const response = await API.get(`/goals/consultation/${consultationId}`, getAuthHeaders());
  return response.data;
};

 // In goalService.ts
export const getGoalsByChildId = async (childId: number): Promise<Goal[]> => {
  try {
    const response = await API.get(`/goals/child/${childId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching goals by child ID:', error);
    throw error;
  }
};