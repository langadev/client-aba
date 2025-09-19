/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listReports,
  getReportFullById,
  createReport,
  updateReport,
  deleteReport,
  downloadReportForConsultation,
  type ReportDTO,
  type Paginated,
} from "../api/repository/reportRepository";
import { useAuthStore } from "@/store/userStore";

import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  FileText as FileTextIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Loader2 as LoaderIcon,
  X as XIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Scale as ScaleIcon,
  Eye as EyeIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Share2 as ShareIcon,
  MessageSquare as MessageSquareIcon,
  Clock,
  ChartNoAxesCombined,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Area,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* ------------------------------ Helpers ------------------------------ */

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const viewsOf = (r: ReportDTO) =>
  (r as any).views ?? (r as any).viewCount ?? (r as any).visualizacoes ?? 0;

type ReportKind = "all" | "progress" | "assessment" | "billing" | "other";
const kindLabel: Record<ReportKind, string> = {
  all: "Todos",
  progress: "Progresso",
  assessment: "Avaliações",
  billing: "Faturação",
  other: "Outros Doc.",
};
function getKind(r: ReportDTO): ReportKind {
  const t = ((r as any).type || (r as any).category || "").toString().toLowerCase();
  if (t.includes("progress")) return "progress";
  if (t.includes("assessment") || t.includes("avali")) return "assessment";
  if (t.includes("billing") || t.includes("fatur")) return "billing";
  return "other";
}
const inRange = (iso?: string, from?: string, to?: string) => {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
};

