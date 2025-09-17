// src/service/childService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

// ---- auth header
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ---- tipos
export type Gender = "male" | "female" | "other";

export interface Child {
  id: number;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  psychologistId?: number; // legado (1:N)
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

// ====== NOVOS TIPOS ======
export type Psychologist = Pick<UserDTO, "id" | "name" | "email" | "phone"> & {
  specialization?: string;
};

export type ChildWithPsychologists = Child & {
  // se usar N:N: lista
  psychologists?: Psychologist[];
  // retrocompatibilidade para UIs antigas:
  psychologistData?: Psychologist | null;
};

// ---- CRUD base
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

export const getPsychologists = async () => {
  try {
    const res = await API.get("/users?role=PSICOLOGO", getAuthHeaders());
    return (res.data as UserDTO[]).filter((u) => u.role === "PSICOLOGO");
  } catch {
    const res = await API.get("/users", getAuthHeaders());
    return (res.data as UserDTO[]).filter((u) => u.role === "PSICOLOGO");
  }
};

export const getPsychologistsById = async (id: number) => {
  const res = await API.get(`/users/${id}`, getAuthHeaders());
  const user = res.data as UserDTO;
  if (user.role !== "PSICOLOGO") throw new Error("Usuário não é um psicólogo");
  return user as Psychologist;
};

// ---- N:N
export const getChildPsychologists = async (
  childId: number | string
): Promise<Psychologist[]> => {
  const res = await API.get(`/children/${childId}/psychologists`, getAuthHeaders());
  return res.data as Psychologist[];
};

export const addPsychologistToChild = async (
  childId: number | string,
  psychologistId: number
): Promise<Psychologist[]> => {
  const res = await API.post(
    `/children/${childId}/psychologists`,
    { psychologistId },
    getAuthHeaders()
  );
  return res.data as Psychologist[];
};

export const removePsychologistFromChild = async (
  childId: number | string,
  psychologistId: number
): Promise<Psychologist[]> => {
  const res = await API.delete(
    `/children/${childId}/psychologists/${psychologistId}`,
    getAuthHeaders()
  );
  return res.data as Psychologist[];
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
    const all = await getChildren();
    return all.filter((c) => Number(c.parentId) === Number(parentId));
  }
};

// ====== NOVAS FUNÇÕES COM PSICÓLOGO(S) VINCULADO(S) ======
const enrichChildWithPsychologists = async (child: Child): Promise<ChildWithPsychologists> => {
  // 1) tenta N:N (rota recomendada)
  try {
    const list = await getChildPsychologists(child.id);
    const psychologists = list ?? [];
    return {
      ...child,
      psychologists,
      psychologistData: psychologists[0] ?? null, // retrocompatível
    };
  } catch {
    // 2) fallback: legado 1:N (child.psychologistId)
    if (child.psychologistId) {
      try {
        const p = await getPsychologistsById(child.psychologistId);
        return { ...child, psychologists: [p], psychologistData: p };
      } catch {
        return { ...child, psychologists: [], psychologistData: null };
      }
    }
    return { ...child, psychologists: [], psychologistData: null };
  }
};

export const getChildByIdWithPsychologists = async (
  id: number | string
): Promise<ChildWithPsychologists> => {
  const base = await getChildById(id);
  return enrichChildWithPsychologists(base);
};

export const getChildrenWithPsychologists = async (): Promise<ChildWithPsychologists[]> => {
  const list = await getChildren();
  return Promise.all(list.map(enrichChildWithPsychologists));
};


// ../api/repository/childRepository.ts

export const getPsychologistNameByChildId = async (
  childId: number | string
): Promise<string | null> => {
  // 1) tenta N:N: pode haver vários psicólogos — junta nomes
  try {
    const list = await getChildPsychologists(childId);
    if (list && list.length) {
      return list
        .map((p) => p?.name)
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // ignora, tenta fallback
  }

  // 2) fallback: legado 1:N (child.psychologistId)
  try {
    const child = await getChildById(childId);
    if (child.psychologistId) {
      const p = await getPsychologistsById(child.psychologistId);
      return p?.name ?? null;
    }
  } catch {
    // ignora
  }

  return null;
};
