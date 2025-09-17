import React, { useState, useEffect } from "react";
import { getChildren, deleteChild } from "../../service/childService";
import { 
  Plus, 
  Search, 
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
  Phone
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

// Tipos baseados no schema Zod
type Gender = "male" | "female" | "other";

interface Child {
  id: string;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  psychologistId?: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
  // Campos relacionados (pode ser expandido pela API)
  parentName?: string;
  psychologistName?: string;
  age?: number;
}

interface FilterOptions {
  status: "all" | "active" | "inactive";
  gender: Gender | "all";
  hasPsychologist: "all" | "with" | "without";
}

const ManageChildren: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    gender: "all",
    hasPsychologist: "all"
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Buscar crianças da API
  const fetchChildren = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      const response = await getChildren();
      const childrenData = response.data || response;
      setChildren(Array.isArray(childrenData) ? childrenData : []);
    } catch (err: any) {
      console.error("Erro ao buscar crianças:", err);
      setError(err.response?.data?.message || "Erro ao carregar crianças. Tente novamente.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar crianças ao montar o componente
  useEffect(() => {
    fetchChildren();
  }, []);

  // Filtros
  useEffect(() => {
    let result = children;
    
    // Filtro de busca
    if (searchTerm) {
      result = result.filter(child => 
        child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.psychologistName?.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    // Filtro de psicólogo
    if (filters.hasPsychologist !== "all") {
      result = result.filter(child => 
        filters.hasPsychologist === "with" ? child.psychologistId : !child.psychologistId
      );
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

  const handleStatusToggle = async (childId: string) => {
    try {
      const child = children.find(c => c.id === childId);
      if (!child) return;

      const newStatus = child.status === "active" ? "inactive" : "active";
      await updateChildStatus(childId, newStatus);
      
      setChildren(prev => prev.map(child => 
        child.id === childId 
          ? { ...child, status: newStatus }
          : child
      ));
      
      toast.success(`Criança ${newStatus === "active" ? "ativada" : "desativada"} com sucesso!`);
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      const errorMessage = err.response?.data?.message || "Erro ao atualizar status.";
      toast.error(errorMessage);
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
    };
    return genders[gender];
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
    };
    return colors[gender];
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Idade", "Gênero", "Responsável", "Psicólogo", "Status", "Data de Criação"];
    const csvData = filteredChildren.map(child => [
      child.name,
      calculateAge(child.birthdate) + " anos",
      getGenderLabel(child.gender),
      child.parentName || "N/A",
      child.psychologistName || "N/A",
      child.status === "active" ? "Ativo" : "Inativo",
      new Date(child.createdAt).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "criancas.csv");
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Dados exportados com sucesso!");
  };

  // Estatísticas
  const stats = {
    total: children.length,
    active: children.filter(c => c.status === "active").length,
    withPsychologist: children.filter(c => c.psychologistId).length,
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
              onClick={() => fetchChildren()}
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Crianças</h1>
          <p className="text-gray-600 mt-1">Administre todas as crianças cadastradas</p>
        </div>
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
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Baby className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total</h3>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-green-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Baby className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Ativas</h3>
            <p className="text-xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Heart className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Com Psicólogo</h3>
            <p className="text-xl font-bold text-gray-900">{stats.withPsychologist}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Meninos</h3>
            <p className="text-xl font-bold text-gray-900">{stats.male}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-pink-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <User className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Meninas</h3>
            <p className="text-xl font-bold text-gray-900">{stats.female}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Outro</h3>
            <p className="text-xl font-bold text-gray-900">{stats.other}</p>
          </div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, responsável ou psicólogo..."
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

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.hasPsychologist}
              onChange={(e) => setFilters(prev => ({ ...prev, hasPsychologist: e.target.value as any }))}
            >
              <option value="all">Todos</option>
              <option value="with">Com psicólogo</option>
              <option value="without">Sem psicólogo</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Link 
              to="/admin/children/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Criança
            </Link>
            <button 
              onClick={exportToCSV}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center text-sm transition-colors"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Crianças */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criança
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Informações
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsável
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Psicólogo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChildren.map((child) => (
                <tr key={child.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Baby className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{child.name}</div>
                        <div className="text-xs text-gray-500">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${getGenderColor(child.gender)}`}>
                            {getGenderLabel(child.gender)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {calculateAge(child.birthdate)} anos
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Cake className="w-3 h-3 text-gray-400" />
                      Nascimento: {new Date(child.birthdate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {child.parentName || "Responsável"}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {child.parentId}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {child.psychologistName ? (
                      <>
                        <div className="text-sm text-gray-900">
                          {child.psychologistName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {child.psychologistId}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Não atribuído</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(child.status)}`}>
                      {child.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStatusToggle(child.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          child.status === 'active' 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={child.status === 'active' ? 'Desativar criança' : 'Ativar criança'}
                      >
                        {child.status === 'active' ? 'Desativar' : 'Ativar'}
                      </button>
                      <Link
                        to={`/admin/children/edit/${child.id}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredChildren.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {children.length === 0 ? "Nenhuma criança cadastrada" : "Nenhuma criança encontrada"}
            </p>
            {children.length === 0 && (
              <Link 
                to="/admin/children/create"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeira Criança
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageChildren;