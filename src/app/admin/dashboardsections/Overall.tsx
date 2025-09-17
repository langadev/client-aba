// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import { useParams } from "next/navigation";
// import {
//   Calendar as CalendarIcon,
//   Clock as ClockIcon,
//   User as UserIcon,
//   Plus as PlusIcon,
//   X as XIcon,
//   Pencil as PencilIcon,
//   Trash2 as TrashIcon,
//   Target as TargetIcon,
// } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { useAuthStore } from "@/store/userStore";

// // Tipos
// type Gender = "male" | "female" | "other";
// type ConsultationStatus = "scheduled" | "done" | "cancelled";

// interface Child {
//   id: number;
//   name: string;
//   birthdate: string;
//   gender: Gender;
//   parentId: number;
//   status: "active" | "inactive";
//   createdAt: string;
// }

// interface Consultation {
//   id: number;
//   childId: number;
//   psychologistId: number;
//   reason: string;
//   date: string;
//   time: string;
//   status: ConsultationStatus;
//   notes?: string;
//   startAt?: string;
//   endAt?: string;
//   isInPerson?: boolean;
//   location?: string;
//   createdAt: string;
// }

// interface Goal {
//   id: number;
//   consultationId: number;
//   title: string;
//   description: string;
//   dueDate?: string;
//   status: "pending" | "in_progress" | "completed";
//   progress: number;
//   createdAt: string;
// }

// // Funções mock (substitua pelas suas funções reais)
// const getConsultationsByChild = async (childId: number): Promise<Consultation[]> => {
//   return [
//     {
//       id: 1,
//       childId,
//       psychologistId: 1,
//       reason: "Acompanhamento semanal",
//       date: "2024-01-15",
//       time: "14:30",
//       status: "scheduled",
//       notes: "Primeira sessão de avaliação",
//       isInPerson: true,
//       location: "Sala 101",
//       createdAt: "2024-01-10",
//     },
//   ];
// };

// const getChildById = async (childId: number): Promise<Child> => {
//   return {
//     id: childId,
//     name: "João Silva",
//     birthdate: "2018-05-15",
//     gender: "male",
//     parentId: 1,
//     status: "active",
//     createdAt: "2023-01-10",
//   };
// };

// const createConsultation = async (data: any): Promise<Consultation> => {
//   return { ...data, id: Date.now(), createdAt: new Date().toISOString() };
// };

// const updateConsultation = async (id: number, data: any): Promise<Consultation> => {
//   return { ...data, id, createdAt: new Date().toISOString() };
// };

// const deleteConsultation = async (id: number): Promise<void> => {
//   console.log("Deleting consultation:", id);
// };

// const getGoalsByConsultationId = async (consultationId: number): Promise<Goal[]> => {
//   return [
//     {
//       id: 1,
//       consultationId,
//       title: "Melhorar comunicação",
//       description: "Trabalhar habilidades de comunicação verbal",
//       dueDate: "2024-02-15",
//       status: "pending",
//       progress: 0,
//       createdAt: "2024-01-10",
//     },
//   ];
// };

// const createGoal = async (data: any): Promise<Goal> => {
//   return { ...data, id: Date.now(), createdAt: new Date().toISOString() };
// };

// // Helpers
// const pad = (n: number) => String(n).padStart(2, "0");

// const toDatetimeLocalValue = (d: Date) =>
//   `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
//     d.getMinutes()
//   )}`;

// const hhmmFromDate = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// const formatDate = (isoOrDate: string | Date) => {
//   const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
//   return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
// };

// const formatTime = (timeString: string) => {
//   if (timeString.includes("T")) {
//     const d = new Date(timeString);
//     return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false });
//   }
//   return timeString;
// };

// const getStatusColor = (status?: string) => {
//   switch ((status || "").toLowerCase()) {
//     case "scheduled":
//     case "confirmed":
//       return "bg-green-100 text-green-800";
//     case "done":
//     case "completed":
//       return "bg-blue-100 text-blue-800";
//     case "cancelled":
//       return "bg-red-100 text-red-800";
//     default:
//       return "bg-gray-100 text-gray-800";
//   }
// };

// export default function Sessions() {
//   const params = useParams<{ id: string }>();
//   const childId = params?.id ? Number(params.id) : undefined;

//   const user = useAuthStore((s) => s.user);
//   const isPsychologist = user?.role === "PSICOLOGO";

