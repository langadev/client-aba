import React, { useState, useEffect } from "react";
import { getUsers, deleteUser} from "../../service/userService";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  BarChart3,
  Download,
  Mail,
  Phone,
  Calendar,
  Loader,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

// Tipos baseados no schema Zod
type Gender = "male" | "female" | "other";
type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthdate?: string;
  gender?: Gender;
  role: UserRole;
  createdAt: string;
  status: "active" | "inactive";
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  // Buscar usuários da API
  const fetchUsers = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      const response = await getUsers();
      // Adaptar a resposta conforme a estrutura da sua API
      const usersData = response.data || response;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err: any) {
      console.error("Erro ao buscar usuários:", err);
      setError(err.response?.data?.message || "Erro ao carregar usuários. Tente novamente.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar usuários ao montar o componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtros
  useEffect(() => {
    let result = users;
    
    if (searchTerm) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter !== "all") {
      result = result.filter(user => user.status === statusFilter);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await deleteUser(userId);
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast.success("Usuário excluído com sucesso!");
      } catch (err: any) {
        console.error("Erro ao excluir usuário:", err);
        const errorMessage = err.response?.data?.message || "Erro ao excluir usuário.";
        toast.error(errorMessage);
      }
    }
  };

  const handleStatusToggle = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = user.status === "active" ? "inactive" : "active";
      await updateUserStatus(userId, newStatus);
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: newStatus }
          : user
      ));
      
      toast.success(`Usuário ${newStatus === "active" ? "ativado" : "desativado"} com sucesso!`);
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      const errorMessage = err.response?.data?.message || "Erro ao atualizar status.";
      toast.error(errorMessage);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleColor = (role: UserRole): string => {
    const colors = {
      ADMIN: "bg-red-100 text-red-800",
      PAI: "bg-blue-100 text-blue-800",
      PSICOLOGO: "bg-purple-100 text-purple-800",
      USER: "bg-gray-100 text-gray-800"
    };
    return colors[role];
  };

  const getStatusColor = (status: string): string => {
    return status === "active" 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-800";
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Cargo", "Status", "Data de Criação"];
    const csvData = filteredUsers.map(user => [
      user.name,
      user.email,
      user.phone || "N/A",
      user.role,
      user.status,
      new Date(user.createdAt).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "usuarios.csv");
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Dados exportados com sucesso!");
  };

  // Estatísticas
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    admins: users.filter(u => u.role === "ADMIN").length,
    psychologists: users.filter(u => u.role === "PSICOLOGO").length,
    parents: users.filter(u => u.role === "PAI").length,
    regularUsers: users.filter(u => u.role === "USER").length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando usuários...</p>
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
              onClick={() => fetchUsers()}
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
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-1">Administre todos os usuários do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchUsers(true)}
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
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total</h3>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-green-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Ativos</h3>
            <p className="text-xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-red-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Admins</h3>
            <p className="text-xl font-bold text-gray-900">{stats.admins}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Psicólogos</h3>
            <p className="text-xl font-bold text-gray-900">{stats.psychologists}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Pais</h3>
            <p className="text-xl font-bold text-gray-900">{stats.parents}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-center">
            <div className="p-2 bg-gray-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Usuários</h3>
            <p className="text-xl font-bold text-gray-900">{stats.regularUsers}</p>
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
                placeholder="Buscar por nome, email ou telefone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            >
              <option value="all">Todos os cargos</option>
              <option value="ADMIN">Administrador</option>
              <option value="PAI">Pai/Responsável</option>
              <option value="PSICOLOGO">Psicólogo</option>
              <option value="USER">Usuário</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Link 
              to="/admin/users/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Link>
            <button 
              onClick={exportToCSV}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center text-sm transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
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
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">
                          {user.gender && `${user.gender === 'male' ? 'Masculino' : user.gender === 'female' ? 'Feminino' : 'Outro'} • `}
                          {user.birthdate && new Date(user.birthdate).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {user.phone}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {user.role === 'ADMIN' ? 'Administrador' :
                       user.role === 'PAI' ? 'Pai/Responsável' :
                       user.role === 'PSICOLOGO' ? 'Psicólogo' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={user.status === 'active' ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.status === 'active' ? 'Desativar' : 'Ativar'}
                      </button>
                      <Link
                        to={`/admin/users/edit/${user.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Excluir usuário"
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

        {filteredUsers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {users.length === 0 ? "Nenhum usuário cadastrado" : "Nenhum usuário encontrado"}
            </p>
            {users.length === 0 && (
              <Link 
                to="/admin/users/create"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Usuário
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

function updateUserStatus(userId: string, newStatus: string) {
  throw new Error("Function not implemented.");
}
