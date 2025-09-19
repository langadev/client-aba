/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Download as DownloadIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ChartPie,
  Users2,
  EyeIcon,
  Edit,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { LoadingButton } from "./LoadingButton";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorText } from "./ErrorText";

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
const goalSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  consultationId: z.string().refine((id) => id.length > 0, "Consulta obrigatória"),
  categoryId: z.string().refine((id) => id.length > 0, "Categoria obrigatória"),
  targetDate: z.string().refine((date) => {
    if (!date) return false
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, "Data inválida"),
});
type GoalFormData = z.infer<typeof goalSchema>;

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      consultationId: "1",
      categoryId: "1",
      targetDate: "",
    },
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

  const onSubmit = async (data: GoalFormData) => {
    try {
      if (!childId) return;
      setLoading(true);
      const created = await createGoal({
        status: "pending",
        ...data,
        categoryId: parseInt(data.categoryId),
        consultationId: parseInt(data.consultationId),
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
      reset();
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Erro ao criar meta:", err?.message || err);
    } finally {
      setLoading(false);
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
        <div className="-mx-4  max-[560px]:flex-col px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex justify-between">

            <button
              onClick={() => setTab("all")}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "all" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
                }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTab("active")}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "active" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
                }`}
            >
              Ativas
            </button>
            <button
              onClick={() => setTab("completed")}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "completed" ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-700"
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
        <Card className="">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold ">Progresso Geral</CardTitle>
            <ChartPie className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mt-2 min-w-0">
              <div className="w-20 sm:w-24">
                <Progress value={totalProgress} className="h-2 [&>div]:bg-blue-500" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">
                {totalProgress}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Programa concluído</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold ">Metas Ativas</CardTitle>
            <TargetIcon className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-center min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-center text-gray-900 whitespace-nowrap">
                {activeGoals.length}
              </span>
            </div>
            <p className="text-md text-center text-gray-500 mt-1">Em progresso</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold ">Metas Concluídas</CardTitle>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-center  min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                {completedGoals.length}
              </span>
            </div>
            <p className="text-md text-gray-500 mt-1 text-center ">Metas atingidas</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold ">Este Mês</CardTitle>
            <CalendarIcon className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-center min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                {dueThisMonth}
              </span>
            </div>
            <p className="text-md text-center text-gray-500 mt-1">Metas com prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de criação */}
      {showCreateForm && (
        <Dialog onOpenChange={setShowCreateForm} open={showCreateForm}>
          <DialogContent className="p-4">
            <DialogTitle>
              Criar Nova Meta
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Input
                placeholder="Título da Meta"
                {...register("title")}
                className="w-full text-sm"
              />
              <ErrorText field={errors.title} />
              <Textarea
                placeholder="Descrição"
                {...register("description")}
                rows={3}
                className="w-full text-sm"
              />
              <ErrorText field={errors.description} />

              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  {...register("categoryId")}
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
                <ErrorText field={errors.categoryId} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Alvo</label>
                <Input
                  type="date"
                  {...register("targetDate")}
                  className="w-full text-sm"
                />
                <ErrorText field={errors.targetDate} />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <LoadingButton
                  isLoading={loading}
                  text="Criar Meta"
                  submit
                />
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="w-full sm:w-auto text-sm py-2 px-3"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
            <div className="grid grid-cols-2 gap-4 max-[750px]:grid-cols-1">
              {filteredGoals
                .filter((g) => g.status !== "completed")
                .map((goal) => (
                  <GoalsCard
                    date={goal.dueDate!}
                    title={goal.title}
                    status={goal.status}
                    key={goal.id}
                    reason={goal.description!}
                    progress={goal.progress}
                  />
                ))
              }
            </div>
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
                        <Badge className={`text-xs ${getCategoryColor(goal.categoryId!)}`}>
                          {getCategoryName(goal.categoryId!)}
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
      <div className="grid grid-cols-1 mt-5  gap-4">
        <div>
          <h2 className="text-2xl font-bold">Accoes Rapidas</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[530px]:grid-cols-1">
          <Button size="lg" className="text-blue-500 border-2 border-blue-500 hover:text-white bg-white hover:bg-blue-600">
            <PlusIcon className="w-10 h-10 mr-2" />
            Adicionar Meta
          </Button>
          <Button size="lg" className="text-green-500 border-2 border-green-500 hover:text-white bg-white hover:bg-green-600">
            <Edit className="w-10 h-10  mr-2" />
            Atualizar Progresso
          </Button>
          <Button size="lg" className="text-purple-500 border-2 border-purple-500 hover:text-white bg-white hover:bg-purple-600">
            <DownloadIcon className="w-10 h-10  mr-2" />
            Baixar Relatorio
          </Button>
          <Button size="lg" className="text-orange-500 border-2 border-orange-500 hover:text-white bg-white hover:bg-orange-600">
            <MessageCircle className="w-10 h-10 mr-2" />
            Conversar com terapeuta
          </Button>
        </div>
      </div>
    </div>
  );
}

type GoalsCardProps = {
  id?: string;
  title?: string;
  status: string | undefined;
  reason?: string;
  date: string;
  time?: string;
  progress?: number;
}
function GoalsCard({
  date, reason, status, title = "Sessão Terapêutica",
  progress
}: GoalsCardProps) {
  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="flex items-center justify-between px-5 ">
        <div className="flex items-center justify-center gap-2">
          <div className="text-purple-500 max-[450px]:hidden bg-purple-100 rounded-md p-3">
            <Users2 />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold line-clamp-1">{title}</CardTitle>
            <CardDescription>
              <Badge className="bg-purple-100 text-purple-800">Meta Principal</Badge>
              <Badge className="bg-green-100 text-green-800">{status}</Badge>
            </CardDescription>
          </div>
        </div>
        <div>
          <CardTitle className="text-3xl font-bold text-purple-500">{progress}%</CardTitle>
          <CardDescription className="text-gray-500">Progresso</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <CardDescription className="text-md">
          {reason}
        </CardDescription>
        <Progress value={progress} className="[&>div]:bg-purple-500" />
      </CardContent>
      <CardFooter className="flex items-center justify-between px-5 ">
        <div className="space-x-2 flex items-center justify-center">
          <CalendarIcon className="w-4 h-4 text-gray-500 inline-block mr-1" />
          <span className="text-gray-500">Meta: {new Date(date).toLocaleDateString()}</span>
        </div>
        <div>
          <Button variant="link" size="sm" className="text-blue-500">
            <EyeIcon className="w-4 h-4 mr-2" />
            Ver Detalhes
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}