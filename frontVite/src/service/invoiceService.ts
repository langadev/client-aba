// src/service/invoiceService.ts
import API from "../../utils/axios";
import { useAuthStore } from "../store/userStore";

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// 👉 Com teu backend sem /api, mantém BASE assim.
// Se em algum ambiente tiver /api, ajusta o baseURL do axios, não o BASE.
const BASE = "/invoices";

export type InvoiceStatusApi = "pending" | "paid" | "cancelled";

export interface InvoiceDTO {
  id: number;
  number: string;
  date: string;
  total: string | number;  // ← pode vir string
  status: InvoiceStatusApi;
  customerId?: number;
  consultationId: number;
  dueDate?: string | null;
  description?: string | null;
  proofUrl?: string | null;
  proofUploadedAt?: string | null;
  paidAt?: string | null;        // ← backend pode enviar
  markedPaidBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface InvoiceCreateDTO {
  consultationId?: number;
  number: string;
  date: string;
  total: number;
  status?: InvoiceStatusApi;
  customerId?: number;
  dueDate?: string;
  description?: string;
}

export type InvoiceUpdateDTO = Partial<
  Pick<InvoiceDTO, "number" | "date" | "total" | "status" | "dueDate" | "description">
>;

// Criar fatura ligado a uma consulta (consultationId vem na URL)
export const createInvoiceForConsultation = async (
  consultationId: number,
  payload: InvoiceCreateDTO
): Promise<InvoiceDTO> => {
  const body = {
    number: payload.number,
    date: payload.date,
    total: payload.total,
    status: payload.status ?? "pending",
    customerId: payload.customerId,
    dueDate: payload.dueDate,
    description: payload.description,
    // ⚠️ Não precisa incluir consultationId no body,
    // pois já vai na URL e o backend faz o merge
  };

  const res = await API.post(
    `${BASE}/${consultationId}/invoices`, // 👈 consultaId na URL
    body,
    getAuthHeaders()
  );

  return res.data as InvoiceDTO;
};



export const listInvoices = async (): Promise<InvoiceDTO[]> => {
  const res = await API.get(`${BASE}`, getAuthHeaders());
  return res.data as InvoiceDTO[];
};

export const getInvoiceById = async (invoiceId: number): Promise<InvoiceDTO> => {
  const res = await API.get(`${BASE}/${invoiceId}`, getAuthHeaders());
  return res.data as InvoiceDTO;
};

export const updateInvoice = async (
  invoiceId: number,
  payload: InvoiceUpdateDTO
): Promise<InvoiceDTO> => {
  const res = await API.patch(`${BASE}/${invoiceId}`, payload, getAuthHeaders());
  return res.data as InvoiceDTO;
};

export const updateInvoiceStatus = async (
  invoiceId: number,
  status: InvoiceStatusApi
): Promise<InvoiceDTO> => {
  const res = await API.patch(`${BASE}/${invoiceId}/status`, { status }, getAuthHeaders());
  return res.data as InvoiceDTO;
};

export const deleteInvoice = async (invoiceId: number): Promise<void> => {
  await API.delete(`${BASE}/${invoiceId}`, getAuthHeaders());
};

export const uploadPaymentProof = async (
  invoiceId: number,
  file: File
): Promise<InvoiceDTO> => {
  const fd = new FormData();
  fd.append("proof", file); // 👈 campo "proof" — igual ao backend (multer)
  const auth = getAuthHeaders();
  const res = await API.post(`${BASE}/${invoiceId}/proof`, fd, {
    ...auth,
    headers: {
      ...auth.headers,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data as InvoiceDTO;
};

export const downloadInvoicePDF = async (invoiceId: number, filename = `invoice_${invoiceId}.pdf`) => {
  const res = await API.get(`${BASE}/${invoiceId}/download`, {
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
