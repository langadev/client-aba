// src/api/repository/invoiceRepository.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";


const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export type InvoiceStatusApi = "pending" | "paid" | "cancelled";

export interface InvoiceDTO {
  id: number;
  number: string;
  date: string;               // ISO
  total: number | string;
  status: InvoiceStatusApi;
  customerId: number;
  dueDate?: string | null;
  description?: string | null;
  proofUrl?: string | null;
  proofUploadedAt?: string | null;
  paidAt?: string | null;
  markedPaidBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // opcional: se o backend incluir o cliente
  customer?: { id: number; name: string; email?: string; phone?: string };
}

export interface CreateInvoiceBody {
  customerId: number;
  number?: string;
  date: string;          // ISO
  total: number;
  status?: InvoiceStatusApi;
  dueDate?: string;
  description?: string;
  currency?: string;
  notes?: string;
}

// Lista
export const listInvoices = async (): Promise<InvoiceDTO[]> => {
  const res = await API.get("/invoices", getAuthHeaders());
  console.log("Tal de invoice:", res.data);
  return res.data as InvoiceDTO[];
};

// Criar (ADMIN → PAI)
export const createInvoice = async (body: CreateInvoiceBody): Promise<InvoiceDTO> => {
  const res = await API.post("/invoices", body, getAuthHeaders());
  return res.data as InvoiceDTO;
};

// Atualizar status
export const updateInvoiceStatus = async (id: number, status: InvoiceStatusApi): Promise<InvoiceDTO> => {
  const res = await API.patch(`/invoices/${id}/status`, { status }, getAuthHeaders());
  return res.data as InvoiceDTO;
};

// Upload comprovativo (PAI)
export const uploadPaymentProof = async (id: number, file: File): Promise<InvoiceDTO> => {
  const fd = new FormData();
  fd.append("proof", file);
  const auth = getAuthHeaders();
  const res = await API.post(`/invoices/${id}/proof`, fd, {
    ...auth,
    headers: { ...auth.headers, "Content-Type": "multipart/form-data" },
  });
  return res.data as InvoiceDTO;
};

// Download PDF
export const downloadInvoicePDF = async (id: number, filename = `invoice_${id}.pdf`) => {
  const res = await API.get(`/invoices/${id}/download`, {
    ...getAuthHeaders(),
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};
