// src/pages/admin/ManageConsultation.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  User,
  Baby,
  Eye,
  RefreshCw,
  AlertCircle,
  MessageSquareText,
  Search,
  SortDesc,
  SortAsc,
  FilterX,
} from "lucide-react";
import { toast } from "react-toastify";
import ConsultationDetailModal from "./ConsultationDetailModal";
import { getConsultations, type Consultation } from "@/service/consultaionService";

// Estende o tipo do service para aceitar includes do backend (child / psychologist)
type ConsultationRow = Consultation & {
  child?: { id: number; name: string };
  psychologist?: { id: number; name: string };
};

// Filtros
type StatusFilter = "all" | "scheduled" | "done" | "cancelled";
type RecencyFilter = "all" | "upcoming" | "today" | "last7" | "last30" | "past";
type SortOrder = "date_desc" | "date_asc";

const ManageConsultation: React.FC = () => {
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  // filtros UI
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");

  const load = async (isRefresh = false) => {
    setError(null);
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await getConsultations();
      setConsultations((Array.isArray(data) ? data : []) as ConsultationRow[]);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Erro ao carregar consultas.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusPill = (s?: Consultation["status"]) => {
    const status = (s || "scheduled").toString().toLowerCase();
    const color =
      status === "done"
        ? "bg-green-100 text-green-800"
        : status === "cancelled"
        ? "bg-red-100 text-red-800"
        : "bg-blue-100 text-blue-800";
    const label =
      status === "done"
        ? "Concluída"
        : status === "cancelled"
        ? "Cancelada"
        : "Agendada";
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{label}</span>
    );
  };

  const parseDateTime = (c: ConsultationRow) => {
    // junta data + hora para ordenar e filtrar corretamente
    const dateStr = c.date;
    const timeStr = c.time || "00:00";
    return new Date(`${dateStr}T${timeStr}:00`);
  };

  // aplica filtros/ordenação/busca
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);

    let rows = consultations.slice();

    // status
    if (statusFilter !== "all") {
      rows = rows.filter((c) => (c.status || "scheduled").toLowerCase() === statusFilter);
    }

    // recência
    rows = rows.filter((c) => {
      const dt = parseDateTime(c);
      switch (recencyFilter) {
        case "today":
          return dt >= startOfToday && dt <= endOfToday;
        case "upcoming":
          return dt > now;
        case "last7":
          return dt >= last7 && dt <= now;
        case "last30":
          return dt >= last30 && dt <= now;
        case "past":
          return dt < now;
        default:
          return true;
      }
    });

    // busca (criança/psicólogo/motivo)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((c) => {
        const childName = c.child?.name?.toLowerCase() || "";
        const psyName = c.psychologist?.name?.toLowerCase() || "";
        const reason = c.reason?.toLowerCase() || "";
        return (
          childName.includes(q) ||
          psyName.includes(q) ||
          reason.includes(q) ||
          String(c.id).includes(q)
        );
      });
    }

    // ordenação
    rows.sort((a, b) => {
      const da = parseDateTime(a).getTime();
      const db = parseDateTime(b).getTime();
      return sortOrder === "date_desc" ? db - da : da - db;
    });

    return rows;
  }, [consultations, statusFilter, recencyFilter, searchTerm, sortOrder]);

  const clearFilters = () => {
    setStatusFilter("all");
    setRecencyFilter("all");
    setSearchTerm("");
    setSortOrder("date_desc");
  };

  if (loading) {
    return (
      <div className="h-64 grid place-items-center text-gray-600">
        Carregando consultas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 grid place-items-center">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button
            className="ml-3 px-3 py-1 text-sm bg-red-600 text-white rounded-md"
            onClick={() => load()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header + Refresh */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Consultas</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border rounded-xl p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Busca */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por criança, psicólogo, motivo ou ID…"
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendadas</option>
                <option value="done">Concluídas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>

            {/* Recência */}
            <div>
              <select
                value={recencyFilter}
                onChange={(e) => setRecencyFilter(e.target.value as RecencyFilter)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as datas</option>
                <option value="today">Hoje</option>
                <option value="upcoming">Próximas</option>
                <option value="last7">Últimos 7 dias</option>
                <option value="last30">Últimos 30 dias</option>
                <option value="past">Passadas</option>
              </select>
            </div>

            {/* Ordenar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSortOrder((prev) =>
                    prev === "date_desc" ? "date_asc" : "date_desc"
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50"
                title={sortOrder === "date_desc" ? "Ordenar por data ↑" : "Ordenar por data ↓"}
              >
                {sortOrder === "date_desc" ? (
                  <>
                    <SortDesc className="w-4 h-4" />
                    Data ↓
                  </>
                ) : (
                  <>
                    <SortAsc className="w-4 h-4" />
                    Data ↑
                  </>
                )}
              </button>

              <button
                onClick={clearFilters}
                className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50"
                title="Limpar filtros"
              >
                <FilterX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contador */}
          <div className="text-xs text-gray-500 mt-2">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <div className="text-gray-500">Nenhuma consulta encontrada.</div>
        ) : (
          <div className="overflow-x-auto bg-white border rounded-xl">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="p-3 w-16">ID</th>
                  <th className="p-3 w-36">Data</th>
                  <th className="p-3 w-28">Hora</th>
                  <th className="p-3 w-56">Criança</th>
                  <th className="p-3 w-56">Psicólogo</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-28">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const childName = c.child?.name ?? `#${c.childId}`;
                  const psyName = c.psychologist?.name ?? `#${c.psychologistId}`;
                  const reason = c.reason || "-";
                  return (
                    <tr key={c.id} className="border-t text-sm align-middle">
                      <td className="p-3 font-medium text-gray-900">{c.id}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(c.date).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{c.time}</td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-2">
                          <Baby className="w-4 h-4 text-gray-400" />
                          <span
                            title={childName}
                            className="truncate max-w-[220px] inline-block align-middle"
                          >
                            {childName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span
                            title={psyName}
                            className="truncate max-w-[220px] inline-block align-middle"
                          >
                            {psyName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-start gap-2 max-w-[420px]">
                          <MessageSquareText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="truncate" title={reason}>
                            {reason}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">{statusPill(c.status)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setDetailId(c.id);
                            setDetailOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4" /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      <ConsultationDetailModal
        open={detailOpen}
        consultationId={detailId}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
};

export default ManageConsultation;
