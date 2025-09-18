// src/service/reportService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Ajusta para "/api/reports" se o backend estiver com prefixo /api
const BASE = "/reports";

export interface ReportDTO {
  id: number;
  title: string;
  description: string;
  consultationId: number;
  createdAt: string;
  updatedAt: string;
  consultation?: ConsultationDTO;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ConsultationDTO {
  id: number;
  date: string;     // ISO
  time: string;     // "HH:mm"
  reason: string;
  status: "scheduled" | "cancelled" | "done";
  notes?: string | null;
  child?: {
    id: number;
    name: string;
    parent?: UserLite;
    psychologist?: UserLite;
  };
  psychologist?: UserLite;
  goals?: Array<{ id: number; title?: string; description?: string }>;
  invoice?: { id: number; number?: string; total?: number; status?: string };
  report?: ReportDTO;
}

export interface UserLite {
  id: number;
  name: string;
  role?: string;
}

export interface ReportCreateDTO {
  title: string;
  description: string;
  consultationId: number;
}

export interface ReportUpdateDTO {
  title?: string;
  description?: string;
}

/** Criar relatório */
export const createReport = async (payload: ReportCreateDTO): Promise<ReportDTO> => {
  const res = await API.post(`${BASE}`, payload, getAuthHeaders());
  return res.data as ReportDTO;
};

/** Obter relatório simples por ID */
export const getReportById = async (id: number): Promise<ReportDTO> => {
  const res = await API.get(`${BASE}/${id}`, getAuthHeaders());
  return res.data as ReportDTO;
};

/** Obter relatório detalhado por ID (inclui consulta e relações) */
export const getReportFullById = async (id: number): Promise<ReportDTO> => {
  const res = await API.get(`${BASE}/${id}/full`, getAuthHeaders());
  return res.data as ReportDTO;
};

/** Atualizar relatório */
export const updateReport = async (id: number, payload: ReportUpdateDTO): Promise<ReportDTO> => {
  const res = await API.put(`${BASE}/${id}`, payload, getAuthHeaders());
  return res.data as ReportDTO;
};

/** Remover relatório */
export const deleteReport = async (id: number): Promise<void> => {
  await API.delete(`${BASE}/${id}`, getAuthHeaders());
};

/** Buscar relatório por consultationId (1:1) */
export const getReportByConsultationId = async (consultationId: number): Promise<ReportDTO | null> => {
  const res = await API.get(`${BASE}/consultation/${consultationId}`, getAuthHeaders());
  return res.data ?? null;
};

/** Upsert (cria/atualiza) relatório para uma consulta */
export const upsertReportForConsultation = async (
  consultationId: number,
  payload: { title: string; description: string }
): Promise<ReportDTO> => {
  const res = await API.post(`${BASE}/consultation/${consultationId}/upsert`, payload, getAuthHeaders());
  return res.data as ReportDTO;
};

/** Obter consulta + relatório + relações */
export const getConsultationWithReport = async (consultationId: number): Promise<ConsultationDTO> => {
  const res = await API.get(`${BASE}/consultation/${consultationId}/full`, getAuthHeaders());
  return res.data as ConsultationDTO;
};

/** Listar relatórios (paginação e ordenação) */
export const listReports = async (opts?: {
  page?: number;
  pageSize?: number;
  order?: "ASC" | "DESC";
}): Promise<Paginated<ReportDTO>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {};
  if (opts?.page) params.page = opts.page;
  if (opts?.pageSize) params.pageSize = opts.pageSize;
  if (opts?.order) params.order = opts.order;

  const res = await API.get(`${BASE}`, { ...getAuthHeaders(), params });
  return res.data as Paginated<ReportDTO>;
};

/** Listar relatórios por intervalo de datas (usa Consultation.date) */
export const listReportsByConsultationDateRange = async (
  startISO: string,
  endISO: string,
  opts?: { page?: number; pageSize?: number }
): Promise<Paginated<ReportDTO>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = { start: startISO, end: endISO };
  if (opts?.page) params.page = opts.page;
  if (opts?.pageSize) params.pageSize = opts.pageSize;

  const res = await API.get(`${BASE}/range`, { ...getAuthHeaders(), params });
  return res.data as Paginated<ReportDTO>;
};

/** Listar relatórios de um PAI (via filhos) */
export const listReportsByParent = async (
  parentId: number,
  opts?: { page?: number; pageSize?: number }
): Promise<Paginated<ReportDTO>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {};
  if (opts?.page) params.page = opts.page;
  if (opts?.pageSize) params.pageSize = opts.pageSize;

  const res = await API.get(`${BASE}/parent/${parentId}`, { ...getAuthHeaders(), params });
  return res.data as Paginated<ReportDTO>;
};

/** Listar relatórios por PSICÓLOGO (consultas do psicólogo X) */
export const listReportsByPsychologist = async (
  psychologistId: number,
  opts?: { page?: number; pageSize?: number }
): Promise<Paginated<ReportDTO>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {};
  if (opts?.page) params.page = opts.page;
  if (opts?.pageSize) params.pageSize = opts.pageSize;

  const res = await API.get(`${BASE}/psychologist/${psychologistId}`, { ...getAuthHeaders(), params });
  return res.data as Paginated<ReportDTO>;
};

/** Download do PDF referente à consulta (stream -> blob -> download) */
export const downloadReportForConsultation = async (
  consultationId: number,
  filename = `consulta_${consultationId}_relatorio.pdf`
) => {
  const res = await API.get(`${BASE}/consultation/${consultationId}/download`, {
    ...getAuthHeaders(),
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
