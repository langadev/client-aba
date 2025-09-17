// src/service/childService.ts
import API from "../../utils/axios";
import { useAuthStore } from "../store/userStore";

// ---- auth header
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ---- tipos
export type Gender = "male" | "female" | "other";

export interface Child {
  id: number;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  psychologistId?: number; // principal (legado/opcional)
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  birthdate?: string;
  gender?: Gender;
  isActive?: boolean;
  lastLogin?: string;
}

// ---- Children CRUD
export const createChild = async (childData: Omit<Child, "id" | "createdAt" | "updatedAt">) => {
  const res = await API.post("/children", childData, getAuthHeaders());
  return res.data as Child;
};

export const getChildren = async (): Promise<Child[]> => {
  const res = await API.get("/children", getAuthHeaders());
  return res.data as Child[];
};

export const getChildById = async (id: number | string): Promise<Child> => {
  const res = await API.get(`/children/${id}`, getAuthHeaders());
  return res.data as Child;
};

export const updateChild = async (
  id: number | string,
  updateData: Partial<Omit<Child, "id" | "createdAt" | "updatedAt">>
): Promise<Child> => {
  const res = await API.put(`/children/${id}`, updateData, getAuthHeaders());
  return res.data as Child;
};

export const deleteChild = async (id: number | string) => {
  const res = await API.delete(`/children/${id}`, getAuthHeaders());
  return res.data;
};

// ---- Listagens auxiliares (pais/psicólogos)
export const getParents = async () => {
  const res = await API.get("/users?role=PAI", getAuthHeaders());
  return res.data as UserDTO[];
};

/**
 * Retorna SOMENTE usuários com role=PSICOLOGO.
 * Se seu backend já aceita query ?role=PSICOLOGO, ótimo.
 * Caso não, mantém o filtro em memória.
 */
export const getPsychologists = async () => {
  // tente primeiro com filtro por query param
  try {
    const res = await API.get("/users?role=PSICOLOGO", getAuthHeaders());
    return (res.data as UserDTO[]).filter((u) => u.role === "PSICOLOGO");
  } catch {
    // fallback: /users e filtra
    const res = await API.get("/users", getAuthHeaders());
    return (res.data as UserDTO[]).filter((u) => u.role === "PSICOLOGO");
  }
};

export const getPsychologistsById = async (id: number) => {
  const res = await API.get(`/users/${id}`, getAuthHeaders());
  const user = res.data as UserDTO;
  if (user.role !== "PSICOLOGO") throw new Error("Usuário não é um psicólogo");
  return user;
};

// ---- Tabela associativa: child_psychologists
// GET /children/:id/psychologists -> lista psicólogos vinculados (N:N)
export const getChildPsychologists = async (
  childId: number | string
): Promise<UserDTO[]> => {
  const res = await API.get(`/children/${childId}/psychologists`, getAuthHeaders());
  return res.data as UserDTO[];
};

// POST /children/:id/psychologists { psychologistId } -> adiciona vínculo
export const addPsychologistToChild = async (
  childId: number | string,
  psychologistId: number
): Promise<UserDTO[]> => {
  const res = await API.post(
    `/children/${childId}/psychologists`,
    { psychologistId },
    getAuthHeaders()
  );
  // backend retorna a lista atualizada de psicólogos vinculados
  return res.data as UserDTO[];
};

// DELETE /children/:childId/psychologists/:psychologistId -> remove vínculo
export const removePsychologistFromChild = async (
  childId: number | string,
  psychologistId: number
): Promise<UserDTO[]> => {
  const res = await API.delete(
    `/children/${childId}/psychologists/${psychologistId}`,
    getAuthHeaders()
  );
  // backend retorna a lista atualizada de psicólogos vinculados
  return res.data as UserDTO[];
};

export const getChildrenByPsychologist = async (
  psychologistId: number
): Promise<Child[]> => {
  const res = await API.get(`/users/${psychologistId}/patients`, getAuthHeaders());
  return res.data as Child[];
};

export const getChildrenByParent = async (parentId: number) => {
  try {
    const res = await API.get(`/users/${parentId}/children`, getAuthHeaders());
    return res.data as Child[];
  } catch {
    // fallback: pega todos e filtra local
    const all = await getChildren();
    return all.filter((c) => Number(c.parentId) === Number(parentId));
  }
};
