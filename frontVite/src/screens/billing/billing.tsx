// src/screens/billing/Billing.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  memo,
  type JSX,
} from "react";
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  ChevronDown,
  ChevronUp,
  Check as CheckIcon,
  Upload as UploadIcon,
  Plus as PlusIcon,
  X as XIcon,
  User as UserIcon,
  Baby as BabyIcon,
  CreditCard as CreditCardIcon,
  AlertTriangle as AlertTriangleIcon,
  Clock as ClockIcon,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAuthStore } from "@/store/userStore";

import {
  listInvoices as apiListInvoices,
  createInvoiceForConsultation as apiCreateInvoiceForConsultation,
  updateInvoiceStatus as apiUpdateInvoiceStatus,
  uploadPaymentProof as apiUploadPaymentProof,
  downloadInvoicePDF as apiDownloadInvoicePDF,
  type InvoiceDTO,
  type InvoiceStatusApi,
} from "../../service/invoiceService";

import {
  listConsultationsLite,
  type ConsultationLite,
} from "../../service/consultaionService";

/* ========================== Tipos / Constantes ========================== */

export type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";
type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Failed";
type Currency = "MZN" | "USD" | "EUR";
type TabKey = "invoices" | "payments" | "receipts";

// chips no topo
type ChipKey = "All" | "Outstanding" | "Overdue" | "Paid" | "Partially";
const chipLabels: Record<ChipKey, string> = {
  All: "Todos",
  Outstanding: "Em Aberto",
  Overdue: "Vencidas",
  Paid: "Pagas",
  Partially: "Parcial",
};

interface Invoice {
  id: number | string;
  number?: string;
  date: string;
  dueDate?: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  description: string;
  sessions?: number;
  period?: { start: string; end: string };
  proofUrl?: string | null;
  proofUploadedAt?: string | null;
  consultationId?: number;
  /** Opcional—se o backend devolver, usamos p/ filtrar ao PAI */
  ownerUserId?: number | null;
  parentId?: number | null;
  userId?: number | null;
}

const badgeByStatus: Record<InvoiceStatus, string> = {
  Paid: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
  Failed: "bg-gray-200 text-gray-700",
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  PAI: "Pai/Encarregado",
  PSICOLOGO: "Psicólogo",
  USER: "Utilizador",
};

const fmtMoney = (value: number, currency: Currency) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);

const parseISO = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));

/* ======================== Mapas Backend <-> UI ========================= */

const apiToUiStatus = (api: InvoiceStatusApi, dueDate?: string): InvoiceStatus => {
  if (api === "paid") return "Paid";
  if (api === "cancelled") return "Failed";
  if (api === "pending") {
    if (dueDate && parseISO(dueDate) < new Date()) return "Overdue";
    return "Pending";
  }
  return "Pending";
};

const uiToApiStatus = (ui: InvoiceStatus): InvoiceStatusApi => {
  if (ui === "Paid") return "paid";
  if (ui === "Failed") return "cancelled";
  return "pending";
};

const dtoToUi = (row: InvoiceDTO): Invoice => ({
  id: row.id,
  number: row.number,
  date: row.date,
  dueDate: row.dueDate ?? undefined,
  amount: typeof row.total === "string" ? parseFloat(row.total) : (row.total ?? 0),
  currency: "MZN",
  status: apiToUiStatus(row.status, row.dueDate ?? undefined),
  description: row.description ?? `Consulta #${row.consultationId}`,
  sessions: undefined,
  proofUrl: row.proofUrl ?? null,
  proofUploadedAt: row.proofUploadedAt ?? null,
  consultationId: row.consultationId,
  // campos de dono (se vierem do backend; são opcionais)
  // @ts-expect-error: apenas mapeamos se existir
  ownerUserId: row.ownerUserId ?? row.parentId ?? row.userId ?? null,
  // @ts-expect-error idem
  parentId: row.parentId ?? null,
  // @ts-expect-error idem
  userId: row.userId ?? null,
  // @ts-expect-error (campo opcional não tipado acima)
  paidAt: row.paidAt ?? undefined,
});

