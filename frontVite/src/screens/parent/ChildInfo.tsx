import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Cake,
  Loader,
  Video,
  CalendarDays,
  Dot,
  Download,
  CalendarPlus,
  MessageCircle,
  CreditCard,
  HelpCircle,
  User as UserIcon,
} from "lucide-react";

import { getChildById, getPsychologistsById } from "../../service/childService";
import { getGoals } from "@/service/goalService";
import {
  getConsultationsByChild,
  type ConsultationStatus,
} from "@/service/consultaionService";

/* ============================== Tipos ============================== */

export type Gender = "male" | "female" | "other";

export interface Consultation {
  id: number;
  date: string; // ISO string
  time: string; // HH:MM
  reason: string;
  status?: ConsultationStatus;
  notes?: string;
  childId: number;
  psychologistId: number;
  createdAt?: string;
  updatedAt?: string;
  psychologistName?: string;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  createdAt: string;
  targetDate?: string;
  childId: number;
  psychologistId: number;
}

interface Child {
  id: number;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  psychologistId?: number;
  createdAt?: string;
  updatedAt?: string;
  psychologistName?: string;
  parentName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface Psychologist {
  id: number;
  name: string;
  email: string;
}

/* ============================== Utilidades ============================== */

const formatPtShort = (d: Date) =>
  d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });

const formatPtFull = (d: Date) =>
  d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const calculateAge = (birthdate: string): number => {
  const b = new Date(birthdate);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
};

/* ======================= Círculo de progresso (SVG) ======================= */

function ProgressRing({ value = 0 }: { value: number }) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="relative w-[200px] h-[160px] flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="text-blue-100" stroke="currentColor" fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="text-blue-600"
          stroke="currentColor"
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-extrabold text-blue-700">{Math.round(value)}%</div>
        <div className="text-xs text-gray-500 mt-1">Conclusão do Programa</div>
      </div>
    </div>
  );
}

/* =========================== Próxima Sessão =========================== */

