// src/pages/PsychologistChildren.tsx
import React, { useState, useEffect } from "react";
import { deleteChild, /* legado: getChildren, */ } from "../../service/childService";
import { 
  Plus, 
  Search as SearchIcon, 
  Edit, 
  Trash2, 
  Baby,
  Users,
  Heart,
  Calendar,
  Loader,
  RefreshCw,
  User,
  Cake,
  Phone,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "../../store/userStore";
import { HeaderSection } from "@/components/headerSection";

// 👉 NOVO: traga do service a função que busca as crianças por psicólogo (N:N)
import { getChildrenByPsychologist } from "../../service/childService";

// Tipos baseados no schema Zod
type Gender = "male" | "female" | "other";

interface Child {
  id: string;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  // psychologistId?: number;  // ❌ legado (1:N) — não usamos mais aqui
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
  parentName?: string;
  // psychologistName?: string; // ❌ removido — agora pode haver vários
  age?: number;
}

interface FilterOptions {
  status: "all" | "active" | "inactive";
  gender: Gender | "all";
}

const PsychologistChildren: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    gender: "all"
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Obter o psicólogo logado
  const psychologist = useAuthStore((state) => state.user);
  const psychologistId = psychologist?.id;

  // Buscar crianças da API (N:N) — APENAS do psicólogo logado
  const fetchChildren = async (isRefreshing = false) => {
    if (!psychologistId) return;
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // 🔥 AGORA buscamos direto pela associação (child_psychologists)
      const childrenData = await getChildrenByPsychologist(Number(psychologistId));
      setChildren(Array.isArray(childrenData) ? childrenData : []);
    } catch (err: any) {
      console.error("Erro ao buscar crianças:", err);
      setError(err.response?.data?.message || "Erro ao carregar crianças. Tente novamente.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar crianças ao montar o componente / quando trocar o user logado
  useEffect(() => {
    fetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psychologistId]);

  // Filtros
  useEffect(() => {
    let result = children;
    
    // Filtro de busca
    if (searchTerm) {
      result = result.filter(child => 
        child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.parentName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro de status
    if (filters.status !== "all") {
      result = result.filter(child => child.status === filters.status);
    }
    
    // Filtro de gênero
    if (filters.gender !== "all") {
      result = result.filter(child => child.gender === filters.gender);
    }
    
    setFilteredChildren(result);
  }, [children, searchTerm, filters]);

  const handleDeleteChild = async (childId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta criança?")) {
      try {
        await deleteChild(childId);
        setChildren(prev => prev.filter(child => child.id !== childId));
        toast.success("Criança excluída com sucesso!");
      } catch (err: any) {
        console.error("Erro ao excluir criança:", err);
        const errorMessage = err.response?.data?.message || "Erro ao excluir criança.";
        toast.error(errorMessage);
      }
    }
  };

  const calculateAge = (birthdate: string): number => {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderLabel = (gender: Gender): string => {
    const genders = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro"
    } as const;
    return genders[gender];
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case "male": return "👦";
      case "female": return "👧";
      default: return "👦";
    }
  };

  const getStatusColor = (status: string): string => {
    return status === "active" 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-800";
  };

  const getGenderColor = (gender: Gender): string => {
    const colors = {
      male: "bg-blue-100 text-blue-800",
      female: "bg-pink-100 text-pink-800",
      other: "bg-purple-100 text-purple-800"
    } as const;
    return colors[gender];
  };

  // Estatísticas - apenas para o psicólogo logado
  const stats = {
    total: children.length,
    active: children.filter(c => c.status === "active").length,
    male: children.filter(c => c.gender === "male").length,
    female: children.filter(c => c.gender === "female").length,
    other: children.filter(c => c.gender === "other").length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando crianças...</p>
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
              onClick={() => fetchChildren(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-10">
      {/* Cabeçalho com HeaderSection */}
      <HeaderSection
        title="Minhas Crianças"
        description="Crianças sob minha responsabilidade"
        icon={<Baby className="w-8 h-8 text-blue-600" />}
        rightContent={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchChildren(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Baby className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total de Crianças</h3>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-green-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Ativas</h3>
            <p className="text-xl font-bold text-gray-900">{stats.active}</p>
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
                ? Math.round(children.reduce((sum, c) => sum + calculateAge(c.birthdate), 0) / children.length) 
                : 0
              } anos
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou responsável..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value as any }))}
            >
              <option value="all">Todos os gêneros</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Crianças */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crianças que estão em terapia comigo</h2>
          
          {children.length === 0 ? (
            <div className="text-center py-12">
              <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma criança sob sua responsabilidade</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredChildren.map((child) => (
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
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/psychologist/children/edit/${child.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar criança"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDeleteChild(child.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Excluir criança"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      Nascimento: {new Date(child.birthdate).toLocaleDateString('pt-BR')}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      Responsável: {child.parentName || "N/A"} (ID: {child.parentId})
                    </div>

                    <div className="flex items-center text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(child.status)}`}>
                        {child.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/psychologist/children/${child.id}`}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center text-sm"
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Detalhes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PsychologistChildren;