//   const [child, setChild] = useState<Child | null>(null);
//   const [consultations, setConsultations] = useState<Consultation[]>([]);
//   const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
//   const [isSessionModalOpen, setSessionModalOpen] = useState(false);
//   const [editing, setEditing] = useState<Consultation | null>(null);
//   const [detailsOpenFor, setDetailsOpenFor] = useState<Consultation | null>(null);
//   const [goals, setGoals] = useState<Goal[]>([]);
//   const [isGoalModalOpen, setGoalModalOpen] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);

//   // Load data
//   useEffect(() => {
//     const load = async () => {
//       if (!childId) return;
//       try {
//         const [childData, consultationsData] = await Promise.all([
//           getChildById(childId),
//           getConsultationsByChild(childId),
//         ]);
//         setChild(childData);
//         setConsultations(consultationsData);
//       } catch (e) {
//         console.error("Erro ao carregar dados:", e);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     load();
//   }, [childId]);

//   // Carrega metas quando abrir detalhes
//   useEffect(() => {
//     const fetchGoals = async () => {
//       if (!detailsOpenFor?.id) {
//         setGoals([]);
//         return;
//       }
//       try {
//         const goalsData = await getGoalsByConsultationId(detailsOpenFor.id);
//         setGoals(goalsData);
//       } catch (e) {
//         console.error("Erro ao buscar metas:", e);
//         setGoals([]);
//       }
//     };
//     fetchGoals();
//   }, [detailsOpenFor]);

//   const now = new Date();
//   const upcoming = useMemo(
//     () =>
//       consultations
//         .filter((c) => new Date(c.date) >= now)
//         .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
//     [consultations]
//   );

//   const past = useMemo(
//     () =>
//       consultations
//         .filter((c) => new Date(c.date) < now)
//         .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
//     [consultations]
//   );

//   // Handlers
//   const openCreate = () => {
//     if (!isPsychologist) return;
//     setEditing(null);
//     setSessionModalOpen(true);
//   };

//   const openEdit = (row: Consultation) => {
//     if (!isPsychologist) return;
//     setEditing(row);
//     setSessionModalOpen(true);
//   };

//   const onSubmitSession = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!isPsychologist || !childId || !user?.id) return;

//     const formData = new FormData(e.currentTarget);
//     const values = Object.fromEntries(formData.entries());

//     try {
//       const payload = {
//         childId,
//         psychologistId: Number(user.id),
//         reason: values.reason as string,
//         notes: values.notes as string,
//         status: values.status as ConsultationStatus,
//         date: (values.startAt as string).slice(0, 10),
//         time: hhmmFromDate(new Date(values.startAt as string)),
//         startAt: new Date(values.startAt as string).toISOString(),
//         endAt: new Date(
//           new Date(values.startAt as string).getTime() + Number(values.durationMin) * 60000
//         ).toISOString(),
//         isInPerson: values.isInPerson === "on",
//         location: values.location as string,
//       };

//       if (editing) {
//         const updated = await updateConsultation(editing.id, payload);
//         setConsultations((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
//       } else {
//         const created = await createConsultation(payload);
//         setConsultations((prev) => [created, ...prev]);
//       }
//       setSessionModalOpen(false);
//       setEditing(null);
//     } catch (e: any) {
//       console.error("Erro ao salvar consulta:", e);
//       alert(e?.message || "Erro ao salvar consulta. Tente novamente.");
//     }
//   };

//   const onDelete = async (id: number) => {
//     if (!isPsychologist) return;
//     if (!confirm("Deseja realmente apagar esta consulta?")) return;
//     try {
//       await deleteConsultation(id);
//       setConsultations((prev) => prev.filter((c) => c.id !== id));
//       if (detailsOpenFor?.id === id) setDetailsOpenFor(null);
//     } catch (e: any) {
//       console.error(e);
//       alert(e?.message || "Erro ao apagar. Tente novamente.");
//     }
//   };

//   const onSubmitGoal = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!isPsychologist || !detailsOpenFor?.id) return;

//     const formData = new FormData(e.currentTarget);
//     const values = Object.fromEntries(formData.entries());

//     try {
//       const newGoal = await createGoal({
//         title: values.title as string,
//         description: values.description as string,
//         dueDate: values.dueDate as string,
//         consultationId: detailsOpenFor.id,
//         status: "pending",
//         progress: 0,
//       });
//       setGoals((prev) => [...prev, newGoal]);
//       setGoalModalOpen(false);
//     } catch (e: any) {
//       console.error(e);
//       alert(e?.message || "Erro ao criar meta.");
//     }
//   };

