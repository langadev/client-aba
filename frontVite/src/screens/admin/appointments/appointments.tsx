import React, { useState, type JSX } from "react";
import { CalendarIcon, ClockIcon, UserIcon, VideoIcon, MapPinIcon, PlusIcon, EditIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

export const Appointments = (): JSX.Element => {
  const [selectedView, setSelectedView] = useState("calendar");

  const appointments = [
    {
      id: 1,
      title: "Prática de Competências Sociais",
      date: "15 Dez, 2024",
      time: "14:00 - 15:00",
      therapist: "Dr. Michael Chen",
      type: "Virtual",
      status: "confirmed",
      location: "Sala de Sessão Virtual",
    },
    {
      id: 2,
      title: "Regulação Emocional",
      date: "17 Dez, 2024",
      time: "10:00 - 10:45",
      therapist: "Dra. Sarah Williams",
      type: "Presencial",
      status: "confirmed",
      location: "Sala 204, Clínica ABA",
    },
    {
      id: 3,
      title: "Competências de Vida Diária",
      date: "19 Dez, 2024",
      time: "15:30 - 16:30",
      therapist: "Dr. Michael Chen",
      type: "Presencial",
      status: "pending",
      location: "Sala 201, Clínica ABA",
    },
    {
      id: 4,
      title: "Avaliação Semanal",
      date: "22 Dez, 2024",
      time: "11:00 - 12:00",
      therapist: "Dra. Sarah Williams",
      type: "Presencial",
      status: "pending",
      location: "Sala 204, Clínica ABA",
    },
  ];

  const availableSlots = [
    { date: "16 Dez, 2024", time: "09:00", therapist: "Dr. Michael Chen" },
    { date: "16 Dez, 2024", time: "14:00", therapist: "Dra. Sarah Williams" },
    { date: "18 Dez, 2024", time: "10:30", therapist: "Dr. Michael Chen" },
    { date: "20 Dez, 2024", time: "13:00", therapist: "Dra. Sarah Williams" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "Virtual" ? VideoIcon : MapPinIcon;
  };

  const getTypeText = (type: string) => {
    return type === "Virtual" ? "Virtual" : "Presencial";
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6  min-h-screen">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Marcações</h1>
          <p className="text-gray-600 mt-1">Agendar e gerir marcações de terapia</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusIcon className="w-4 h-4 mr-2" />
          Agendar Marcação
        </Button>
      </div>

      {/* Alternar Visualização */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedView("calendar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === "calendar"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Vista de Calendário
        </button>
        <button
          onClick={() => setSelectedView("list")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Vista de Lista
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Conteúdo Principal */}
        <div className="xl:col-span-2">
          {selectedView === "calendar" ? (
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Dezembro 2024</h2>
                
                {/* Grelha de Calendário Simples */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                  
                  {/* Dias do Calendário */}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const hasAppointment = [15, 17, 19, 22].includes(day);
                    return (
                      <div
                        key={day}
                        className={`p-2 text-center text-sm cursor-pointer rounded-lg hover:bg-gray-100 ${
                          hasAppointment ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-700"
                        }`}
                      >
                        {day}
                        {hasAppointment && (
                          <div className="w-1 h-1 bg-blue-600 rounded-full mx-auto mt-1"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="bg-white rounded-xl shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{appointment.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {getStatusText(appointment.status)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {React.createElement(getTypeIcon(appointment.type), { className: "w-3 h-3" })}
                              {getTypeText(appointment.type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {appointment.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            {appointment.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            {appointment.therapist}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {React.createElement(getTypeIcon(appointment.type), { className: "w-4 h-4" })}
                          {appointment.location}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {appointment.type === "Virtual" && appointment.status === "confirmed" && (
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <VideoIcon className="w-4 h-4 mr-2" />
                            Entrar na Sessão
                          </Button>
                        )}
                        <Button variant="outline">
                          <EditIcon className="w-4 h-4 mr-2" />
                          Remarcar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Barra Lateral */}
        <div className="space-y-6">
          {/* Agendamento Rápido */}
          <Card className="bg-white rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Agendamento Rápido</h3>
              <div className="space-y-3">
                {availableSlots.slice(0, 4).map((slot, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{slot.time}</span>
                      <Button size="sm" variant="outline">Marcar</Button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{slot.date}</p>
                      <p>{slot.therapist}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                Ver Todos os Horários Disponíveis
              </Button>
            </CardContent>
          </Card>

          {/* Diretrizes de Marcação */}
          <Card className="bg-blue-50 rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Diretrizes de Marcação</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Chegue 10 minutos antes para sessões presenciais</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Sessões virtuais requerem uma ligação à Internet estável</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Cancelamentos devem ser feitos com 24 horas de antecedência</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Traga qualquer trabalho de casa ou materiais discutidos em sessões anteriores</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};