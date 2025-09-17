// src/service/consultationService.ts
import API from "../../utils/axios";
import { useAuthStore } from "../store/userStore";

// 🔑 Recupera token
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// 🔎 Tipagem (ampla p/ não quebrar se backend usar maiúsculas)
export type ConsultationStatus =
  | "SCHEDULED" | "CANCELLED" | "DONE" | "NO_SHOW"
  | "scheduled" | "cancelled" | "done"
  | string;

export interface ChildLite {
  id: number;
  name: string;
  birthdate?: string;
  gender?: "male" | "female" | "other";
  parentId?: number;
}

export interface UserLite {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface Consultation {
  id: number;
  date: string; // ISO
  time: string; // HH:MM
  reason: string;
  status?: ConsultationStatus;
  notes?: string;
  childId: number;
  psychologistId: number;
  createdAt?: string;
  updatedAt?: string;

  // ✅ opcionais, preenchidos se o backend fizer include
  child?: ChildLite;
  psychologist?: UserLite;

  goals?: Array<{ id: number; title: string; status: string }>;
}

/** ✅ Tipo leve usado no modal de criação de fatura */
export interface ConsultationLite {
  id: number;
  date: string; // ISO
  status?: ConsultationStatus;
  childId?: number;
  childName: string;
  psychologistId?: number;
  psychologistName?: string;
}

/* ===========================
   CRUD principal
   =========================== */

// CREATE
export const createConsultation = async (
  consultationData: Omit<Consultation, "id" | "createdAt" | "updatedAt">
) => {
  const response = await API.post("/consultations", consultationData, getAuthHeaders());
  return response.data as Consultation;
};

// READ - todas (mantém nome)
export const getConsultations = async (): Promise<Consultation[]> => {
  const response = await API.get("/consultations", getAuthHeaders());
  return response.data as Consultation[];
};

// READ - por id (mantém nome)
export const getConsultationById = async (id: number | string): Promise<Consultation> => {
  const response = await API.get(`/consultations/${id}`, getAuthHeaders());
  return response.data as Consultation;
};

// UPDATE
export const updateConsultation = async (
  id: number | string,
  updateData: Partial<Omit<Consultation, "id" | "createdAt" | "updatedAt">>
): Promise<Consultation> => {
  const response = await API.put(`/consultations/${id}`, updateData, getAuthHeaders());
  return response.data as Consultation;
};

// DELETE
export const deleteConsultation = async (id: number | string) => {
  const response = await API.delete(`/consultations/${id}`, getAuthHeaders());
  return response.data;
};

// READ - por criança
export const getConsultationsByChild = async (
  childId: number | string
): Promise<Consultation[]> => {
  const response = await API.get(`/consultations/child/${childId}`, getAuthHeaders());
  return response.data as Consultation[];
};

// READ - metas da consulta
export const getGoalsByConsultation = async (consultationId: number | string) => {
  const response = await API.get(`/consultations/${consultationId}/goals`, getAuthHeaders());
  return response.data as Array<{ id: number; title: string; status: string }>;
};

// READ - por psicólogo
export const getConsultationsByPsychologist = async (
  psychologistId: number | string
): Promise<Consultation[]> => {
  const response = await API.get(
    `/consultations/psychologist/${psychologistId}`,
    getAuthHeaders()
  );
  return response.data as Consultation[];
};

/* ===========================
   Lista leve + pesquisa (para Billing)
   =========================== */

/**
 * Lista consultas num formato leve, com pesquisa.
 * Backend esperado (se disponível):
 *   GET /consultations?lite=1&q=<termo>&limit=<n>
 *   - q: pesquisa por id, child.name, psychologist.name
 *   - limit: quantidade de resultados
 *
 * Se o backend não suportar, faz fallback: GET /consultations e filtra no cliente.
 */
export const listConsultationsLite = async ({
  q = "",
  limit = 20,
}: {
  q?: string;
  limit?: number;
}): Promise<ConsultationLite[]> => {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", String(limit));
  qs.set("lite", "1");

  // 1) Tenta endpoint com lite/q/limit
  try {
    const res = await API.get(`/consultations?${qs.toString()}`, getAuthHeaders());
    const rows = Array.isArray(res.data) ? res.data : [];

    return rows.map((row: any) => ({
      id: Number(row.id),
      date: row.date ?? row.createdAt ?? new Date().toISOString(),
      status: row.status,
      childId: row.child?.id ?? row.childId,
      childName: row.child?.name ?? row.childName ?? "Sem nome",
      psychologistId: row.psychologist?.id ?? row.psychologistId,
      psychologistName:
        row.psychologist?.name ?? row.psychologistName ?? row.psychologist ?? "",
    })) as ConsultationLite[];
  } catch (err) {
    // 2) Fallback: busca tudo e filtra no cliente
    const all = await getConsultations();

    // normaliza
    const mapped: ConsultationLite[] = all.map((c) => ({
      id: c.id,
      date: c.date || c.createdAt || new Date().toISOString(),
      status: c.status,
      childId: c.child?.id ?? c.childId,
      childName: c.child?.name ?? "Sem nome",
      psychologistId: c.psychologist?.id ?? c.psychologistId,
      psychologistName: c.psychologist?.name ?? "",
    }));

    // filtro simples por termo
    const term = q.trim().toLowerCase();
    let filtered = mapped;
    if (term) {
      filtered = mapped.filter((r) => {
        const idMatch = String(r.id).includes(term);
        const childMatch = (r.childName || "").toLowerCase().includes(term);
        const psyMatch = (r.psychologistName || "").toLowerCase().includes(term);
        return idMatch || childMatch || psyMatch;
      });
    }

    return filtered.slice(0, limit);
  }
};