/* ============================ Modal genérico ============================ */

function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center items-end justify-stretch bg-black/40 p-0 sm:p-4">
      <div className={`w-full ${maxWidth} sm:rounded-xl rounded-t-2xl bg-white shadow-xl sm:mx-auto`}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-gray-100" aria-label="Fechar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* =========================== Linha da Tabela ============================ */

const InvoiceRow = memo(function InvoiceRow({
  inv,
  userRole,
  onDownload,
  onUploadProof,
  onSetStatus,
  workingId,
}: {
  inv: Invoice;
  userRole: UserRole;
  onDownload: (inv: Invoice) => void;
  onUploadProof: (id: number | string, file: File) => void;
  onSetStatus: (id: number | string, status: InvoiceStatus) => void;
  workingId?: number | string | null;
}) {
  const loading = workingId === inv.id;
  const invLabel = `INV-${inv.number ?? inv.id}`;

  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="py-4">
        <div>
          <p className="font-medium text-gray-900">{invLabel}</p>
          <p className="text-sm text-gray-600">{inv.description}</p>
          {inv.proofUrl && (
            <div className="mt-1 text-xs text-gray-600">
              Comprovativo:{" "}
              <a className="text-blue-600 underline" href={inv.proofUrl} target="_blank" rel="noreferrer">
                ver ficheiro
              </a>
              {inv.proofUploadedAt && (
                <span className="text-gray-500"> • {new Date(inv.proofUploadedAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </td>

      <td className="py-4 text-sm text-gray-700">
        <div>{new Date(inv.date).toLocaleDateString()}</div>
        <div className="text-gray-500">Vencimento: {new Date(inv.dueDate || inv.date).toLocaleDateString()}</div>
      </td>

      <td className="py-4 text-sm text-gray-700">{inv.sessions ?? 0}</td>

      <td className="py-4 font-medium text-gray-900">{fmtMoney(inv.amount, inv.currency)}</td>

      <td className="py-4">
        <Badge className={badgeByStatus[inv.status]}>{inv.status}</Badge>
      </td>

      <td className="py-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={() => onDownload(inv)} title="Baixar PDF" disabled={loading}>
            <DownloadIcon className="w-4 h-4" />
          </Button>

          {userRole === "PAI" && inv.status !== "Paid" && (
            <>
              <input
                id={`proof-${inv.id}`}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadProof(inv.id, f);
                }}
              />
              <label htmlFor={`proof-${inv.id}`}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? "Enviando..." : (<><UploadIcon className="w-4 h-4 mr-1" /> Comprovativo</>)}
                </Button>
              </label>
            </>
          )}

          {userRole === "ADMIN" && (
            <div className="flex flex-wrap gap-1">
              {inv.status !== "Paid" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onSetStatus(inv.id, "Paid")} disabled={loading}>
                  {loading ? "..." : "Paga"}
                </Button>
              )}
              {inv.status !== "Pending" && (
                <Button size="sm" variant="outline" onClick={() => onSetStatus(inv.id, "Pending")} disabled={loading}>
                  Pendente
                </Button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
});

/* ============================== Card Mobile ============================= */

function InvoiceCard({
  inv,
  userRole,
  onDownload,
  onUploadProof,
  onSetStatus,
  workingId,
}: {
  inv: Invoice;
  userRole: UserRole;
  onDownload: (inv: Invoice) => void;
  onUploadProof: (id: number | string, file: File) => void;
  onSetStatus: (id: number | string, status: InvoiceStatus) => void;
  workingId?: number | string | null;
}) {
  const loading = workingId === inv.id;
  const invLabel = `INV-${inv.number ?? inv.id}`;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 truncate">{invLabel}</p>
              <Badge className={badgeByStatus[inv.status]}>{inv.status}</Badge>
            </div>
            <p className="text-sm text-gray-700 mt-1 break-words">{inv.description}</p>
          </div>
          <div className="text-right font-semibold text-gray-900 whitespace-nowrap">
            {fmtMoney(inv.amount, inv.currency)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="block text-gray-500">Data</span>
            {new Date(inv.date).toLocaleDateString()}
          </div>
          <div>
            <span className="block text-gray-500">Vencimento</span>
            {new Date(inv.dueDate || inv.date).toLocaleDateString()}
          </div>
        </div>

        {inv.proofUrl && (
          <div className="mt-3 text-xs text-gray-600">
            Comprovativo:{" "}
            <a className="text-blue-600 underline" href={inv.proofUrl} target="_blank" rel="noreferrer">
              ver ficheiro
            </a>
            {inv.proofUploadedAt && (
              <span className="text-gray-500"> • {new Date(inv.proofUploadedAt).toLocaleString()}</span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => onDownload(inv)} disabled={loading}>
            <DownloadIcon className="w-4 h-4 mr-1" />
            PDF
          </Button>

          {userRole === "PAI" && inv.status !== "Paid" && (
            <>
              <input
                id={`proof-mobile-${inv.id}`}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadProof(inv.id, f);
                }}
              />
              <label htmlFor={`proof-mobile-${inv.id}`}>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? "Enviando..." : (<><UploadIcon className="w-4 h-4 mr-1" /> Comprovativo</>)}
                </Button>
              </label>
            </>
          )}

          {userRole === "ADMIN" && inv.status !== "Paid" && (
            <Button
              size="sm"
              className="col-span-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onSetStatus(inv.id, "Paid")}
              disabled={loading}
            >
              <CheckIcon className="w-4 h-4 mr-2" /> Marcar como Paga
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================= Página Billing ============================ */

export const Billing = (): JSX.Element => {
  // 1) Lê user e deriva role
  const user = useAuthStore((s) => s.user);
  const currentRole: UserRole =
    (user?.role?.toUpperCase?.() as UserRole) ?? "USER";

  const [tab, setTab] = useState<TabKey>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (chips + busca + datas)
  const [chip, setChip] = useState<ChipKey>("All");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Ordenação
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [asc, setAsc] = useState(false);

  // Modal criar fatura
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Seleção de consulta (com pesquisa)
  const [consultations, setConsultations] = useState<ConsultationLite[]>([]);
  const [consultQuery, setConsultQuery] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState<ConsultationLite | null>(null);

  // Form criar
  const [createForm, setCreateForm] = useState({ amount: "", description: "" });

  // Loading por ação
  const [workingId, setWorkingId] = useState<number | string | null>(null);

  /* ------------------------------- Fetch -------------------------------- */

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const rows = await apiListInvoices();
      setInvoices(rows.map(dtoToUi));
    } catch (e) {
      console.error("Erro ao carregar faturas:", e);
      alert("Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Consultas (modal) -------------------------- */

  const refreshConsultations = useCallback(
    async (q: string) => {
      try {
        setConsultLoading(true);
        const data = await listConsultationsLite({ q, limit: 20 });
        setConsultations(data);
      } catch (e) {
        console.error("Erro ao listar consultas:", e);
      } finally {
        setConsultLoading(false);
      }
    },
    []
  );

  useEffect(() => { if (openCreate) refreshConsultations(""); }, [openCreate, refreshConsultations]);

  useEffect(() => {
    const id = setTimeout(() => { if (openCreate) refreshConsultations(consultQuery.trim()); }, 300);
    return () => clearTimeout(id);
  }, [consultQuery, openCreate, refreshConsultations]);

  /* -------------------------------- KPIs -------------------------------- */

  const currentCurrency: Currency = "MZN";

  // 2) Visibilidade: se PAI, tenta limitar às suas faturas (fallback: tudo)
  const visibleInvoices = useMemo(() => {
    if (currentRole !== "PAI" || !user?.id) return invoices;
    // Tentamos várias chaves comuns de owner; se nenhuma existir, não filtramos
    const hasOwnerKey = invoices.some(
      (i) => typeof i.ownerUserId === "number" || typeof i.parentId === "number" || typeof i.userId === "number"
    );
    if (!hasOwnerKey) return invoices; // provavelmente o backend já filtra por autenticação

    const uid = Number(user.id);
    return invoices.filter(
      (i) =>
        (typeof i.ownerUserId === "number" && i.ownerUserId === uid) ||
        (typeof i.parentId === "number" && i.parentId === uid) ||
        (typeof i.userId === "number" && i.userId === uid)
    );
  }, [invoices, currentRole, user?.id]);

  const overdueInvoices = useMemo(
    () => visibleInvoices.filter((i) => i.status === "Overdue"),
    [visibleInvoices]
  );

  const outstandingTotal = useMemo(
    () => visibleInvoices.filter((i) => i.status !== "Paid")
                  .reduce((acc, i) => acc + i.amount, 0),
    [visibleInvoices]
  );

  const overdueTotal = useMemo(
    () => overdueInvoices.reduce((acc, i) => acc + i.amount, 0),
    [overdueInvoices]
  );

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return visibleInvoices
      .filter((i) => i.status === "Paid" && parseISO(i.date).getFullYear() === y && parseISO(i.date).getMonth() === m)
      .reduce((acc, i) => acc + i.amount, 0);
  }, [visibleInvoices]);

  const nextDue = useMemo(() => {
    const pendings = visibleInvoices.filter((i) => i.status !== "Paid");
    if (!pendings.length) return null;
    return pendings.sort(
      (a, b) => parseISO(a.dueDate || a.date).getTime() - parseISO(b.dueDate || b.date).getTime()
    )[0];
  }, [visibleInvoices]);

  const mostOverdue = useMemo(() => {
    if (!overdueInvoices.length) return null;
    return overdueInvoices
      .slice()
      .sort((a, b) => parseISO(a.dueDate || a.date).getTime() - parseISO(b.dueDate || b.date).getTime())[0];
  }, [overdueInvoices]);

  /* ------------------------------- Filtro -------------------------------- */

  const filtered = useMemo(() => {
    let data = [...visibleInvoices];

    if (chip === "Outstanding") data = data.filter((i) => i.status !== "Paid");
    if (chip === "Overdue") data = data.filter((i) => i.status === "Overdue");
    if (chip === "Paid") data = data.filter((i) => i.status === "Paid");
    if (chip === "Partially") data = data.filter((i) => i.status === "Pending"); // sem “partial” no backend

    const q = query.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (i) =>
          String(i.id).toLowerCase().includes(q) ||
          (i.number ?? "").toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    if (fromDate) {
      const t = new Date(fromDate).getTime();
      data = data.filter((i) => parseISO(i.date).getTime() >= t);
    }
    if (toDate) {
      const t = new Date(toDate).getTime();
      data = data.filter((i) => parseISO(i.date).getTime() <= t);
    }

    data.sort((a, b) => {
      if (sortBy === "date") {
        const da = parseISO(a.date).getTime();
        const db = parseISO(b.date).getTime();
        return asc ? da - db : db - da;
      }
      if (sortBy === "amount") return asc ? a.amount - b.amount : b.amount - a.amount;
      const order: InvoiceStatus[] = ["Overdue", "Failed", "Pending", "Paid"];
      const diff = order.indexOf(a.status) - order.indexOf(b.status);
      return asc ? diff : -diff;
    });

    return data;
  }, [visibleInvoices, chip, query, fromDate, toDate, sortBy, asc]);

  /* ----------------------------- Utilidades ------------------------------ */

  const exportCSV = useCallback(() => {
    const header = ["Número", "FaturaID", "Data", "Vencimento", "Valor", "Estado", "Descrição"].join(",");
    const rows = filtered.map((i) =>
      [i.number ?? "", i.id, i.date, i.dueDate || "", i.amount, i.status, `"${i.description.replace(/"/g, '""')}"`].join(",")
    );
    const blob = new Blob([`${header}\n${rows.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `faturas_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const downloadInvoice = useCallback(async (inv: Invoice) => {
    await apiDownloadInvoicePDF(Number(inv.id), `invoice_${inv.number ?? inv.id}.pdf`);
  }, []);

  const setInvoiceStatus = useCallback(async (id: number | string, uiStatus: InvoiceStatus) => {
    try {
      setWorkingId(id);
      const apiStatus = uiToApiStatus(uiStatus);
      const updated = await apiUpdateInvoiceStatus(Number(id), apiStatus);
      const ui = dtoToUi(updated);
      setInvoices((prev) => prev.map((i) => (i.id === ui.id ? ui : i)));
    } catch (e) {
      console.error("Erro ao atualizar estado:", e);
      alert("Não foi possível atualizar o estado da fatura.");
    } finally {
      setWorkingId(null);
    }
  }, []);

  const uploadProof = useCallback(async (id: number | string, file: File) => {
    try {
      setWorkingId(id);
      const updated = await apiUploadPaymentProof(Number(id), file);
      const ui = dtoToUi(updated);
      setInvoices((prev) => prev.map((i) => (i.id === ui.id ? ui : i)));
    } catch (e) {
      console.error("Erro ao anexar comprovativo:", e);
      alert("Falha ao anexar comprovativo.");
    } finally {
      setWorkingId(null);
    }
  }, []);

  const createInvoice = useCallback(async () => {
    try {
      if (!selectedConsult) { alert("Seleciona a consulta."); return; }
      const { amount, description } = createForm;
      if (!amount) { alert("Indica o valor."); return; }

      setCreating(true);

      const created = await apiCreateInvoiceForConsultation(Number(selectedConsult.id), {
        number: `INV-C${selectedConsult.id}-${Date.now()}`,
        date: new Date().toISOString(),
        total: Number(amount),
        status: "pending",
        description: description || `Consulta #${selectedConsult.id} • ${selectedConsult.childName} com ${selectedConsult.psychologistName || "Psicólogo"}`,
      } as any);

      const ui = dtoToUi(created);
      setInvoices((prev) => [ui, ...prev]);
      setOpenCreate(false);
      setCreateForm({ amount: "", description: "" });
      setSelectedConsult(null);
      setConsultQuery("");
      alert("Fatura criada com sucesso!");
    } catch (e: any) {
      console.error("Erro ao criar fatura:", e);
      alert(e?.response?.data?.detail || "Falha ao criar fatura.");
    } finally {
      setCreating(false);
    }
  }, [createForm, selectedConsult]);

  /* -------------------------------- UI ---------------------------------- */

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 min-h-0">
      {/* Header + ações principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Faturação</h1>
          <p className="text-gray-600 mt-1">Gestão de faturas, pagamentos e cobertura</p>
          <Badge className="mt-2">
            {roleLabels[currentRole]} • {user?.name || user?.email}
          </Badge>
        </div>

        <div className="hidden sm:flex gap-2">
          {/* ADMIN: botão criar fatura no header */}
          {currentRole === "ADMIN" && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setOpenCreate(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Criar Fatura
            </Button>
          )}

        </div>
      </div>

      {/* Chips + Busca + Datas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(Object.keys(chipLabels) as ChipKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setChip(k)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                chip === k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {chipLabels[k]}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Pesquisa por número, ID ou palavra-chave…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="border rounded-lg px-3 py-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-gray-500">a</span>
            <input type="date" className="border rounded-lg px-3 py-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPIs (já usam visibleInvoices) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-600">Saldo em Aberto</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-red-600">
                {fmtMoney(outstandingTotal, currentCurrency)}
              </span>
              <AlertTriangleIcon className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {visibleInvoices.filter((i) => i.status !== "Paid").length} faturas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-600">Valor em Atraso</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-orange-600">
                {fmtMoney(overdueTotal, currentCurrency)}
              </span>
              <ClockIcon className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overdueInvoices.length} fatura(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-600">Pago este Mês</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-green-600">
                {fmtMoney(paidThisMonth, currentCurrency)}
              </span>
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {visibleInvoices.filter((i) => i.status === "Paid").length} pagas no total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-600">Próximo Pagamento</p>
            {nextDue ? (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 mt-1">
                  {new Date(nextDue.dueDate || nextDue.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {fmtMoney(nextDue.amount, currentCurrency)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-2">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta de fatura vencida */}
      {mostOverdue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">
                    1 fatura vencida requer atenção
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Fatura <strong>#{mostOverdue.number ?? mostOverdue.id}</strong> está{" "}
                    <strong>
                      {Math.max(
                        0,
                        Math.ceil(
                          (Date.now() - parseISO(mostOverdue.dueDate || mostOverdue.date).getTime()) /
                          (1000 * 60 * 60 * 24)
                        )
                      )}
                    </strong>{" "}
                    dia(s) em atraso ({fmtMoney(mostOverdue.amount, mostOverdue.currency)}).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentRole === "PAI" ? (
                  <>
                    <input
                      id="proof-overdue"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadProof(mostOverdue.id, f);
                      }}
                    />
                    <label htmlFor="proof-overdue">
                      <Button className="bg-red-600 hover:bg-red-700 text-white">Pagar Agora</Button>
                    </label>
                    <Button variant="outline" onClick={() => alert("Suporte | FAQ (stub)")}>
                      Pedir Ajuda
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setInvoiceStatus(mostOverdue.id, "Paid")}
                      disabled={workingId === mostOverdue.id}
                    >
                      {workingId === mostOverdue.id ? "..." : "Marcar como Paga"}
                    </Button>
                    <Button variant="outline" onClick={() => alert("Contactar encarregado (stub)")}>
                      Pedir Ajuda
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs principais */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          {[{k:'invoices',label:'Faturas'},{k:'payments',label:'Pagamentos'},{k:'receipts',label:'Recibos'}].map(({k,label}) => (
            <button
              key={k}
              onClick={() => setTab(k as TabKey)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                tab === (k as TabKey) ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-current={tab === (k as TabKey) ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de faturas */}
      {tab === "invoices" && (
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            {/* Desktop – extras de ordenação/CSV + ADMIN criar */}
            <div className="hidden sm:flex justify-between items-center gap-2">
              <div />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="date">Ordenar por Data</option>
                    <option value="amount">Ordenar por Valor</option>
                    <option value="status">Ordenar por Estado</option>
                  </select>
                  <FilterIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <Button variant="outline" onClick={() => setAsc((v) => !v)} title="Inverter ordem">
                  {asc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button variant="outline" onClick={exportCSV}>
                  <DownloadIcon className="w-4 h-4" />
                </Button>
                {currentRole === "ADMIN" && (
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setOpenCreate(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Criar Fatura
                  </Button>
                )}
              </div>
            </div>

            {/* Lista Mobile (cards) */}
            <div className="grid grid-cols-1 gap-3 sm:hidden mt-4">
              {!loading && filtered.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  inv={inv}
                  userRole={currentRole}
                  onDownload={downloadInvoice}
                  onUploadProof={uploadProof}
                  onSetStatus={setInvoiceStatus}
                  workingId={workingId}
                />
              ))}
              {!loading && filtered.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  {query ? "Nenhuma fatura encontrada" : "Nenhuma fatura disponível"}
                </div>
              )}
              {loading && <div className="py-8 text-center text-gray-500">A carregar faturas...</div>}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden sm:block overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Fatura</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Data/Vencimento</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Sessões</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Valor</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Estado</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filtered.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      inv={inv}
                      userRole={currentRole}
                      onDownload={downloadInvoice}
                      onUploadProof={uploadProof}
                      onSetStatus={setInvoiceStatus}
                      workingId={workingId}
                    />
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-gray-500" colSpan={6}>
                        {query ? "Nenhuma fatura encontrada" : "Nenhuma fatura disponível"}
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td className="py-8 text-center text-gray-500" colSpan={6}>A carregar faturas...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagamentos / Recibos (placeholders) */}
      {tab === "payments" && (
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Pagamentos</h2>
            <p className="text-gray-600 mt-1">Registos de pagamentos (em breve).</p>
            <div className="mt-4 border rounded-lg p-4 text-center text-gray-500">
              Ainda não há pagamentos para mostrar.
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "receipts" && (
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Recibos</h2>
            <p className="text-gray-600 mt-1">Lista de recibos emitidos (em breve).</p>
            <div className="mt-4 border rounded-lg p-4 text-center text-gray-500">
              Nenhum recibo disponível no momento.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Criar Fatura (ADMIN) */}
      {currentRole === "ADMIN" && (
        <Modal
          open={openCreate}
          onClose={() => {
            setOpenCreate(false);
            setSelectedConsult(null);
            setConsultQuery("");
            setCreateForm({ amount: "", description: "" });
          }}
          title="Criar Nova Fatura"
          maxWidth="max-w-2xl"
        >
          {/* Seleção de consulta com pesquisa */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 font-medium">Selecionar Consulta *</label>
              <div className="mt-2 border border-gray-300 rounded-lg">
                {/* Barra de pesquisa */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-t-lg"
                    placeholder="Pesquisar por nome da criança, psicólogo, ID da consulta..."
                    value={consultQuery}
                    onChange={(e) => setConsultQuery(e.target.value)}
                  />
                </div>

                {/* Selecionada */}
                {selectedConsult && (
                  <div className="flex items-center justify-between px-3 py-2 border-t bg-blue-50">
                    <div className="text-sm text-blue-900">
                      <span className="font-semibold">Consulta #{selectedConsult.id}</span> • {new Date(selectedConsult.date).toLocaleString()} •{" "}
                      <span className="inline-flex items-center gap-1"><BabyIcon className="w-4 h-4" />{selectedConsult.childName}</span> •{" "}
                      <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />{selectedConsult.psychologistName || "Psicólogo"}</span>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900" onClick={() => setSelectedConsult(null)} title="Limpar seleção">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Resultados */}
                <div className="max-h-56 overflow-auto divide-y">
                  {consultLoading && <div className="px-3 py-3 text-sm text-gray-500">A procurar…</div>}
                  {!consultLoading && consultations.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-500">Sem resultados para esta pesquisa.</div>
                  )}
                  {!consultLoading && consultations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedConsult?.id === c.id ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedConsult(c)}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        Consulta #{c.id} • {new Date(c.date).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 mr-3"><BabyIcon className="w-3.5 h-3.5" />{c.childName}</span>
                        <span className="inline-flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{c.psychologistName || "Psicólogo"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Dica: escreve parte do nome da criança, do psicólogo ou o número da consulta.</p>
            </div>

            {/* Valor */}
            <div>
              <label className="text-sm text-gray-700 font-medium">Valor (MZN) *</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Descrição (opcional) */}
            <div>
              <label className="text-sm text-gray-700 font-medium">Descrição</label>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Ex.: Sessão individual 50min"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                setSelectedConsult(null);
                setConsultQuery("");
                setCreateForm({ amount: "", description: "" });
              }}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={createInvoice} disabled={creating || !selectedConsult || !createForm.amount}>
              {creating ? "A criar..." : "Criar Fatura"}
            </Button>
          </div>
        </Modal>
      )}

      {/* FAB mobile (ADMIN) */}
      {currentRole === "ADMIN" && (
        <button
          aria-label="Criar fatura"
          onClick={() => setOpenCreate(true)}
          className="sm:hidden fixed bottom-20 right-4 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default Billing;
