"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChildren, type Child, getPsychologistsById } from "../../../../api/repository/childRepository";
import { useAuthStore } from "../../../../store/userStore";

import {
  Baby,
  Calendar,
  User,
  Phone,
  Edit,
  Heart,
  Loader,
  RefreshCw,
  MessageCircle,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";

interface Psychologist {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
}

interface ChildWithPsychologist extends Child {
  psychologistData?: Psychologist;
}

export default function MyChildren() {
  const [children, setChildren] = useState<ChildWithPsychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((state) => state.user);

  const fetchChildrenWithPsychologists = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      if (!user) {
        setError("Utilizador não autenticado");
        return;
      }

      const data = await getChildren();
      const myChildren = data.filter((child) => child.parentId === Number(user.id));

      const childrenWithPsychologists = await Promise.all(
        myChildren.map(async (child) => {
          if (child.psychologistId) {
            try {
              const psychologistData = await getPsychologistsById(child.psychologistId);
              return { ...child, psychologistData };
            } catch (err) {
              console.error(`Erro ao buscar psicólogo para a criança ${child.id}:`, err);
              return child;
            }
          }
          return child;
        })
      );

      setChildren(childrenWithPsychologists);
    } catch (err: any) {
      console.error("Erro ao carregar filhos:", err);
      setError(err.message || "Erro ao carregar dados dos filhos");
      toast.error("Erro ao carregar dados dos filhos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildrenWithPsychologists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // evita refetch infinito se o objeto user mudar por referência

  const calculateAge = (birthdate: string): number => {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getGenderLabel = (gender: string): string => {
    const genders: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
    };
    return genders[gender] || gender;
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case "male":
        return "👦";
      case "female":
        return "👧";
      default:
        return "👦";
    }
  };

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("pt-PT", { timeZone: "Africa/Maputo" }).format(new Date(iso));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">A carregar dados dos filhos…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-800 font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchChildrenWithPsychologists()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
        
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchChildrenWithPsychologists(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/parent/children/add"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Filho
            </Link>
          </div>
        

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Baby className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total de Filhos</h3>
            <p className="text-xl font-bold text-gray-900">{children.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-green-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Em Acompanhamento</h3>
            <p className="text-xl font-bold text-gray-900">
              {children.filter((c) => c.psychologistId).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Idade Média</h3>
            <p className="text-xl font-bold text-gray-900">
              {children.length > 0
                ? Math.round(
                    children.reduce((sum, c) => sum + calculateAge(c.birthdate), 0) / children.length
                  )
                : 0}{" "}
              anos
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Filhos */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lista de Filhos</h2>

          {children.length === 0 ? (
            <div className="text-center py-12">
              <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhum filho registado</p>
              <Link
                href="/parent/children/add"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Filho
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {children.map((child) => (
                <div key={child.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getGenderIcon(child.gender)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{child.name}</h3>
                        <p className="text-sm text-gray-600">
                          {calculateAge(child.birthdate)} anos • {getGenderLabel(child.gender)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/parent/children/edit/${child.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editar utilizador"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      Nascimento: {formatDate(child.birthdate)}
                    </div>

                    {child.psychologistData && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-blue-800">Psicólogo</span>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Ativo
                          </span>
                        </div>
                        <p className="text-sm text-blue-900 font-medium">{child.psychologistData.name}</p>
                        {child.psychologistData.email && (
                          <p className="text-xs text-blue-700 mt-1">{child.psychologistData.email}</p>
                        )}
                        {child.psychologistData.phone && (
                          <p className="text-xs text-blue-700">{child.psychologistData.phone}</p>
                        )}
                        {child.psychologistData.specialization && (
                          <p className="text-xs text-blue-600 mt-1">
                            Especialização: {child.psychologistData.specialization}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/parent/children/edit/${child.id}`}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
                    >
                      <User className="w-4 h-4 mr-1" />
                      Editar
                    </Link>

                    {child.psychologistData ? (
                      <>
                        <Link
                          href={`/parent/children/${child.id}`}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center text-sm"
                        >
                          <Heart className="w-4 h-4 mr-1" />
                          Ver Detalhes
                        </Link>
                        <Link
                          href={`/parent/chat/${child.psychologistData.id}`}
                          className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center text-sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Conversar
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/parent/psychologists"
                        className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center text-sm"
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        Buscar Psicólogo
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Informações Importantes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Heart className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p>Para adicionar um novo filho, clicar no botão “Adicionar Filho”.</p>
          </div>
          <div className="flex items-start gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p>Conversar com o psicólogo através do botão “Conversar”.</p>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p>Manter os dados sempre atualizados.</p>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p>Contactar a equipa para suporte adicional.</p>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/parent/children/add"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
          >
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Adicionar Filho</p>
            <p className="text-sm text-gray-600">Registar um novo filho</p>
          </Link>

          <Link
            href="/parent/psychologists"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
          >
            <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Buscar Psicólogos</p>
            <p className="text-sm text-gray-600">Encontrar profissionais</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
