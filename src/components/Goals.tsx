"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getGoalsByChildId,
  createGoal,
  updateGoal,
  deleteGoal,
  type Goal,
} from "../api/repository/goalRepository";
import { getCategories, type Category } from "../api/repository/categoryRepository";
import {
  Target as TargetIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Plus as PlusIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  X as XIcon,
  Download as DownloadIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ============================== Tipos locais ============================== */

interface GoalWithMilestones extends Goal {
  milestones?: { text: string; completed: boolean }[];
  recentUpdate?: string;
  progress?: number;
  category?: string;
}

type TabKey = "all" | "active" | "completed";

/* ============================== Utilidades ============================== */

function formatDate(dateString: string): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
const inRange = (dateISO?: string, from?: string, to?: string) => {
  if (!dateISO) return true;
  const d = new Date(dateISO).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime()) return false;
  return true;
};

/* ============================== Componente ============================== */

export default function GoalsPage({ childId }: { childId: number }) {
  const [goals, setGoals] = useState<GoalWithMilestones[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // UI/estado
  const [tab, setTab] = useState<TabKey>("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);

  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    consultationId: 1,
    categoryId: 1,
    targetDate: "",
  });

  /* ============================== Data ============================== */

  const loadGoals = async () => {
    try {
      setLoading(true);
      if (!childId) return;

      const data = await getGoalsByChildId(childId);

      // enriquecer com marcos e progresso placeholder (se API não devolver)
      const enhanced: GoalWithMilestones[] = data.map((g) => ({
        ...g,
        milestones: [
          { text: "Primeiro marco", completed: true },
          { text: "Segundo marco", completed: true },
          { text: "Terceiro marco", completed: false },
          { text: "Quarto marco", completed: false },
        ],
        recentUpdate: "Atualização recente do progresso",
        progress:
          typeof (g as any).progress === "number"
            ? (g as any).progress
            : Math.floor(Math.random() * 100),
      }));

      setGoals(enhanced);
    } catch (err: any) {
      console.error("Erro ao buscar metas:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await getCategories();
        setCategories(cats);
        if (cats.length > 0) {
          setNewGoal((prev) => ({ ...prev, categoryId: cats[0].id }));
        }
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  /* ============================== Ações ============================== */

  const handleCreate = async () => {
    try {
      if (!childId) return;

      const created = await createGoal({
        title: newGoal.title,
        description: newGoal.description,
        consultationId: newGoal.consultationId,
        categoryId: newGoal.categoryId,
        dueDate: newGoal.targetDate,
        status: "pending",
        childId,
      });

      const enhanced: GoalWithMilestones = {
        ...created,
        milestones: [
          { text: "Primeiro marco", completed: false },
          { text: "Segundo marco", completed: false },
        ],
        recentUpdate: "Meta criada recentemente",
        progress: 0,
      };

      setGoals((prev) => [...prev, enhanced]);
      setNewGoal({
        title: "",
        description: "",
        consultationId: 1,
        categoryId: categories.length > 0 ? categories[0].id : 1,
        targetDate: "",
      });
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Erro ao criar meta:", err?.message || err);
    }
  };

  const handleUpdateStatus = async (
    goalId: number,
    status: "pending" | "in_progress" | "completed"
  ) => {
    try {
      const updated = await updateGoal(goalId, { status });
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...updated } : g)));
    } catch (err: any) {
      console.error("Erro ao atualizar meta:", err?.message || err);
    }
  };

  const handleDelete = async (goalId: number) => {
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err: any) {
      console.error("Erro ao eliminar meta:", err?.message || err);
    }
  };

  const toggleMilestone = (goalId: number, milestoneIndex: number) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === goalId && goal.milestones) {
          const milestones = [...goal.milestones];
          milestones[milestoneIndex] = {
            ...milestones[milestoneIndex],
            completed: !milestones[milestoneIndex].completed,
          };
          const done = milestones.filter((m) => m.completed).length;
          const progress = Math.round((done / milestones.length) * 100);
          return { ...goal, milestones, progress };
        }
        return goal;
      })
    );
  };

  /* ============================== Helpers de UI ============================== */

  const getCategoryName = (categoryId: number) =>
    categories.find((c) => c.id === categoryId)?.name ?? "Sem Categoria";

  const getCategoryColor = (categoryId: number) => {
    const name = getCategoryName(categoryId);
    switch (name) {
      case "Competências Sociais":
        return "bg-blue-100 text-blue-800";
      case "Comportamental":
        return "bg-purple-100 text-purple-800";
      case "Competências de Vida":
        return "bg-green-100 text-green-800";
      case "Comunicação":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /* ============================== Filtros / KPIs ============================== */

  const filteredGoals = useMemo(() => {
    return goals
      .filter((g) => {
        if (tab === "active" && g.status === "completed") return false;
        if (tab === "completed" && g.status !== "completed") return false;
        return true;
      })
      .filter((g) => (categoryFilter === "all" ? true : g.categoryId === categoryFilter))
      .filter((g) => inRange((g as any).dueDate ?? (g as any).targetDate, dateFrom, dateTo));
  }, [goals, tab, categoryFilter, dateFrom, dateTo]);

  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const totalProgress =
    goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length)
      : 0;

  const dueThisMonth = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return goals.filter((g) => {
      const dstr = (g as any).dueDate ?? (g as any).targetDate;
      if (!dstr) return false;
      const d = new Date(dstr);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [goals]);

  /* ============================== Render ============================== */

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-gray-50 min-h-screen max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Metas de Terapia</h1>
            <p className="text-gray-600 text-sm">Acompanhe o progresso e objetivos</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500">A carregar metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      {/* Cabeçalho + Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Metas de Terapia</h1>
          <p className="text-gray-600">Acompanhe o progresso e objetivos de terapia</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="default" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Baixar Relatório
          </Button>
          <Button
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowCreateForm(true)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Adicionar Meta
          </Button>
        </div>
      </div>

      {/* Filtros estilo “pílulas” + intervalo de datas */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Pílulas com scroll horizontal no mobile */}
        <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === "all" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === "active" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === "completed" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
            }`}
          >
            Concluídas
          </button>

          {/* Por categoria */}
          <div className="px-2 py-2 rounded-lg bg-gray-100 w-full md:w-auto">
            <select
              value={categoryFilter === "all" ? "all" : String(categoryFilter)}
              onChange={(e) =>
                setCategoryFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))
              }
              className="w-full md:w-auto bg-transparent text-sm outline-none"
            >
              <option value="all">Por Categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Por data alvo */}
          <div className="px-2 py-2 rounded-lg bg-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700 mr-1">Data alvo:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-full sm:w-36 text-sm"
            />
            <span className="text-gray-500 text-sm">a</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-full sm:w-36 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white rounded-lg shadow-sm border">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Progresso Geral</p>
            <div className="flex items-center justify-between mt-2 min-w-0">
              <div className="w-20 sm:w-24">
                <Progress value={totalProgress} className="h-2" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">
                {totalProgress}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Programa concluído</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Metas Ativas</p>
            <div className="flex items-center justify-between mt-2 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                {activeGoals.length}
              </span>
              <TargetIcon className="w-6 h-6 text-blue-600 shrink-0" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Em progresso</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Concluídas</p>
            <div className="flex items-center justify-between mt-2 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                {completedGoals.length}
              </span>
              <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Metas atingidas</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Este Mês</p>
            <div className="flex items-center justify-between mt-2 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                {dueThisMonth}
              </span>
              <CalendarIcon className="w-6 h-6 text-orange-600 shrink-0" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Metas com prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de criação */}
      {showCreateForm && (
        <Card className="bg-white rounded-lg shadow-sm border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Criar Nova Meta</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                className="h-8 w-8 p-0"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Título da Meta"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="w-full text-sm"
              />
              <Textarea
                placeholder="Descrição"
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                rows={3}
                className="w-full text-sm"
              />

              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  value={newGoal.categoryId}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, categoryId: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border rounded-md text-sm"
                  disabled={loadingCategories}
                >
                  {loadingCategories ? (
                    <option>Carregando categorias...</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Alvo</label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleCreate}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3"
                >
                  Criar Meta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="w-full sm:w-auto text-sm py-2 px-3"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Metas (filtradas) */}
      {tab !== "completed" ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredGoals.filter((g) => g.status !== "completed").length === 0 ? (
            <Card className="bg-white rounded-lg shadow-sm border">
              <CardContent className="p-6 text-center">
                <TargetIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">Sem Metas Ativas</h3>
                <p className="text-gray-600 text-sm">Crie a sua primeira meta para começar</p>
              </CardContent>
            </Card>
          ) : (
            filteredGoals
              .filter((g) => g.status !== "completed")
              .map((goal) => (
                <Card key={goal.id} className="bg-white rounded-lg shadow-sm border">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Cabeçalho */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 break-words">
                              {goal.title}
                            </h3>
                            <Badge className={`text-xs ${getCategoryColor(goal.categoryId)}`}>
                              {getCategoryName(goal.categoryId)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {goal.status === "in_progress"
                                ? "Ativa"
                                : goal.status === "pending"
                                ? "Planeada"
                                : "Concluída"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm break-words">{goal.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)
                          }
                          className="ml-0 sm:ml-2 shrink-0"
                        >
                          {expandedGoalId === goal.id ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Info básica */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-600 break-words">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>
                            Prazo:{" "}
                            {formatDate((goal as any).dueDate ?? (goal as any).targetDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUpIcon className="w-4 h-4" />
                          <span>{goal.progress ?? 0}% concluído</span>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">Progresso</span>
                          <span className="text-xs text-gray-600">{goal.progress ?? 0}%</span>
                        </div>
                        <Progress value={goal.progress ?? 0} className="h-2" />
                      </div>

                      {/* Área expandida */}
                      {expandedGoalId === goal.id && (
                        <div className="space-y-4 pt-2 border-t">
                          {goal.recentUpdate && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Atualização Recente:</strong> {goal.recentUpdate}
                              </p>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 text-sm">Marcos</h4>
                            <div className="space-y-2">
                              {goal.milestones?.map((m, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 cursor-pointer"
                                  onClick={() => toggleMilestone(goal.id, i)}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                      m.completed ? "bg-green-500 border-green-500" : "border-gray-300"
                                    }`}
                                  >
                                    {m.completed && (
                                      <CheckCircleIcon className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs ${
                                      m.completed ? "text-gray-900 line-through" : "text-gray-700"
                                    }`}
                                  >
                                    {m.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleUpdateStatus(goal.id, "in_progress")}
                              variant="outline"
                              size="sm"
                              className="text-xs py-1 px-2"
                            >
                              Marcar como “Em Progresso”
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(goal.id, "completed")}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2"
                              size="sm"
                            >
                              Concluir Meta
                            </Button>
                            <Button
                              onClick={() => handleDelete(goal.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs py-1 px-2"
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      ) : (
        /* Tab: Concluídas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.filter((g) => g.status === "completed").length === 0 ? (
            <Card className="bg-white rounded-lg shadow-sm border md:col-span-2">
              <CardContent className="p-6 text-center">
                <CheckCircleIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">Sem Metas Concluídas</h3>
                <p className="text-gray-600 text-sm">Conclua algumas metas para as ver aqui</p>
              </CardContent>
            </Card>
          ) : (
            filteredGoals
              .filter((g) => g.status === "completed")
              .map((goal) => (
                <Card key={goal.id} className="bg-white rounded-lg shadow-sm border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 break-words">
                            {goal.title}
                          </h3>
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        </div>
                        <Badge className={`text-xs ${getCategoryColor(goal.categoryId)}`}>
                          {getCategoryName(goal.categoryId)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 break-words">{goal.description}</p>

                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>
                          Concluída:{" "}
                          {formatDate(
                            goal.updatedAt ?? (goal as any).dueDate ?? (goal as any).targetDate
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>Progresso: {goal.progress ?? 0}%</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDelete(goal.id)}
                      variant="outline"
                      size="sm"
                      className="mt-3 text-red-600 border-red-200 hover:bg-red-50 text-xs py-1 px-2"
                    >
                      Eliminar
                    </Button>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}
    </div>
  );
}