function NextSessionCard({
  next,
  therapistName,
}: {
  next: Consultation | null;
  therapistName?: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-900">Próxima Sessão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {next ? (
          <>
            <div className="text-3xl font-bold text-gray-900">
              {(() => {
                const d = new Date(next.date);
                const today = new Date();
                const isTomorrow =
                  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toDateString() ===
                  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
                return isTomorrow ? "Amanhã" : formatPtShort(d);
              })()}
            </div>

            <div className="text-gray-700">
              {formatPtFull(new Date(next.date))} às {next.time}
            </div>

            <div className="text-sm text-gray-500">
              {therapistName ? `com ${therapistName}` : ""}
            </div>

            <Button className="w-full bg-green-100 text-green-900 hover:bg-green-200">
              <Video className="w-4 h-4 mr-2" />
              Entrar na Sessão Virtual
            </Button>
          </>
        ) : (
          <div className="text-gray-500">Sem sessão agendada.</div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========================== Atividade Recente ========================== */

type Activity = { id: string; label: string; when: string; color: "blue" | "green" | "purple" };

function DotIcon({ color }: { color: Activity["color"] }) {
  const cls =
    color === "blue"
      ? "text-blue-600"
      : color === "green"
      ? "text-green-600"
      : "text-purple-600";
  return <Dot className={`w-5 h-5 ${cls}`} />;
}

function RecentActivityCard({ items }: { items: Activity[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-900">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-gray-500">Sem atividade recente.</div>
        ) : (
          items.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <DotIcon color={a.color} />
              <div className="flex-1">
                <div className="text-sm text-gray-900">{a.label}</div>
                <div className="text-xs text-gray-500">{a.when}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ========================== Metas de Terapia (UI) ========================== */

type UITherapyGoal = {
  id: number;
  title: string;
  description: string;
  progress: number;   // 0–100
  targetDate?: string;
  color: "green" | "blue" | "purple" | "orange";
};

const colorMap = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

function GoalsSection({ goals }: { goals: UITherapyGoal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Metas de Terapia Atuais</CardTitle>
        <a href="#" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          Ver todas as metas
        </a>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="border rounded-xl p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                <span
                  className={`text-sm font-semibold ${
                    goal.color === "green"
                      ? "text-green-600"
                      : goal.color === "blue"
                      ? "text-blue-600"
                      : goal.color === "purple"
                      ? "text-purple-600"
                      : "text-orange-600"
                  }`}
                >
                  {goal.progress}%
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="h-2 w-full bg-gray-200 rounded-full mb-3">
                <div
                  className={`h-2 rounded-full ${colorMap[goal.color]}`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>

              <p className="text-sm text-gray-600 mb-3">{goal.description}</p>

              {goal.targetDate && (
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Prazo:{" "}
                  {new Date(goal.targetDate).toLocaleDateString("pt-PT", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ======================= Sessões Recentes (UI) ======================= */

function SessionColorBar({ color }: { color: "blue" | "green" | "purple" }) {
  const cls =
    color === "blue" ? "bg-blue-500" : color === "green" ? "bg-green-500" : "bg-purple-500";
  return <div className={`w-1.5 rounded-full ${cls}`} />;
}

type UISession = {
  id: number;
  title: string;
  summary: string;
  therapist?: string;
  durationMin?: number;
  dateISO: string;
  color: "blue" | "green" | "purple";
};

/* ===== Sessões Recentes (CONSULTATIONS IN → faz mapeamento e limita a 3) ===== */
type RecentSessionsSectionProps = {
  consultations: Consultation[];
  psychologistName?: string; // fallback
  limit?: number;            // padrão = 3
};

function RecentSessionsSection({
  consultations,
  psychologistName,
  limit = 3,
}: RecentSessionsSectionProps) {
  const items: UISession[] = useMemo(() => {
    const colors = ["blue", "green", "purple"] as const;

    return consultations
      .filter(
        (c) => c.status === "completed" || new Date(c.date) < new Date()
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, limit)
      .map((c, idx) => ({
        id: c.id,
        title: c.reason || "Sessão de Terapia",
        summary:
          c.notes ||
          "Sem notas da sessão. Adicione um breve resumo para exibir aqui.",
        therapist: c.psychologistName || psychologistName,
        durationMin: 60,
        dateISO: c.date,
        color: colors[idx % colors.length],
      }));
  }, [consultations, psychologistName, limit]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-2xl">Sessões Recentes</CardTitle>
        <a href="#" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          Ver todas
        </a>
      </CardHeader>

      <CardContent className="space-y-6">
        {items.length === 0 ? (
          <div className="text-gray-500">Sem sessões para mostrar no momento.</div>
        ) : (
          items.map((s) => (
            <div key={s.id} className="flex gap-3">
              <SessionColorBar color={s.color} />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                  <div className="text-sm text-gray-500">
                    {new Date(s.dateISO).toLocaleDateString("pt-PT", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <p className="text-gray-700 mt-1">{s.summary}</p>

                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <UserIcon className="w-4 h-4" />
                  {s.therapist ?? "—"}
                  <span className="mx-1">•</span>
                  {s.durationMin ?? 60} minutos
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ========================= Ações Rápidas (UI) ========================= */

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string; // Tailwind bg-*
  onClick?: () => void;
};

function QuickActionsSection({ actions }: { actions: QuickAction[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={a.onClick}
            className={`w-full text-left rounded-xl px-4 py-4 ${a.bg}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{a.icon}</div>
              <div>
                <div className="font-medium text-gray-900">{a.title}</div>
                <div className="text-sm text-gray-600">{a.subtitle}</div>
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/* =============================== PÁGINA =============================== */

export default function ChildInfo() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [psychologist, setPsychologist] = useState<Psychologist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) throw new Error("ID da criança não fornecido");
        setLoading(true);

        const childData = await getChildById(parseInt(id));
        setChild(childData);

        if (childData.psychologistId) {
          try {
            const psy = await getPsychologistsById(childData.psychologistId);
            setPsychologist(psy);
          } catch {}
        }

        const cons = await getConsultationsByChild(parseInt(id));
        setConsultations(
          cons.map((c) => ({
            ...c,
            psychologistName: c.psychologistName || psychologist?.name,
          }))
        );

        const g = await getGoals(parseInt(id));
        setGoals(g);
      } catch (e) {
        console.error(e);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const age = useMemo(() => (child ? calculateAge(child.birthdate) : null), [child]);

  const nextSession: Consultation | null = useMemo(() => {
    const now = new Date();
    return (
      consultations
        .filter((c) => c.status === "scheduled" && new Date(c.date) >= now)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null
    );
  }, [consultations]);

  // progresso = % de metas concluídas (ajuste se tiveres campo progress real)
  const progress = useMemo(() => {
    if (!goals.length) return 0;
    const done = goals.filter((g) => g.status === "completed").length;
    return (done / goals.length) * 100;
  }, [goals]);

  const recentActivity: Activity[] = useMemo(() => {
    const items: Activity[] = [];

    consultations
      .slice()
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 3)
      .forEach((c) => {
        const status =
          c.status === "completed"
            ? { label: "Sessão concluída", color: "blue" as const }
            : c.status === "scheduled"
            ? { label: "Sessão agendada", color: "purple" as const }
            : { label: "Sessão cancelada", color: "purple" as const };

        const when = (() => {
          const d = new Date(c.date + "T" + (c.time || "00:00"));
          const diffMs = Date.now() - d.getTime();
          const diffH = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffH < 24 && diffH >= 0) return `${diffH} horas atrás`;
          if (diffH < 0) return "Em breve";
          const diffD = Math.floor(diffH / 24);
          return diffD === 1 ? "Ontem" : `${diffD} dias atrás`;
        })();

        items.push({ id: `c-${c.id}`, label: status.label, when, color: status.color });
      });

    goals
      .filter((g) => g.status === "completed")
      .slice(0, 2)
      .forEach((g) =>
        items.push({
          id: `g-${g.id}`,
          label: "Meta atingida",
          when: "Recentemente",
          color: "green",
        })
      );

    return items.slice(0, 5);
  }, [consultations, goals]);

  // --- mapping das Metas para a UI ---
  const percentFromStatus = (status: Goal["status"]) => {
    if (status === "completed") return 100;
    if (status === "in_progress") return 62;
    return 10;
  };
  const palette: UITherapyGoal["color"][] = ["green", "blue", "purple", "orange"];
  const uiGoals: UITherapyGoal[] = goals.map((g, idx) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    targetDate: g.targetDate,
    progress: (g as any).progress ?? percentFromStatus(g.status),
    color: palette[idx % palette.length],
  }));

  // --- ações rápidas (liga aos teus handlers/rotas) ---
  const quickActions: QuickAction[] = [
    {
      id: "download-report",
      title: "Baixar Relatório Mais Recente",
      subtitle: "Resumo de Progresso — Novembro 2024",
      icon: <Download className="w-5 h-5 text-blue-700" />,
      bg: "bg-blue-50",
      onClick: () => {
        console.log("baixar relatório");
      },
    },
    {
      id: "schedule",
      title: "Agendar Consulta",
      subtitle: "Agende a sua próxima sessão",
      icon: <CalendarPlus className="w-5 h-5 text-green-700" />,
      bg: "bg-green-50",
      onClick: () => {
        console.log("agendar consulta");
      },
    },
    {
      id: "message",
      title: "Enviar Mensagem ao Terapeuta",
      subtitle: "Envie uma mensagem segura para a sua equipa",
      icon: <MessageCircle className="w-5 h-5 text-purple-700" />,
      bg: "bg-purple-50",
      onClick: () => {
        console.log("mensagem ao terapeuta");
      },
    },
    {
      id: "billing",
      title: "Ver Faturação",
      subtitle: "Veja histórico de pagamentos e faturas",
      icon: <CreditCard className="w-5 h-5 text-orange-700" />,
      bg: "bg-orange-50",
      onClick: () => {
        console.log("ver faturação");
      },
    },
    {
      id: "help",
      title: "Ajuda & Suporte",
      subtitle: "Obtenha assistência ou veja as FAQs",
      icon: <HelpCircle className="w-5 h-5 text-gray-700" />,
      bg: "bg-gray-100",
      onClick: () => {
        console.log("ajuda & suporte");
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-500">A carregar…</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error ?? "Criança não encontrada"}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ========================= CABEÇALHO ========================= */}
      <Card className="w-full mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
              <AvatarImage src="/child.png" alt={child.name} />
              <AvatarFallback>{child.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mr-2">{child.name}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-gray-600 mt-1">
                <span className="inline-flex items-center">
                  <Cake className="w-4 h-4 mr-1" />
                  Idade {age}
                </span>
                <span>•</span>
                <span className="inline-flex items-center">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Início da terapia:{" "}
                  {child.createdAt ? formatPtFull(new Date(child.createdAt)) : "—"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Programa Ativo</Badge>
                <div className="text-sm text-gray-500">
                  Psicólogo(a) Responsável:{" "}
                  <span className="font-medium">
                    {psychologist?.name ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== 3 CARDS DO TOPO ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <ProgressRing value={progress || 70} />
          </CardContent>
        </Card>

        <NextSessionCard next={nextSession} therapistName={psychologist?.name} />

        <RecentActivityCard items={recentActivity} />
      </div>

      {/* ===================== METAS DE TERAPIA ===================== */}
      <div className="pb-6">
        <GoalsSection goals={uiGoals} />
      </div>

      {/* ========== Sessões Recentes + Ações Rápidas (2 colunas) ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <RecentSessionsSection
          consultations={consultations}
          psychologistName={psychologist?.name}
        />
        <QuickActionsSection actions={quickActions} />
      </div>
    </div>
  );
}
