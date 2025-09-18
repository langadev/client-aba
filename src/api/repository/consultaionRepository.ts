// src/service/consultationService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

/* ========================= Auth headers ========================= */
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

/* ========================= RBAC (cliente) =========================
   Apenas PSICOLOGO pode criar / atualizar / apagar consultas.
   O backend também valida, mas garantimos no cliente para UX melhor. */
const assertPsychologist = () => {
  const role = useAuthStore.getState().user?.role;
  if (role !== "PSICOLOGO") {
    throw new Error("Sem permissão. Apenas PSICOLOGO pode realizar esta ação.");
  }
};

/* ========================= Tipos ========================= */
export type ConsultationStatus =
  | "scheduled"
  | "cancelled"
  | "done"
  | "SCHEDULED"
  | "CANCELLED"
  | "DONE"
  | "NO_SHOW"
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
  /** Backend aceita string parseável por Date (ex.: "2025-03-21" ou ISO) */
  date: string;
  /** HH:MM (24h) */
  time: string;
  reason: string;
  status?: ConsultationStatus;
  notes?: string;
  childId: number;
  psychologistId: number;
  createdAt?: string;
  updatedAt?: string;

  // ===== Campos “ricos” compatíveis com o backend =====
  /** ISO string (opcional no backend, mas recomendado para checagem de conflitos) */
  startAt?: string;
  /** ISO string; se enviado, deve ser > startAt */
  endAt?: string;
  /** default no backend é TRUE quando não enviado no service; aqui enviaremos explicitamente */
  isInPerson?: boolean;
  /** obrigatório quando isInPerson = true */
  location?: string | null;

  // ===== Includes opcionais vindos do backend =====
  child?: ChildLite;
  psychologist?: UserLite;
  goals?: Array<{ id: number; title: string; status: string }>;
}

/** Payload de criação: espelha o schema do backend */
export interface ConsultationCreateInput {
  date: string;
  time: string; // HH:MM
  reason: string;
  childId: number;
  psychologistId: number;
  status?: "scheduled" | "cancelled" | "done";
  notes?: string;
  startAt?: string; // ISO
  endAt?: string;   // ISO
  isInPerson?: boolean; // se true -> location obrigatório
  location?: string;
}

/** Update é parcial do schema (backend usa .partial()) */
export type ConsultationUpdateInput = Partial<ConsultationCreateInput>;

/** Tipo leve usado em listagens/seleção (ex.: faturação) */
export interface ConsultationLite {
  id: number;
  date: string; // ISO ou data
  status?: ConsultationStatus;
  childId?: number;
  childName: string;
  psychologistId?: number;
  psychologistName?: string;
}

/* ========================= Helpers internos ========================= */

const isHHMM = (val?: string) => !!val && /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);

/** Normaliza o payload para evitar defaults implícitos do backend. */
const normalizeCreatePayload = (input: ConsultationCreateInput): ConsultationCreateInput => {
  // Garantir time no formato correto (evita rejeição do Zod)
  if (!isHHMM(input.time)) {
    throw new Error("Hora inválida. Use o formato HH:MM (24h).");
  }

  // isInPerson: enviar explicitamente; backend defaulta para true se ausente
  const isInPerson = !!input.isInPerson;

  // location obrigatória quando presencial
  if (isInPerson && !input.location?.trim()) {
    throw new Error("Location is required when isInPerson = true");
  }

  return {
    ...input,
    isInPerson,
    location: isInPerson ? input.location?.trim() : input.location ?? undefined,
  };
};

const normalizeUpdatePayload = (input: ConsultationUpdateInput): ConsultationUpdateInput => {
  const out = { ...input };

  if (out.time && !isHHMM(out.time)) {
    throw new Error("Hora inválida no update. Use o formato HH:MM (24h).");
  }

  if (typeof out.isInPerson === "boolean" && out.isInPerson) {
    if (!out.location?.trim()) {
      throw new Error("Location is required when isInPerson = true");
    }
    out.location = out.location.trim();
  }

  return out;
};

/* ========================= CRUD principal ========================= */

// CREATE
export const createConsultation = async (data: ConsultationCreateInput) => {
  assertPsychologist();
  const payload = normalizeCreatePayload(data);
  const response = await API.post("/consultations", payload, getAuthHeaders());
  return response.data as Consultation;
};

// READ - todas
export const getConsultations = async (): Promise<Consultation[]> => {
  const response = await API.get("/consultations", getAuthHeaders());
  return response.data as Consultation[];
};

// READ - por id
export const getConsultationById = async (id: number | string): Promise<Consultation> => {
  const response = await API.get(`/consultations/${id}`, getAuthHeaders());
  return response.data as Consultation;
};

// UPDATE
export const updateConsultation = async (
  id: number | string,
  updateData: ConsultationUpdateInput
): Promise<Consultation> => {
  assertPsychologist();
  const payload = normalizeUpdatePayload(updateData);
  const response = await API.put(`/consultations/${id}`, payload, getAuthHeaders());
  return response.data as Consultation;
};

// DELETE
export const deleteConsultation = async (id: number | string) => {
  assertPsychologist();
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

// READ - metas por consulta
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

/* ========================= Lista leve + pesquisa ========================= */

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

  // 1) Tenta endpoint otimizado
  try {
    const res = await API.get(`/consultations?${qs.toString()}`, getAuthHeaders());
    const rows = Array.isArray(res.data) ? res.data : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } catch {
    // 2) Fallback: busca tudo e filtra no cliente
    const all = await getConsultations();

    const mapped: ConsultationLite[] = all.map((c) => ({
      id: c.id,
      date: c.startAt || c.date || c.createdAt || new Date().toISOString(),
      status: c.status,
      childId: c.child?.id ?? c.childId,
      childName: c.child?.name ?? "Sem nome",
      psychologistId: c.psychologist?.id ?? c.psychologistId,
      psychologistName: c.psychologist?.name ?? "",
    }));

    const term = q.trim().toLowerCase();
    const filtered = term
      ? mapped.filter((r) => {
          const idMatch = String(r.id).includes(term);
          const childMatch = (r.childName || "").toLowerCase().includes(term);
          const psyMatch = (r.psychologistName || "").toLowerCase().includes(term);
          return idMatch || childMatch || psyMatch;
        })
      : mapped;

    return filtered.slice(0, limit);
  }
};
