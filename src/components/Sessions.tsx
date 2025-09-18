/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(psychologist)/children/[id]/sessions/Sessions.tsx
"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Plus as PlusIcon,
  X as XIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
  Target as TargetIcon,
  MapPin as MapPinIcon,
  Video as VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/userStore";

// ===== Services (mantenha os paths do seu projeto)
import {
  getConsultationsByChild,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  getGoalsByConsultation,
  type Consultation,
  type ConsultationStatus,
} from "../api/repository/consultaionRepository";
import { getChildById, type Child } from "../api/repository/childRepository";
import { createGoal, type Goal } from "../api/repository/goalRepository";

// ===== RHF + Zod
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

/* ========================= Utils ========================= */

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const formatTime = (isoOrHHMM: string) => {
  const asDate = isoOrHHMM.includes("T")
    ? new Date(isoOrHHMM)
    : new Date(`1970-01-01T${isoOrHHMM}:00`);
  return asDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const toDatetimeLocalValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "scheduled":
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "done":
    case "completed":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const TypeIcon = ({ inPerson }: { inPerson?: boolean }) =>
  inPerson ? <MapPinIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />;

/* ========================= Zod schemas ========================= */

// Sessão — alinhada ao backend: startAt obrigatório, location obrigatória quando presencial
const consultationFormSchema = z
  .object({
    startAt: z
      .string()
      .min(1, "Início é obrigatório")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Data/hora inválida"),
    durationMin: z.number().min(15, "Duração mínima de 15 minutos").max(240, "Duração máxima de 240 minutos"),
    reason: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres"),
    status: z.enum(["scheduled", "cancelled", "done"]),
    notes: z.string().optional(),
    isInPerson: z.boolean(),
    location: z.string().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isInPerson && !data.location?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Local é obrigatório quando a sessão é presencial",
      });
    }
  });

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

// Meta — pertence à sessão
const goalFormSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().min(5, "Descrição muito curta"),
  dueDate: z.date().optional(),
});
type GoalFormValues = z.infer<typeof goalFormSchema>;

/* ========================= Componente ========================= */

