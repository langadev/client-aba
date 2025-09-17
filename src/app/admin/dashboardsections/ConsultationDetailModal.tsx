"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  CalendarDays,
  User,
  Baby,
  ClipboardList,
  MessageSquareText,
  Target,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import { getConsultationById, type Consultation } from "../../../api/repository/consultaionRepository";

type UserLite = { id: number; name: string; email?: string; phone?: string };
type ChildLite = {
  id: number;
  name: string;
  birthdate?: string;
  gender?: string;
  parent?: UserLite;
};
type GoalLite = { id: number; title: string; status?: string };

type ConsultationDetailDTO = Consultation & {
  child?: ChildLite;
  psychologist?: UserLite;
  goals?: GoalLite[];
  // campos modernos, se o backend enviar
  startAt?: string;
  endAt?: string;
  isInPerson?: boolean;
  location?: string | null;
};

interface Props {
  open: boolean;
  consultationId: number | null;
  onClose: () => void;
}

/* ------------------------------- Helpers ------------------------------- */

const statusPill = (s?: Consultation["status"]) => {
  const status = (s || "scheduled").toString().toLowerCase();
  const color =
    status === "done"
      ? "bg-green-100 text-green-800"
      : status === "cancelled"
      ? "bg-red-100 text-red-800"
      : "bg-blue-100 text-blue-800";
  const label =
    status === "done" ? "Concluída" : status === "cancelled" ? "Cancelada" : "Agendada";
  return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>;
};

const goalPill = (status?: string) => {
  const s = (status || "").toString().toLowerCase();
  let cls = "bg-gray-100 text-gray-800";
  let label = status || "—";

  if (["done", "concluida", "completed"].includes(s)) {
    cls = "bg-green-100 text-green-800";
    label = "Concluída";
  } else if (["in_progress", "andamento", "ongoing"].includes(s)) {
    cls = "bg-yellow-100 text-yellow-800";
    label = "Em andamento";
  } else if (["open", "pending"].includes(s)) {
    cls = "bg-blue-100 text-blue-800";
    label = "Aberta";
  } else if (["cancelled", "canceled"].includes(s)) {
    cls = "bg-red-100 text-red-800";
    label = "Cancelada";
  }

  return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{label}</span>;
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("pt-PT") : "-";

const fmtTime = (timeOrIso?: string) => {
  if (!timeOrIso) return "-";
  // aceita "HH:MM" ou ISO
  if (!timeOrIso.includes("T")) return timeOrIso.slice(0, 5);
  const d = new Date(timeOrIso);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false });
};

/* -------------------------------- View -------------------------------- */

export default function ConsultationDetailModal({
  open,
  consultationId,
  onClose,
}: Props) {
  const [data, setData] = useState<ConsultationDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);

  // trava o scroll do body quando o modal abre
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const load = useCallback(async () => {
    if (!open || consultationId == null) return;
    try {
      setLoading(true);
      const res = await getConsultationById(consultationId);
      setData(res as ConsultationDetailDTO);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erro ao carregar consulta");
    } finally {
      setLoading(false);
    }
  }, [open, consultationId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const childName = data?.child?.name ?? (data ? `#${data.childId}` : "-");
  const psyName = data?.psychologist?.name ?? (data ? `#${data.psychologistId}` : "-");

  const hasRichTime = !!data?.startAt || !!data?.endAt;
  const startAtLbl = fmtDate(data?.startAt) + " " + fmtTime(data?.startAt);
  const endAtLbl = data?.endAt ? fmtDate(data?.endAt) + " " + fmtTime(data?.endAt) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-auto flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixo) */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Detalhes da consulta</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-5 overflow-y-auto space-y-5">
          {loading || !data ? (
            <div className="text-gray-600">Carregando…</div>
          ) : (
            <>
              {/* Bloco Consulta */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  Consulta #{data.id}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Data</span>
                    </div>
                    <div>{fmtDate(data.date)}</div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Hora</div>
                    <div>{data.time ? fmtTime(data.time) : "-"}</div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Status</div>
                    <div>{statusPill(data.status)}</div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <MessageSquareText className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">Motivo</span>
                    </div>
                    <div className="text-gray-800">{data.reason || "-"}</div>
                  </div>
                </div>

                {/* Campos “ricos” (start/end/location) se disponíveis */}
                {(hasRichTime || data.isInPerson != null || data.location) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    {hasRichTime && (
                      <>
                        <div className="p-3 border rounded-lg">
                          <div className="text-gray-700 font-medium mb-1">Início</div>
                          <div className="text-gray-800">{startAtLbl}</div>
                        </div>
                        {endAtLbl && (
                          <div className="p-3 border rounded-lg">
                            <div className="text-gray-700 font-medium mb-1">Fim</div>
                            <div className="text-gray-800">{endAtLbl}</div>
                          </div>
                        )}
                      </>
                    )}
                    {data.isInPerson !== undefined && (
                      <div className="p-3 border rounded-lg">
                        <div className="text-gray-700 font-medium mb-1">Modalidade</div>
                        <div className="text-gray-800">
                          {data.isInPerson ? "Presencial" : "Online"}
                        </div>
                      </div>
                    )}
                    {data.location && (
                      <div className="p-3 border rounded-lg md:col-span-3">
                        <div className="text-gray-700 font-medium mb-1">Local</div>
                        <div className="text-gray-800">{data.location}</div>
                      </div>
                    )}
                  </div>
                )}

                {data.notes && (
                  <div className="mt-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <ClipboardList className="w-4 h-4 text-gray-700" />
                      <span className="font-medium">Observações</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {data.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Bloco Criança */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Baby className="w-5 h-5 text-blue-600" /> Criança
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Nome</div>
                    <div>{childName}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Nascimento</div>
                    <div>{fmtDate(data.child?.birthdate)}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Gênero</div>
                    <div>{data.child?.gender ?? "-"}</div>
                  </div>
                </div>
              </div>

              {/* Bloco Psicólogo */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" /> Psicólogo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Nome</div>
                    <div>{psyName}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Email</div>
                    <div>{data.psychologist?.email ?? "-"}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-gray-700 font-medium mb-1">Telefone</div>
                    <div>{data.psychologist?.phone ?? "-"}</div>
                  </div>
                </div>
              </div>

              {/* Bloco Goals */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" /> Metas da Consulta
                </h3>

                {data.goals && data.goals.length > 0 ? (
                  <ul className="space-y-2">
                    {data.goals.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="pr-3">
                          <div className="text-sm font-medium text-gray-900">
                            {g.title}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {g.status?.toLowerCase() === "done" && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {goalPill(g.status)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Nenhuma meta vinculada a esta consulta.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer (fixo) */}
        <div className="p-4 border-t sticky bottom-0 bg-white rounded-b-2xl">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
