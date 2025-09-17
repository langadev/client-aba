import React, { useState, useEffect, type JSX } from "react";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  VideoIcon,
  MapPinIcon,
  PlusIcon,
  XIcon,
  TargetIcon,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { useParams } from "react-router-dom"; 

// Import services and types
import {
  getConsultationsByChild, // Mudar para buscar por criança
  createConsultation,
  type Consultation,
} from "@/service/consultaionService";
import { getChildById, type Child } from "@/service/childService";
import { type Goal, createGoal, getGoalsByConsultationId } from "@/service/goalService";
import { getCategories, type Category } from "@/service/categoryService";
import { useAuthStore } from "../../store/userStore";

// Utility functions
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const getStatusColor = (status?: string) => {
  switch (status) {
    case "scheduled":
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "done":
    case "completed":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getGoalStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeIcon = (type: string) => (type === "Virtual" ? VideoIcon : MapPinIcon);

export const Sessions = (): JSX.Element => {
  const { id } = useParams(); // Pegar o ID da criança da URL
  const [activeTab, setActiveTab] = useState("upcoming");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedSession, setSelectedSession] = useState<Consultation | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [sessionGoals, setSessionGoals] = useState<Goal[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    reason: "",
    notes: "",
  });

  const [goalFormData, setGoalFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    categoryId: "",
  });

  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  // Fetch child data when component mounts or id changes
  useEffect(() => {
    const fetchChild = async () => {
      if (id) {
        try {
          const childData = await getChildById(parseInt(id));
          setChild(childData);
        } catch (error) {
          console.error("Erro ao buscar criança:", error);
          setChild(null);
        }
      }
    };
    
    fetchChild();
  }, [id]);

  // Fetch consultations for the specific child
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        if (!id) return;
        
        // Get consultations by child ID
        const consultationsData = await getConsultationsByChild(parseInt(id));
        setConsultations(consultationsData);
      } catch (error) {
        console.error("Erro ao buscar consultas:", error);
      }
    };
    fetchConsultations();
  }, [id]);

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Fetch session goals when a session is selected
  useEffect(() => {
    const fetchSessionGoals = async () => {
      if (selectedSession?.id) {
        try {
          setLoadingGoals(true);
          const goalsData = await getGoalsByConsultationId(selectedSession.id);
          setSessionGoals(goalsData);
        } catch (error) {
          console.error("Erro ao buscar metas da sessão:", error);
          setSessionGoals([]);
        } finally {
          setLoadingGoals(false);
        }
      } else {
        setSessionGoals([]);
      }
    };
    fetchSessionGoals();
  }, [selectedSession]);

  const now = new Date();
  const upcomingSessions = consultations.filter((c) => new Date(c.date) >= now);
  const pastSessions = consultations.filter((c) => new Date(c.date) < now);

  // Create new consultation
  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!id || !userId) return;

      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
   const newConsultation = {
  childId: parseInt(id),
  psychologistId: userId,
  date: dateTime.toISOString(),
  time: formData.time, // 👈 adicionar isto
  reason: formData.reason,
  notes: formData.notes,
  status: "scheduled",
};


      const created = await createConsultation(newConsultation);
      setConsultations((prev) => [...prev, created]);
      setIsCreateModalOpen(false);
      setFormData({
        date: "",
        time: "",
        reason: "",
        notes: "",
      });
    } catch (error) {
      console.error("Erro ao criar consulta:", error);
    }
  };

  // Open modal to create goal for selected session
  const handleOpenCreateGoalModal = (session: Consultation) => {
    setSelectedSession(session);
    setIsCreateGoalModalOpen(true);
  };

  // Create new goal for the session
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        
      if (!selectedSession) return;

      setCreatingGoal(true);

      const newGoal = await createGoal({
        title: goalFormData.title,
        description: goalFormData.description,
        dueDate: goalFormData.dueDate || undefined,
        consultationId: selectedSession.id,
        categoryId: parseInt(goalFormData.categoryId) || 1,
        status: "pending",
      });
      console.log("Payload de meta:", newGoal);


      // Update the goals list locally
      setSessionGoals([...sessionGoals, newGoal]);

      // Close modal and clear form
      setIsCreateGoalModalOpen(false);
      setGoalFormData({
        title: "",
        description: "",
        dueDate: "",
        categoryId: "",
      });

    } catch (error) {
      console.error("Erro ao criar meta:", error);
      alert("Erro ao criar meta. Por favor, tente novamente.");
    } finally {
      setCreatingGoal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sessões {child ? `de ${child.name}` : ''}
          </h1>
          <p className="text-gray-600 mt-1">Ver e gerir sessões de terapia</p>
        </div>
        
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Agendar Sessão
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Próximas
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sessões Anteriores
        </button>
      </div>

      {/* Session List */}
      <div className="grid grid-cols-1 gap-4">
        {(activeTab === "upcoming" ? upcomingSessions : pastSessions).map((session) => (
          <Card
            key={session.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{session.reason}</h3>
                    {session.status && (
                      <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(session.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      {formatTime(session.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Psicólogo {session.psychologistId}
                    </div>
                  </div>

                  {activeTab === "past" && session.notes && <p className="text-gray-600 mb-4">{session.notes}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenCreateGoalModal(session)}
                  >
                    <TargetIcon className="w-4 h-4 mr-2" />
                    Adicionar Meta
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedSession(session)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Detalhes da Sessão</h2>

            <div className="space-y-4 text-gray-700">
              <div>
                <span className="font-semibold">Motivo:</span> {selectedSession.reason}
              </div>
              <div>
                <span className="font-semibold">Data:</span> {formatDate(selectedSession.date)} —{" "}
                {formatTime(selectedSession.date)}
              </div>
              {selectedSession.status && (
                <div>
                  <span className="font-semibold">Estado:</span>{" "}
                  <Badge className={getStatusColor(selectedSession.status)}>
                    {selectedSession.status}
                  </Badge>
                </div>
              )}
              {selectedSession.notes && (
                <div>
                  <span className="font-semibold">Notas:</span> {selectedSession.notes}
                </div>
              )}
            </div>

            {/* Session Goals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900">Metas da Sessão</h3>
                <Button 
                  size="sm" 
                  onClick={() => setIsCreateGoalModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Adicionar Meta
                </Button>
              </div>
              
              {loadingGoals ? (
                <p className="text-gray-600">A carregar metas...</p>
              ) : sessionGoals.length > 0 ? (
                <div className="space-y-3">
                  {sessionGoals.map((goal) => (
                    <Card key={goal.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <Badge className={getGoalStatusColor(goal.status || "pending")}>
                            {goal.status === "completed" ? "Concluída" : 
                             goal.status === "in_progress" ? "Em Progresso" : "Pendente"}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                        
                        {goal.progress !== undefined && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Progresso</span>
                              <span className="text-xs text-gray-600">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>
                        )}
                        
                        {goal.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarIcon className="w-3 h-3" />
                            Prazo: {formatDate(goal.dueDate)}
                          </div>
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

            {child && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Informação da Criança</h3>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <span className="font-semibold">Nome:</span> {child.name}
                  </p>
                  <p>
                    <span className="font-semibold">Data de Nascimento:</span> {formatDate(child.birthdate)}
                  </p>
                  <p>
                    <span className="font-semibold">Género:</span> {child.gender}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Agendar Nova Sessão</h2>

            <form onSubmit={handleCreateConsultation} className="space-y-4 text-gray-700">
              <div>
                <label className="block text-sm font-medium">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Hora</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Motivo</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 text-white">
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateGoalModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setIsCreateGoalModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
              Adicionar Meta para Sessão
            </h2>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-gray-700">
              <div>
                <label className="block text-sm font-medium">Título da Meta</label>
                <input
                  type="text"
                  value={goalFormData.title}
                  onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                  required
                  placeholder="Ex: Melhorar competências sociais"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Descrição</label>
                <textarea
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                  required
                  placeholder="Descreva os objetivos específicos desta meta"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Categoria</label>
                {loadingCategories ? (
                  <p className="text-sm text-gray-500">A carregar categorias...</p>
                ) : (
                  <select
                    value={goalFormData.categoryId}
                    onChange={(e) => setGoalFormData({ ...goalFormData, categoryId: e.target.value })}
                    className="w-full mt-1 border rounded-lg p-2"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Prazo</label>
                <input
                  type="date"
                  value={goalFormData.dueDate}
                  onChange={(e) => setGoalFormData({ ...goalFormData, dueDate: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateGoalModalOpen(false)}
                  disabled={creatingGoal}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 text-white"
                  disabled={creatingGoal || loadingCategories || !goalFormData.categoryId}
                >
                  {creatingGoal ? "A Criar..." : "Criar Meta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;