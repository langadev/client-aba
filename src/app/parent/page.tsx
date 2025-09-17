"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getChildrenByParent,
  getChildrenWithPsychologists,
  type ChildWithPsychologists,
} from "../../api/repository/childRepository"
import { useAuthStore } from "@/store/userStore";
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

export default function MyChildren() {
  const [children, setChildren] = useState<ChildWithPsychologists[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((state) => state.user);

  const fetchChildrenWithPsychologists = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      if (!user?.id) {
        setError("Utilizador não autenticado");
        return;
      }

      // Opção A (mais performática se o backend tiver o endpoint por pai):
      const raw = await getChildrenByParent(Number(user.id));
      // enriquece cada child com psicólogos vinculados
      const result: ChildWithPsychologists[] = await Promise.all(
        raw.map(async (c) => {
          // reutiliza a lógica do service
          const { getChildByIdWithPsychologists } = await import("../../api/repository/childRepository");
          return getChildByIdWithPsychologists(c.id);
        })
      );

      // Opção B (simples): busca todos e filtra por parentId
      // const all = await getChildrenWithPsychologists();
      // const result = all.filter((c) => c.parentId === Number(user.id));

      setChildren(result);
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
  }, [user?.id]);

  const calculateAge = (birthdate: string): number => {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getGenderLabel = (gender: string): string => {
    const genders: Record<string, string> = { male: "Masculino", female: "Feminino", other: "Outro" };
    return genders[gender] || gender;
  };

  const getGenderIcon = (gender: string) => (gender === "female" ? "👧" : "👦");

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
      {/* Ações topo */}
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
              {children.filter((c) => (c.psychologists?.length || c.psychologistId)).length}
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
                ? Math.round(children.reduce((s, c) => s + calculateAge(c.birthdate), 0) / children.length)
                : 0}{" "}
              anos
            </p>
          </div>
        </div>
      </div>

      {/* Lista */}
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
              {children.map((child) => {
                const mainPsy = child.psychologistData ?? child.psychologists?.[0] ?? null;
                return (
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

                      {mainPsy && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-800">Psicólogo</span>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              Ativo
                            </span>
                          </div>
                          <p className="text-sm text-blue-900 font-medium">{mainPsy.name}</p>
                          {mainPsy.email && <p className="text-xs text-blue-700 mt-1">{mainPsy.email}</p>}
                          {mainPsy.phone && <p className="text-xs text-blue-700">{mainPsy.phone}</p>}
                          {"specialization" in mainPsy && mainPsy.specialization && (
                            <p className="text-xs text-blue-600 mt-1">Especialização: {mainPsy.specialization}</p>
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

                      {mainPsy ? (
                        <>
                          <Link
                            href={`parent/dashboard/${child.id}`}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center text-sm"
                          >
                            <Heart className="w-4 h-4 mr-1" />
                            Ver Detalhes
                          </Link>
                          <Link
                            href={`/parent/chat/${mainPsy.id}`}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info extra + Ações rápidas … (mantém igual ao teu) */}
      {/* ... */}
    </div>
  );
}
