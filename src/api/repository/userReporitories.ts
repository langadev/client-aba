import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";
// Função para pegar o token atual (do zustand ou localStorage)
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Tipos
export type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";
export type Gender = "male" | "female" | "other";

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  phone?: string;
  birthdate?: string;
  gender?: Gender;
  role: UserRole;
  isActive?: boolean;
  lastLogin?: string;
}

// CREATE
export const createUser = async (userData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  birthdate?: string;
  gender?: Gender;
  role: UserRole;
}) => {
  const response = await API.post("/users", userData, getAuthHeaders());
  return response.data as UserDTO;
};

// READ (todos usuários)
export const getUsers = async (): Promise<UserDTO[]> => {
  const response = await API.get("/users", getAuthHeaders());
  return response.data;
};

// READ (um usuário pelo id)
export const getUserById = async (id: string | number): Promise<UserDTO> => {
  const response = await API.get(`/users/${id}`, getAuthHeaders());
  return response.data;
};

// UPDATE
export const updateUser = async (
  id: string | number,
  updateData: Partial<{
    name: string;
    email: string;
    password: string;
    phone?: string;
    birthdate?: string;
    gender?: Gender;
    role: UserRole;
    isActive?: boolean;
  }>
): Promise<UserDTO> => {
  const response = await API.put(`/users/${id}`, updateData, getAuthHeaders());
  return response.data;
};

// DELETE
export const deleteUser = async (id: string | number) => {
  const response = await API.delete(`/users/${id}`, getAuthHeaders());
  return response.data;
};

export const getPsychologistsByParent = async (parentId: number, childId?: number) => {
  const res = await API.get(`/users/${parentId}/psychologists`, {
    ...getAuthHeaders(),
    params: childId ? { childId } : undefined,
  });
  return res.data as Array<{ id: number; name: string }>;
};

export const getParentsByPsychologist = async (psychologistId: number, childId?: number) => {
  const res = await API.get(`/users/${psychologistId}/parents`, {
    ...getAuthHeaders(),
    params: childId ? { childId } : undefined,
  });
  return res.data as Array<{ id: number; name: string }>;
};

export const getAllPsychologists = async () => {
  const res = await API.get(`/users?role=PSICOLOGO`, getAuthHeaders());
  const list = (res.data || []) as Array<{ id: number; name: string; role?: string }>;
  // 🔒 garanta que só retorna PSICOLOGO mesmo se o backend esquecer de filtrar
  return list
    .filter(u => (u as any).role === 'PSICOLOGO' || (u as any).role === undefined) // se backend não enviar role, mantenha os que não contradizem
    .map(u => ({ id: u.id, name: u.name }));
};

export const getChildPsychologists = async (childId: number | string) => {
  const response = await API.get(`/children/${childId}/psychologists`, getAuthHeaders());
  return response.data; // array de { id, name, email, role }
};

export const addPsychologistToChild = async (childId: number | string, psychologistId: number) => {
  const response = await API.post(`/children/${childId}/psychologists`, { psychologistId }, getAuthHeaders());
  return response.data; // lista atualizada
};

export const removePsychologistFromChild = async (childId: number | string, psychologistId: number) => {
  const response = await API.delete(`/children/${childId}/psychologists/${psychologistId}`, getAuthHeaders());
  return response.data; // lista atualizada
};