/* -------------------- Série “Progress Overview (6m)” ------------------- */
function buildSixMonthSeries(reports: ReportDTO[]) {
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${start.getFullYear()}-${start.getMonth()}`;
    const label = start.toLocaleString("en-US", { month: "long" });
    months.push({ key, label, start, end });
  }

  const counts = months.map(({ start, end }) =>
    reports.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length
  );
  const maxCount = Math.max(1, ...counts);

  return months.map((m, idx) => {
    const w = counts[idx] / maxCount; // 0..1
    const overall = Math.min(100, Math.round(40 + idx * 6 + w * 8));
    const goals = Math.min(100, Math.round(38 + idx * 6.5 + w * 10));
    const attendance = Math.min(100, Math.round(83 + idx * 2.5 + w * 3));
    return { month: m.label, overall, goals, attendance };
  });
}

/* -------------------------------- View -------------------------------- */

export default function ReportList() {
  const user = useAuthStore((s) => s.user);
  const isPsychologist = useMemo(() => {
    const role = (user?.role || "").toUpperCase();
    return role.includes("PSICOLOGO") || role.includes("THERAPIST") || role.includes("PSYCHOLOGIST");
  }, [user]);

  // dados
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [pagination, setPagination] = useState<Paginated<ReportDTO>["pagination"]>();
  const [selected, setSelected] = useState<ReportDTO | null>(null);

  // estados
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // filtros
  const [kind, setKind] = useState<ReportKind>("all");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // formulário (para modal)
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consultationId, setConsultationId] = useState<number | "">("");

  useEffect(() => {
    fetchReports(1, 12);
  }, []);

  const fetchReports = async (page = 1, pageSize = 12) => {
    try {
      setLoading(true);
      setError(null);
      const res = await listReports({ page, pageSize });
      setReports(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const full = await getReportFullById(id);
      setSelected(full);
      setFormMode(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setSelected(null);
    setFormMode("create");
    setTitle("");
    setDescription("");
    setConsultationId("");
    setError(null);
    setSuccess(null);
  };
  const startEdit = (r: ReportDTO) => {
    setSelected(r);
    setFormMode("edit");
    setTitle(r.title || "");
    setDescription(r.description || "");
    setConsultationId(r.consultationId || "");
    setError(null);
    setSuccess(null);
  };
  const resetForm = () => {
    setFormMode(null);
    setTitle("");
    setDescription("");
    setConsultationId("");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPsychologist) return;

    if (!title.trim() || !description.trim() || (!consultationId && formMode === "create")) {
      setError("Preencha título, descrição e ID da consulta.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (formMode === "create") {
        const created = await createReport({
          title: title.trim(),
          description: description.trim(),
          consultationId: Number(consultationId),
        });
        setReports((prev) => [created, ...prev]);
        resetForm();
        setSelected(created);
        setSuccess("Relatório criado com sucesso!");
      } else if (formMode === "edit" && selected) {
        const updated = await updateReport(selected.id, {
          title: title.trim(),
          description: description.trim(),
        });
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setSelected(updated);
        resetForm();
        setSuccess("Relatório atualizado com sucesso!");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erro ao guardar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isPsychologist) return;
    if (!confirm("Tem certeza que deseja eliminar este relatório?")) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
      resetForm();
      setSuccess("Relatório eliminado com sucesso!");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erro ao eliminar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cId: number) => {
    try {
      setDownloadingId(cId);
      setError(null);
      await downloadReportForConsultation(cId);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erro ao baixar documento");
    } finally {
      setDownloadingId(null);
    }
  };

  const exportAll = async () => {
    for (const r of filtered) {
      await handleDownload(r.consultationId);
    }
  };

  /* ------------------------- Filtros + métricas ------------------------- */

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return reports
      .filter((r) => (kind === "all" ? true : getKind(r) === kind))
      .filter((r) => (qn ? `${r.title} ${r.description}`.toLowerCase().includes(qn) : true))
      .filter((r) => inRange(r.createdAt, dateFrom, dateTo));
  }, [reports, kind, q, dateFrom, dateTo]);

  const totalReports = filtered.length;
  const latestReport = useMemo(
    () => filtered.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0],
    [filtered]
  );
  const mostViewed = useMemo(
    () => filtered.slice().sort((a, b) => viewsOf(b) - viewsOf(a))[0],
    [filtered]
  );
  const trendPct = useMemo(() => {
    const byQuarter = new Map<string, number>();
    filtered.forEach((r) => {
      const d = new Date(r.createdAt);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const key = `${d.getFullYear()}-Q${q}`;
      byQuarter.set(key, (byQuarter.get(key) ?? 0) + 1);
    });
    const keys = Array.from(byQuarter.keys()).sort();
    if (keys.length < 2) return 0;
    const last = byQuarter.get(keys[keys.length - 1]) ?? 0;
    const prev = byQuarter.get(keys[keys.length - 2]) ?? 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [filtered]);

  const progressData = useMemo(() => buildSixMonthSeries(filtered), [filtered]);

  /* -------------------------------- UI -------------------------------- */

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Cabeçalho + Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relatórios</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white">
            <ScaleIcon className="w-4 h-4 mr-2" />
            Comparar Relatórios
          </Button>
          <Button onClick={exportAll} className="bg-green-600 hover:bg-green-700 text-white">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Exportar Tudo (PDF)
          </Button>
          {isPsychologist && (
            <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              <PlusIcon className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          )}
        </div>
      </div>

      {/* Abas/Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(["all", "progress", "assessment", "billing", "other"] as ReportKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${kind === k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
            >
              {k === "all" ? "Todos os Relatórios" : kindLabel[k]}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* busca */}
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Pesquisar relatórios…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* datas */}
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-gray-500">a</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg line-clamp-1 font-bold">Total de Relatórios</CardTitle>
            <FileTextIcon className="w-6 h-6 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{totalReports}</span>
            </div>
            <p className="text-md text-center text-gray-500 mt-1">Disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg line-clamp-1 font-bold">Ultimo Relatório</CardTitle>
            <Clock className="w-6 h-6 text-green-600" />
          </CardHeader>
          <CardContent className="p-4">
            {latestReport ? (
              <>
                <div className="text-xl font-semibold text-gray-900  text-center">{fmt(latestReport.createdAt)}</div>
                <p className="text-md text-gray-500 mt-1 line-clamp-1 text-center">{latestReport.title}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-2">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg line-clamp-1 font-bold">Mais Visto</CardTitle>
            <EyeIcon className="w-6 h-6 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4">
            {mostViewed ? (
              <>
                <div className="text-base font-semibold text-center text-gray-900  line-clamp-1">
                  {mostViewed.title || "Relatório"}
                </div>
                <p className=" text-md text-center text-gray-600 mt-1">
                  {viewsOf(mostViewed)} visualizações
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-2">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg line-clamp-1 font-bold">Tendência</CardTitle>
            <ChartNoAxesCombined className="w-6 h-6 text-orange-600" />
          </CardHeader>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold text-center ${trendPct >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trendPct >= 0 ? "+" : ""}
              {trendPct}% <TrendingUpIcon className="inline w-5 h-5 ml-1" />
            </div>
            <p className="text-md text-center text-gray-500 mt-1">vs. trimestre anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview (6 months) */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle>Progress Overview - Last 6 Months</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <button className="text-gray-500 hover:text-gray-900">Goals</button>
            <button className="text-blue-700 font-semibold">Overall Progress</button>
            <button className="text-gray-500 hover:text-gray-900">Sessions</button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ top: 10, right: 20, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickMargin={8} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={38} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
                <Area type="monotone" dataKey="overall" stroke="none" fill="#3b82f680" fillOpacity={0.15} />
                <Line type="monotone" dataKey="overall" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="goals" stroke="#10b981" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="attendance" stroke="#8b5cf6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Destaque: último relatório */}
      {/* {latestReport && (
        <Card className="mt-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileTextIcon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {latestReport.title || "Progress Summary"}
                  </h3>
                  <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                    Progress Report
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">Final</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                  <div className="inline-flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {latestReport.consultation?.psychologist?.name || "Dr(a). responsável"}
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    Criado: {fmt(latestReport.createdAt)}
                  </div>
                  {latestReport.updatedAt && (
                    <div className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      Atualizado: {fmt(latestReport.updatedAt)}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" /> {viewsOf(latestReport)} views
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <MessageSquareIcon className="w-4 h-4" /> {(latestReport as any).comments ?? 0} comentários
                  </div>
                </div>

                {latestReport.description && (
                  <p className="text-gray-700 text-sm mt-3 line-clamp-3">
                    {latestReport.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="outline" onClick={() => handleSelect(latestReport.id)}>
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(latestReport.consultationId)}
                    disabled={downloadingId === latestReport.consultationId}
                  >
                    {downloadingId === latestReport.consultationId ? (
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <DownloadIcon className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => console.log("share report", latestReport.id)}>
                    <ShareIcon className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={() => console.log("comment report", latestReport.id)}>
                    <MessageSquareIcon className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-100 border-green-200 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Grid/lista de cards */}
      {loading && !reports.length ? (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <LoaderIcon className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileTextIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório encontrado</h3>
            <p className="text-gray-600">Ajuste os filtros ou crie um novo relatório.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1  sm:gap-6">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isPsychologist={isPsychologist}
              handleDelete={handleDelete}
              handleDownload={handleDownload}
              downloadingId={downloadingId}
              handleSelect={handleSelect}
              startEdit={startEdit}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchReports(pagination.page - 1, pagination.pageSize)}
            className="flex items-center gap-2"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <span className="hidden sm:inline text-sm text-gray-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReports(pagination.page + 1, pagination.pageSize)}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ===== Modal (Dialog) de Criar/Editar Relatório ===== */}
      {isPsychologist && (
        <Dialog
          open={!!formMode}
          onOpenChange={(open) => {
            if (!open) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {formMode === "create" ? "Criar Novo Relatório" : "Editar Relatório"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do relatório e clique em {formMode === "create" ? "Criar" : "Atualizar"}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Relatório da sessão de 10/09"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Observações, evolução, recomendações..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID da Consulta</label>
                <Input
                  type="number"
                  value={consultationId}
                  onChange={(e) => setConsultationId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ex.: 12"
                  disabled={formMode === "edit"}
                  required={formMode === "create"}
                />
              </div>

              <DialogFooter className="flex gap-2 pt-2">
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  {loading ? (
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <SaveIcon className="w-4 h-4 mr-2" />
                  )}
                  {formMode === "create" ? "Criar Relatório" : "Atualizar Relatório"}
                </Button>

                <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                  <XIcon className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* FAB criar (mobile) */}
      {isPsychologist && (
        <button
          aria-label="Criar novo relatório"
          onClick={startCreate}
          className="sm:hidden fixed bottom-20 right-4 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

type ReportCardProps = {
  report: ReportDTO;
  isPsychologist: boolean;
  handleDownload: (cId: number) => void;
  downloadingId: number | null;
  startEdit: (r: ReportDTO) => void;
  handleSelect: (id: number) => void;
  handleDelete: (id: number) => void;
}

function ReportCard({
  report,
  isPsychologist,
  handleDownload,
  downloadingId,
  startEdit,
  handleSelect,
  // handleDelete,
}: ReportCardProps) {

  return(
        <Card className="mt-2 border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileTextIcon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {report.title || "Progress Summary"}
                  </h3>
                  <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                    Progress Report
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">Final</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                  <div className="inline-flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {report.consultation?.psychologist?.name || "Dr(a). responsável"}
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    Criado: {fmt(report.createdAt)}
                  </div>
                  {report.updatedAt && (
                    <div className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      Atualizado: {fmt(report.updatedAt)}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" /> {viewsOf(report)} views
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <MessageSquareIcon className="w-4 h-4" /> {(report as any).comments ?? 0} comentários
                  </div>
                </div>

                {report.description && (
                  <p className="text-gray-700 text-sm mt-3 line-clamp-3">
                    {report.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button className="text-gray-500 bg-gray-50 hover:text-gray-600 hover:bg-gray-100" variant="outline" onClick={() => handleSelect(report.id)}>
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                  className="text-blue-500 bg-blue-50 hover:text-blue-600 hover:bg-blue-100"
                    variant="outline"
                    onClick={() => handleDownload(report.consultationId)}
                    disabled={downloadingId === report.consultationId}
                  >
                    {downloadingId === report.consultationId ? (
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <DownloadIcon className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                  <Button variant="outline" className="text-green-500 bg-green-50 hover:text-green-600 hover:bg-green-100" onClick={() => console.log("share report", report.id)}>
                    <ShareIcon className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" className="text-orange-500 bg-orange-50 hover:text-orange-600 hover:bg-orange-100" onClick={() => console.log("comment report", report.id)}>
                    <MessageSquareIcon className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
  )
  return (
    <Card key={report.id} className="hover:shadow-md border-l-4 border-l-green-500 transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold line-clamp-1">
            {report.title}
          </CardTitle>
          {/* <Badge variant={report.id === selected?.id ? "default" : "outline"} className="shrink-0">
            #{report.consultationId}
          </Badge> */}
        </div>
        <CardDescription className="line-clamp-2">{report.description}</CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Criado em {fmt(report.createdAt)}
        </div>
        {report.consultation?.child && (
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="w-4 h-4 mr-2" />
            {/* <span className="truncate">{report.consultation.child.name}</span> */}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="px-2 sm:px-3 text-gray-500 bg-gray-50 hover:bg-gray-100" onClick={() => handleSelect(report.id)}>
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2 sm:px-3 text-blue-500 bg-blue-50 hover:bg-blue-100 hover:text-blue-600"
              onClick={() => handleDownload(report.consultationId)}
              disabled={downloadingId === report.consultationId}
            >
              {downloadingId === report.consultationId ? (
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <DownloadIcon className="w-4 h-4 mr-2" />
              )}
              <span className="hidden sm:inline">Baixar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>

          {isPsychologist && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
              <Button variant="outline" size="sm" className="px-2 sm:px-3 text-blue-500 bg-blue-50 hover:bg-blue-100 hover:text-blue-600" onClick={() => startEdit(report)}>
                <EditIcon className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">Editar</span>
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                className="px-2 sm:px-3 text-red-600 hover:text-red-700"
                onClick={() => handleDelete(report.id)}
              >
                <TrashIcon className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">Eliminar</span>
              </Button> */}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}