//   const list = activeTab === "upcoming" ? upcoming : past;

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-600">Carregando sessões...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-6 p-4 sm:p-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
//             Sessões de {child?.name ?? "—"}
//           </h1>
//           <p className="text-gray-600 mt-1">Gerir e acompanhar consultas</p>
//         </div>

//         {isPsychologist && (
//           <Button onClick={openCreate} className="bg-blue-600 text-white">
//             <PlusIcon className="w-4 h-4 mr-2" />
//             Nova Sessão
//           </Button>
//         )}
//       </div>

//       {/* Tabs */}
//       <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
//         <button
//           onClick={() => setActiveTab("upcoming")}
//           className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
//             activeTab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
//           }`}
//         >
//           Próximas
//         </button>
//         <button
//           onClick={() => setActiveTab("past")}
//           className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
//             activeTab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
//           }`}
//         >
//           Anteriores
//         </button>
//       </div>

//       {/* Lista */}
//       <div className="grid grid-cols-1 gap-4">
//         {list.map((session) => (
//           <Card key={session.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
//             <CardContent className="p-4 sm:p-6">
//               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
//                 <div
//                   className="flex-1 cursor-pointer"
//                   onClick={() => setDetailsOpenFor(session)}
//                 >
//                   <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
//                     <h3 className="text-lg font-bold text-gray-900">{session.reason}</h3>
//                     <Badge className={getStatusColor(session.status)}>
//                       {session.status}
//                     </Badge>
//                   </div>

//                   <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600 mb-2">
//                     <div className="flex items-center gap-2">
//                       <CalendarIcon className="w-4 h-4" />
//                       {formatDate(session.date)}
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <ClockIcon className="w-4 h-4" />
//                       {formatTime(session.time)}
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <UserIcon className="w-4 h-4" />
//                       Psicólogo {session.psychologistId}
//                     </div>
//                   </div>

//                   {session.notes && <p className="text-gray-600 mt-1">{session.notes}</p>}
//                 </div>

//                 {isPsychologist && (
//                   <div className="flex gap-2">
//                     <Button variant="outline" size="sm" onClick={() => openEdit(session)}>
//                       <PencilIcon className="w-4 h-4 mr-2" />
//                       Editar
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={() => onDelete(session.id)}>
//                       <TrashIcon className="w-4 h-4 mr-2" />
//                       Apagar
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//         {list.length === 0 && (
//           <div className="text-sm text-gray-500 px-1">Sem sessões para mostrar.</div>
//         )}
//       </div>

//       {/* Modais */}
//       {isSessionModalOpen && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
//           <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
//             <button
//               onClick={() => {
//                 setSessionModalOpen(false);
//                 setEditing(null);
//               }}
//               className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
//             >
//               <XIcon className="w-6 h-6" />
//             </button>

//             <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
//               {editing ? "Editar Sessão" : "Agendar Nova Sessão"}
//             </h2>

//             <form onSubmit={onSubmitSession} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Data e Hora</label>
//                 <input
//                   type="datetime-local"
//                   name="startAt"
//                   className="w-full border rounded-lg p-2"
//                   required
//                   defaultValue={editing?.startAt ? toDatetimeLocalValue(new Date(editing.startAt)) : ""}
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Duração (min)</label>
//                   <input
//                     type="number"
//                     name="durationMin"
//                     min={15}
//                     max={240}
//                     defaultValue={60}
//                     className="w-full border rounded-lg p-2"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium mb-1">Estado</label>
//                   <select name="status" className="w-full border rounded-lg p-2" defaultValue="scheduled">
//                     <option value="scheduled">Agendada</option>
//                     <option value="done">Concluída</option>
//                     <option value="cancelled">Cancelada</option>
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-1">Motivo</label>
//                 <input
//                   type="text"
//                   name="reason"
//                   placeholder="Ex: Acompanhamento semanal"
//                   className="w-full border rounded-lg p-2"
//                   required
//                   defaultValue={editing?.reason || ""}
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
//                 <textarea
//                   name="notes"
//                   rows={3}
//                   className="w-full border rounded-lg p-2"
//                   defaultValue={editing?.notes || ""}
//                 />
//               </div>

