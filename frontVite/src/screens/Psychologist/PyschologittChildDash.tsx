import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Target,
  BarChart3,
  FileText,
  Clock,
  TrendingUp,
  MessageSquare,
  Plus,
  Edit3,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// SERVICES
import { getChildById, getParents, type Child, type UserDTO } from "@/service/childService";
import { getChildHealth, type ChildHealthDTO } from "@/service/childHealthService";
import { getConsultationsByChild, type Consultation } from "../../service/consultaionService";
import { getGoalsByChildId as fetchGoalsByChildId } from "@/service/goalService";

// ===== Helpers
const ageFromBirthdate = (birthdate?: string) => {
  if (!birthdate) return undefined;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return undefined;
  const diff = Date.now() - d.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const ptGender = (g?: "male" | "female" | "other") =>
  g === "male" ? "Masculino" : g === "female" ? "Feminino" : g ? "Outro" : "—";

const normalizeConsultationStatus = (s?: string) => {
  if (!s) return "scheduled";
  const k = s.toString().toLowerCase();
  if (k.includes("done")) return "completed";
  if (k.includes("cancel")) return "cancelled";
  if (k.includes("no_show") || k.includes("noshow")) return "no_show";
  return "scheduled";
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return "bg-green-500";
  if (progress >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const s = (status || "").toLowerCase();
  if (s === "active") return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
  if (s === "completed") return <Badge className="bg-blue-100 text-blue-800">Concluída</Badge>;
  if (s === "in-progress" || s === "in_progress")
    return <Badge className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>;
  if (s === "scheduled") return <Badge className="bg-amber-100 text-amber-800">Agendada</Badge>;
  if (s === "cancelled") return <Badge className="bg-gray-200 text-gray-700">Cancelada</Badge>;
  if (s === "no_show") return <Badge className="bg-red-100 text-red-700">Falta</Badge>;
  return <Badge className="bg-gray-100 text-gray-800">{status || "—"}</Badge>;
};

// ===== UI types (apenas para esta tela)
type UISession = {
  id: number;
  date: string; // ISO
  duration?: string;
  notes?: string;
  status: "completed" | "scheduled" | "cancelled" | "no_show";
};

type UIGoal = {
  id: number;
  title: string;
  progress: number;
  status: "in-progress" | "completed" | "pending";
  deadline?: string;
};

function PsychologistChildDash() {
  const { id } = useParams();
  const childId = useMemo(() => Number(id), [id]);

  // Estados
  const [activeTab, setActiveTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [child, setChild] = useState<Child | null>(null);
  const [parent, setParent] = useState<UserDTO | null>(null);
  const [health, setHealth] = useState<ChildHealthDTO | null>(null);

  const [sessions, setSessions] = useState<UISession[]>([]);
  const [goals, setGoals] = useState<UIGoal[]>([]);
  const [reports, setReports] = useState<{ id: number; title: string; date: string; type: string }[]>(
    []
  ); // TODO: ligar a um reportService se existir

  // ===== Loads
  useEffect(() => {
    let mounted = true;
    if (!childId || Number.isNaN(childId)) return;
    (async () => {
      try {
        setLoading(true);

        // CHILD
        const c = await getChildById(childId);
        if (!mounted) return;
        setChild(c);

        // PARENT (via getParents e filtro pelo id)
        try {
          if (c.parentId != null) {
            const parents = await getParents();
            if (!mounted) return;
            const p = parents.find((u) => Number(u.id) === Number(c.parentId)) || null;
            setParent(p || null);
          } else {
            setParent(null);
          }
        } catch {
          setParent(null);
        }
      } catch (e) {
        console.error("Erro ao carregar criança:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [childId]);

  useEffect(() => {
    let mounted = true;
    if (!childId || Number.isNaN(childId)) return;
    (async () => {
      try {
        setLoadingHealth(true);
        const h = await getChildHealth(childId);
        if (!mounted) return;
        setHealth(h);
      } catch (e) {
        console.error("Erro ao carregar saúde/diagnósticos:", e);
        setHealth(null);
      } finally {
        if (mounted) setLoadingHealth(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [childId]);

  useEffect(() => {
    let mounted = true;
    if (!childId || Number.isNaN(childId)) return;
    (async () => {
      try {
        setLoadingSessions(true);
        const list = await getConsultationsByChild(childId);
        if (!mounted) return;
        const mapped: UISession[] = list
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((c) => ({
            id: c.id,
            date: c.date,
            duration: undefined, // se o backend trouxer, mapeia aqui
            notes: c.notes || c.reason || "",
            status: normalizeConsultationStatus(c.status) as UISession["status"],
          }));
        setSessions(mapped);
      } catch (e) {
        console.error("Erro ao carregar sessões:", e);
        setSessions([]);
      } finally {
        if (mounted) setLoadingSessions(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [childId]);

  useEffect(() => {
    let mounted = true;
    if (!childId || Number.isNaN(childId)) return;
    (async () => {
      try {
        setLoadingGoals(true);
        const raw = await fetchGoalsByChildId(childId);
        if (!mounted) return;
        const mapped: UIGoal[] = (raw || []).map((g: any) => ({
          id: g.id,
          title: g.title || g.name || `Meta #${g.id}`,
          progress:
            typeof g.progress === "number"
              ? Math.max(0, Math.min(100, Math.round(g.progress)))
              : 0,
          status:
            g.status === "completed"
              ? "completed"
              : g.status === "pending"
              ? "pending"
              : "in-progress",
          deadline: g.dueDate || g.targetDate || undefined,
        }));
        setGoals(mapped);
      } catch (e) {
        console.error("Erro ao carregar metas:", e);
        setGoals([]);
      } finally {
        if (mounted) setLoadingGoals(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [childId]);

  // ===== Derivados p/ UI
  const childName = child?.name || "—";
  const age = child?.birthdate ? ageFromBirthdate(child.birthdate) : undefined;
  const gender = child?.gender ? ptGender(child.gender) : "—";
  const diagnosis =
    (!loadingHealth && (health?.diagnoses || health?.notes)) ||
    "Sem diagnóstico registrado";
  const parentName = parent?.name || "—";
  const parentContact = [parent?.email, parent?.phone].filter(Boolean).join(" • ") || "—";

  const nextSessionDate = useMemo(() => {
    const upcoming = sessions
      .filter((s) => s.status === "scheduled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return upcoming?.date;
  }, [sessions]);

  const attendanceRate = useMemo(() => {
    if (!sessions.length) return 0;
    const completed = sessions.filter((s) => s.status === "completed").length;
    return Math.round((completed / sessions.length) * 100);
  }, [sessions]);

  const activeGoalsCount = goals.filter((g) => g.status === "in-progress").length;

  // ===== Loading geral (primeiro paint)
  if (loading && !child) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="h-7 w-1/3 bg-gray-100 rounded animate-pulse" />
        <Card>
          <CardContent className="p-6">
            <div className="h-20 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard da Criança</h1>
          <p className="text-gray-600">Acompanhamento terapêutico individual</p>
        </div>
        
      </div>

      {/* Informações da Criança */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24 border-4 border-blue-100 shrink-0">
              <AvatarImage src={`/api/placeholder/96/96`} alt={childName} />
              <AvatarFallback className="text-2xl bg-blue-100">
                {childName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900 break-words">{childName}</h2>
                <StatusBadge status="active" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Idade</p>
                  <p className="font-medium">{age != null ? `${age} anos` : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Género</p>
                  <p className="font-medium">{gender}</p>
                </div>
                <div>
                  <p className="text-gray-500">Diagnóstico</p>
                  <p className="font-medium break-words">
                    {loadingHealth ? "A carregar…" : diagnosis}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Início da Terapia</p>
                  <p className="font-medium">
                    {child?.createdAt
                      ? new Date(child.createdAt).toLocaleDateString("pt-PT")
                      : "—"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-500">Encarregado</p>
                  <p className="font-medium break-words">{parentName}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-500">Contacto</p>
                  <p className="font-medium break-words">{parentContact}</p>
                </div>
              </div>

              {health?.notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Notas: </span>
                    {health.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Sessões</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Sessões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingSessions ? "—" : sessions.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">desde o início</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Taxa de Comparecimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingSessions ? "—" : `${attendanceRate}%`}
                </div>
                <p className="text-xs text-gray-500 mt-1">últimos registos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Metas Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingGoals ? "—" : activeGoalsCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">em progresso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Próxima Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {loadingSessions
                    ? "—"
                    : nextSessionDate
                    ? new Date(nextSessionDate).toLocaleDateString("pt-PT")
                    : "Não agendada"}
                </div>
                <p className="text-xs text-gray-500 mt-1">Confirmação pendente</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas Sessões */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Últimas Sessões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="text-sm text-gray-500">A carregar…</div>
                ) : sessions.length === 0 ? (
                  <div className="text-sm text-gray-500">Sem sessões ainda.</div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {sessions.slice(0, 3).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {new Date(session.date).toLocaleDateString("pt-PT")}
                            </p>
                            <p className="text-sm text-gray-600">
                              {session.duration || "—"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {session.notes || "Sem notas"}
                            </p>
                          </div>
                          <StatusBadge status={session.status} />
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("sessions")}
                    >
                      Ver todas as sessões
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Progresso das Metas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Progresso das Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingGoals ? (
                  <div className="text-sm text-gray-500">A carregar…</div>
                ) : goals.length === 0 ? (
                  <div className="text-sm text-gray-500">Sem metas registadas.</div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {goals.slice(0, 3).map((goal) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm break-words">{goal.title}</span>
                            <span className="text-sm font-bold">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className={getProgressColor(goal.progress)} />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              Prazo:{" "}
                              {goal.deadline
                                ? new Date(goal.deadline).toLocaleDateString("pt-PT")
                                : "—"}
                            </span>
                            <StatusBadge status={goal.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("goals")}
                    >
                      Ver todas as metas
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Sessões */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sessões</CardTitle>
              <CardDescription>
                Todas as sessões realizadas com {childName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="text-sm text-gray-500">A carregar…</div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-gray-500">Sem sessões registadas.</div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <span className="font-semibold">
                            {new Date(session.date).toLocaleDateString("pt-PT", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-sm text-gray-500">Duração</p>
                          <p className="font-medium">{session.duration || "—"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Notas da Sessão</p>
                          <p className="font-medium break-words">{session.notes || "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Editar Notas
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Relatório
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Metas */}
        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Metas de Terapia</CardTitle>
              <CardDescription>
                Objetivos terapêuticos e progresso de {childName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingGoals ? (
                <div className="text-sm text-gray-500">A carregar…</div>
              ) : goals.length === 0 ? (
                <div className="text-sm text-gray-500">Sem metas registadas.</div>
              ) : (
                <>
                  <div className="space-y-6">
                    {goals.map((goal) => (
                      <Card key={goal.id} className="border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4 gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold break-words">{goal.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <StatusBadge status={goal.status} />
                                <span className="text-sm text-gray-500">
                                  Prazo:{" "}
                                  {goal.deadline
                                    ? new Date(goal.deadline).toLocaleDateString("pt-PT")
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            <span className="text-2xl font-bold text-blue-600 shrink-0">
                              {goal.progress}%
                            </span>
                          </div>

                          <Progress
                            value={goal.progress}
                            className={`h-3 mb-4 ${getProgressColor(goal.progress)}`}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-500">Última Atualização</p>
                              <p className="font-medium">—</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Próxima Avaliação</p>
                              <p className="font-medium">—</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                            <Button variant="outline" size="sm">
                              <Edit3 className="w-4 h-4 mr-2" />
                              Atualizar Progresso
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button className="w-full mt-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Nova Meta
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>Documentos e avaliações de {childName}</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Sem relatórios. {/* TODO: ligar a reportService se disponível */}
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold break-words">{report.title}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(report.date).toLocaleDateString("pt-PT")} • {report.type}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Descarregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Relatório
                </Button>
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatório de Progresso
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

export default PsychologistChildDash;