export default function Sessions(): JSX.Element {
  const params = useParams<{ id: string }>();
  const childId = params?.id ? Number(params.id) : undefined;

  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isPsychologist = role === "PSICOLOGO";

  const [child, setChild] = useState<Child | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Create / Edit sessão
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Consultation | null>(null);

  // Detalhes + metas
  const [selectedSession, setSelectedSession] = useState<Consultation | null>(null);
  const [sessionGoals, setSessionGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Modal criar meta
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  // RHF sessão
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
  });
  const watchIsInPerson = watch("isInPerson");

  // RHF meta
  const {
    register: registerGoal,
    handleSubmit: handleSubmitGoal,
    reset: resetGoal,
    formState: { errors: errorsGoal, isSubmitting: creatingGoal },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { title: "", description: "", dueDate: new Date() },
  });

  /* ========================= Loads ========================= */

  useEffect(() => {
    const load = async () => {
      if (!childId) return;
      try {
        const [c, list] = await Promise.all([getChildById(childId), getConsultationsByChild(childId)]);
        setChild(c);
        setConsultations(list);
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      }
    };
    load();
  }, [childId]);

  useEffect(() => {
    const loadGoals = async () => {
      if (!selectedSession?.id) {
        setSessionGoals([]);
        return;
      }
      try {
        setGoalsLoading(true);
        const rows = await getGoalsByConsultation(selectedSession.id);
        setSessionGoals(rows as Goal[]);
      } catch (e) {
        console.error("Erro ao carregar metas da sessão:", e);
        setSessionGoals([]);
      } finally {
        setGoalsLoading(false);
      }
    };
    loadGoals();
  }, [selectedSession]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = new Date();
  const upcoming = useMemo(
    () =>
      consultations
        .filter((c) => new Date(c.date) >= now)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [consultations, now]
  );
  const past = useMemo(
    () =>
      consultations
        .filter((c) => new Date(c.date) < now)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [consultations, now]
  );

  /* ========================= Ações (Sessão) ========================= */

  const openCreate = () => {
    if (!isPsychologist) return;
    setEditingSession(null);
    reset({
      startAt: "",
      reason: "",
      durationMin: 60,
      status: "scheduled",
      notes: "",
      isInPerson: false,
      location: "",
    });
    setSessionModalOpen(true);
  };

  const openEdit = (row: Consultation) => {
    if (!isPsychologist) return;
    setEditingSession(row);

    const rowAny = row as any;
    const start =
      rowAny?.startAt
        ? new Date(rowAny.startAt)
        : new Date(`${row.date}T${(row.time || "00:00").slice(0, 5)}:00`);

    reset({
      startAt: toDatetimeLocalValue(start),
      durationMin: 60,
      reason: row.reason || "",
      status: (String(row.status || "scheduled").toLowerCase() as "scheduled" | "done" | "cancelled"),
      notes: row.notes || "",
      isInPerson: (row as any)?.isInPerson ?? false,
      location: (row as any)?.location ?? "",
    });
    setSessionModalOpen(true);
  };

  const onSubmitSession = async (values: ConsultationFormValues) => {
    if (!isPsychologist) return;
    if (!childId || !user?.id) return;

    // start/end
    const start = new Date(values.startAt);
    const end = new Date(start.getTime() + values.durationMin * 60000);

    // date/time legado
    const dateStr = values.startAt.slice(0, 10);
    const timeStr = values.startAt.slice(11, 16);

    const payload = {
      childId,
      psychologistId: Number(user.id),
      date: dateStr,
      time: timeStr,
      reason: values.reason,
      notes: values.notes || undefined,
      status: values.status as ConsultationStatus,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      isInPerson: values.isInPerson,
      location: values.isInPerson ? values.location : undefined,
    } as any;

    try {
      if (editingSession) {
        const updated = await updateConsultation(editingSession.id, payload);
        setConsultations((prev) => prev.map((c) => (c.id === editingSession.id ? updated : c)));
      } else {
        const created = await createConsultation(payload);
        setConsultations((prev) => [created, ...prev]);
      }
      setSessionModalOpen(false);
      setEditingSession(null);
      reset();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Erro ao salvar consulta. Tente novamente.");
    }
  };

  const onDelete = async (id: number) => {
    if (!isPsychologist) return;
    if (!confirm("Deseja realmente apagar esta sessão?")) return;
    try {
      await deleteConsultation(id);
      setConsultations((prev) => prev.filter((c) => c.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Erro ao apagar sessão.");
    }
  };

  /* ========================= Ações (Meta) ========================= */

  const openCreateGoal = () => {
    if (!isPsychologist || !selectedSession) return;
    resetGoal({ title: "", description: "", dueDate: new Date() });
    setGoalModalOpen(true);
  };

  const onSubmitGoal = async (values: GoalFormValues) => {
    if (!isPsychologist || !selectedSession) return;
    try {
      const newGoal = await createGoal({
        title: values.title,
        categoryId:1,
        description: values.description,
        dueDate: values.dueDate || undefined,
        consultationId: selectedSession.id, // meta pertence à sessão
        status: "pending",
      } as any);
      setSessionGoals((prev) => [...prev, newGoal]);
      setGoalModalOpen(false);
      resetGoal();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Erro ao criar meta.");
    }
  };

  /* ========================= Render ========================= */

  const list = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Banner para Pais/Responsáveis (somente leitura) */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sessões de {child?.name ?? "—"}
          </h1>
          <p className="text-gray-600 mt-1">Gestão e acompanhamento de consultas</p>
        </div>
        {isPsychologist && (
          <div className="flex gap-2">
            <Button onClick={openCreate} className="bg-blue-600 text-white">
              <PlusIcon className="w-4 h-4 mr-2" />
              Nova Sessão
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Próximas
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Anteriores
        </button>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 gap-4">
        {list.map((session) => {
          const sAny = session as any;
          const inPerson = sAny?.isInPerson === true;
          const loc = sAny?.location as string | undefined;

          return (
            <div key={session.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col mx-auto lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div
                      className="flex flex-col justify-start max-sm:flex-row max-sm:items-center gap-2 max-sm:gap-4 mb-3 cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                      title="Ver detalhes"
                    >
                      <h3 className="text-lg font-bold line-clamp-1 text-gray-900">{session.reason}</h3>
                      {session.status && (
                        <Badge className={getStatusColor(session.status)}>{String(session.status)}</Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(session.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        {formatTime(session.time || session.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Psicólogo {session.psychologistId}
                      </div>
                      <div className="flex items-center gap-2">
                        <TypeIcon inPerson={inPerson} />
                        {inPerson ? (loc || "Presencial") : "Virtual"}
                      </div>
                    </div>

                    {/* {!!session.notes && <p className="text-gray-600 mt-1 w-full text-wrap">{session.notes}</p>} */}
                  </div>

                  {isPsychologist && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(session)}>
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(session.id)}>
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Apagar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <div className="text-sm text-gray-500 px-1">Sem sessões para mostrar.</div>}
      </div>

      {/* ===== Detalhes da sessão + metas ===== */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              aria-label="Fechar"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Detalhes da Sessão</h2>

            <div className="space-y-3 text-gray-700">
              <div>
                <span className="font-semibold">Motivo:</span> {selectedSession.reason}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <span className="font-semibold">Data:</span> {formatDate(selectedSession.date)} —{" "}
                  {formatTime(selectedSession.time || selectedSession.date)}
                </div>
                {(selectedSession as any)?.startAt && (selectedSession as any)?.endAt && (
                  <div>
                    <span className="font-semibold">Janela:</span>{" "}
                    {formatTime((selectedSession as any).startAt)}–{formatTime((selectedSession as any).endAt)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TypeIcon inPerson={(selectedSession as any)?.isInPerson} />
                  {(selectedSession as any)?.isInPerson
                    ? (selectedSession as any)?.location || "Presencial"
                    : "Virtual"}
                </div>
              </div>
              {selectedSession.status && (
                <div>
                  <span className="font-semibold">Estado:</span>{" "}
                  <Badge className={getStatusColor(selectedSession.status)}>{selectedSession.status}</Badge>
                </div>
              )}
              {selectedSession.notes && (
                <div>
                  <span className="font-semibold">Notas:</span>
                  <textarea defaultValue={selectedSession.notes} readOnly className="w-full h-40" name="" id="" />
                </div>
              )}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900">Metas da Sessão</h3>
                {isPsychologist && (
                  <Button size="sm" onClick={openCreateGoal}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Adicionar Meta
                  </Button>
                )}
              </div>

              {goalsLoading ? (
                <p className="text-gray-600">A carregar metas...</p>
              ) : sessionGoals.length > 0 ? (
                <div className="space-y-3">
                  {sessionGoals.map((goal) => (
                    <Card key={goal.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <Badge className="bg-gray-100 text-gray-800 capitalize">
                            {goal.status || "pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                        {goal.dueDate && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            Prazo: {formatDate(goal.dueDate)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <TargetIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma meta associada a esta sessão</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Criar/Editar Sessão (RHF + Zod) ===== */}
      {sessionModalOpen && isPsychologist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => {
                setSessionModalOpen(false);
                setEditingSession(null);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              aria-label="Fechar"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
              {editingSession ? "Editar Sessão" : "Agendar Nova Sessão"}
            </h2>

            <form onSubmit={handleSubmit(onSubmitSession)} className="space-y-4 text-gray-700">
              <div>
                <label className="block text-sm font-medium">Início</label>
                <input
                  type="datetime-local"
                  className="w-full mt-1 border rounded-lg p-2"
                  {...register("startAt")}
                />
                {errors.startAt && <p className="text-sm text-red-600 mt-1">{errors.startAt.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Duração (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    className="w-full mt-1 border rounded-lg p-2"
                    {...register("durationMin", { valueAsNumber: true })}
                  />
                  {errors.durationMin && (
                    <p className="text-sm text-red-600 mt-1">{errors.durationMin.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Estado</label>
                  <select className="w-full mt-1 border rounded-lg p-2" {...register("status")}>
                    <option value="scheduled">Agendada</option>
                    <option value="done">Concluída</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Motivo</label>
                <input
                  type="text"
                  className="w-full mt-1 border rounded-lg p-2"
                  placeholder="Ex: Acompanhamento semanal"
                  {...register("reason")}
                />
                {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Notas (opcional)</label>
                <textarea className="w-full mt-1 border rounded-lg p-2" rows={3} {...register("notes")} />
              </div>

              <div className="flex items-center gap-2">
                <input id="presencial" type="checkbox" {...register("isInPerson")} />
                <label htmlFor="presencial" className="text-sm">Sessão presencial?</label>
              </div>

              {watchIsInPerson && (
                <div>
                  <label className="block text-sm font-medium">Local</label>
                  <input
                    type="text"
                    className="w-full mt-1 border rounded-lg p-2"
                    placeholder="Ex: Clínica X, Sala 3"
                    {...register("location")}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSessionModalOpen(false);
                    setEditingSession(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white"
                  disabled={!isPsychologist || isSubmitting}
                >
                  {isSubmitting ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal: Criar Meta (somente PSICOLOGO) ===== */}
      {goalModalOpen && selectedSession && isPsychologist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setGoalModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
              aria-label="Fechar"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
              Adicionar Meta à Sessão
            </h2>

            <form onSubmit={handleSubmitGoal(onSubmitGoal)} className="space-y-4 text-gray-700">
              <div>
                <label className="block text-sm font-medium">Título</label>
                <input
                  type="text"
                  className="w-full mt-1 border rounded-lg p-2"
                  placeholder="Ex: Melhorar competências sociais"
                  {...registerGoal("title")}
                />
                {errorsGoal.title && <p className="text-sm text-red-600 mt-1">{errorsGoal.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Descrição</label>
                <textarea
                  className="w-full mt-1 border rounded-lg p-2"
                  rows={3}
                  placeholder="Descreva os objetivos desta meta"
                  {...registerGoal("description")}
                />
                {errorsGoal.description && (
                  <p className="text-sm text-red-600 mt-1">{errorsGoal.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Prazo (opcional)</label>
                <input type="date" className="w-full mt-1 border rounded-lg p-2" {...registerGoal("dueDate")} />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)} disabled={creatingGoal}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 text-white" disabled={creatingGoal}>
                  {creatingGoal ? "A criar..." : "Criar Meta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