//               <div className="flex items-center gap-2">
//                 <input id="presencial" type="checkbox" name="isInPerson" defaultChecked={editing?.isInPerson} />
//                 <label htmlFor="presencial" className="text-sm">
//                   Sessão presencial?
//                 </label>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-1">Local (se presencial)</label>
//                 <input
//                   type="text"
//                   name="location"
//                   placeholder="Ex: Clínica X, Sala 3"
//                   className="w-full border rounded-lg p-2"
//                   defaultValue={editing?.location || ""}
//                 />
//               </div>

//               <div className="flex justify-end gap-2 mt-6">
//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={() => {
//                     setSessionModalOpen(false);
//                     setEditing(null);
//                   }}
//                 >
//                   Cancelar
//                 </Button>
//                 <Button type="submit" className="bg-blue-600 text-white">
//                   Guardar
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {detailsOpenFor && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
//           <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
//             <button
//               onClick={() => setDetailsOpenFor(null)}
//               className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
//             >
//               <XIcon className="w-6 h-6" />
//             </button>

//             <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Detalhes da Sessão</h2>

//             <div className="space-y-2 text-gray-700">
//               <div><span className="font-semibold">Motivo:</span> {detailsOpenFor.reason}</div>
//               <div><span className="font-semibold">Data:</span> {formatDate(detailsOpenFor.date)} — {formatTime(detailsOpenFor.time)}</div>
//               <div>
//                 <span className="font-semibold">Estado:</span>{" "}
//                 <Badge className={getStatusColor(detailsOpenFor.status)}>{detailsOpenFor.status}</Badge>
//               </div>
//               {detailsOpenFor.notes && <div><span className="font-semibold">Notas:</span> {detailsOpenFor.notes}</div>}
//               {detailsOpenFor.isInPerson && detailsOpenFor.location && (
//                 <div><span className="font-semibold">Local:</span> {detailsOpenFor.location}</div>
//               )}
//             </div>

//             <div className="mt-6 border-t pt-4">
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-semibold text-lg text-gray-900">Metas da Sessão</h3>
//                 {isPsychologist && (
//                   <Button size="sm" onClick={() => setGoalModalOpen(true)}>
//                     <TargetIcon className="w-4 h-4 mr-2" />
//                     Adicionar Meta
//                   </Button>
//                 )}
//               </div>

//               {goals.length === 0 ? (
//                 <div className="text-sm text-gray-500">Nenhuma meta associada.</div>
//               ) : (
//                 <div className="space-y-3">
//                   {goals.map((g) => (
//                     <Card key={g.id} className="border border-gray-200">
//                       <CardContent className="p-4">
//                         <div className="flex items-start justify-between gap-3">
//                           <div className="min-w-0">
//                             <h4 className="font-medium text-gray-900">{g.title}</h4>
//                             <p className="text-sm text-gray-600 mt-1">{g.description}</p>
//                             {g.dueDate && (
//                               <div className="text-xs text-gray-500 mt-2">
//                                 Prazo: {formatDate(g.dueDate)}
//                               </div>
//                             )}
//                           </div>
//                           <Badge
//                             className={
//                               g.status === "completed" ? "bg-green-100 text-green-800" :
//                               g.status === "in_progress" ? "bg-blue-100 text-blue-800" :
//                               "bg-yellow-100 text-yellow-800"
//                             }
//                           >
//                             {g.status === "completed" ? "Concluída" :
//                              g.status === "in_progress" ? "Em Progresso" : "Pendente"}
//                           </Badge>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {isGoalModalOpen && detailsOpenFor && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
//           <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
//             <button
//               onClick={() => setGoalModalOpen(false)}
//               className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
//             >
//               <XIcon className="w-6 h-6" />
//             </button>

//             <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Adicionar Meta</h2>

//             <form onSubmit={onSubmitGoal} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Título</label>
//                 <input
//                   type="text"
//                   name="title"
//                   className="w-full border rounded-lg p-2"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-1">Descrição</label>
//                 <textarea
//                   name="description"
//                   rows={3}
//                   className="w-full border rounded-lg p-2"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-1">Prazo (opcional)</label>
//                 <input
//                   type="date"
//                   name="dueDate"
//                   className="w-full border rounded-lg p-2"
//                 />
//               </div>

//               <div className="flex justify-end gap-2 mt-6">
//                 <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)}>
//                   Cancelar
//                 </Button>
//                 <Button type="submit" className="bg-blue-600 text-white">
//                   Criar Meta
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }