import { useEffect, useState } from "react";
import { getChildren, type Child, getChildPsychologists } from "../../service/childService"; 
import { useAuthStore } from "../../store/userStore";
import { HeaderSection } from "@/components/headerSection";
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
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

interface Psychologist {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
}

interface ChildWithPsychologists extends Child {
  psychologists?: Psychologist[];
}

export default function MyChildren() {
  const [children, setChildren] = useState<ChildWithPsychologists[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [psychologistsLoading, setPsychologistsLoading] = useState<{[key: number]: boolean}>({});

  const user = useAuthStore((state) => state.user);

  const fetchChildrenWithPsychologists = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      if (!user) {
        setError("Usuário não autenticado");
        return;
      }

      // Buscar filhos do usuário
      const data = await getChildren();
      const myChildren = data.filter((child) => child.parentId === Number(user.id));

      // Buscar psicólogos para cada criança usando a rota correta
      const childrenWithPsychologists = await Promise.all(
        myChildren.map(async (child) => {
          try {
            setPsychologistsLoading(prev => ({...prev, [child.id]: true}));
            
            // Usar a rota correta para buscar psicólogos vinculados
            const psychologists = await getChildPsychologists(child.id);
            
            setPsychologistsLoading(prev => ({...prev, [child.id]: false}));
            
            return {
              ...child,
              psychologists: psychologists.map(psych => ({
                id: psych.id,
                name: psych.name,
                email: psych.email,
                phone: psych.phone,
                specialization: psych.specialization
              }))
            };
          } catch (err) {
            console.error(`Erro ao buscar psicólogos para criança ${child.id}:`, err);
            setPsychologistsLoading(prev => ({...prev, [child.id]: false}));
            return {
              ...child,
              psychologists: []
            };
          }
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
  }, [user]);

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

  const getGenderLabel = (gender: string): string => {
    const genders: { [key: string]: string } = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro"
    };
    return genders[gender] || gender;
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case "male": return "👦";
      case "female": return "👧";
      default: return "👦";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados dos filhos...</p>
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
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-20 px-4 md:px-8 lg:px-16">
      {/* Cabeçalho com HeaderSection */}
      <HeaderSection
        title="Meus Filhos"
        description="Gerencie os dados dos seus filhos"
        icon={<Baby className="w-8 h-8 text-blue-600" />}
        rightContent={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchChildrenWithPsychologists(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              to="/parent/children/add"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Filho
            </Link>
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
              {children.filter(c => c.psychologists && c.psychologists.length > 0).length}
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
                ? Math.round(children.reduce((sum, c) => sum + calculateAge(c.birthdate), 0) / children.length) 
                : 0
              } anos
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
              <p className="text-gray-500 mb-4">Nenhum filho cadastrado</p>
              <Link 
                to="/parent/children/add"
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
                      to={`/parent/children/edit/${child.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editar usuário"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      Nascimento: {new Date(child.birthdate).toLocaleDateString('pt-BR')}
                    </div>
                    
                    {psychologistsLoading[child.id] && (
                      <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                        <Loader className="w-4 h-4 text-gray-600 animate-spin mr-2" />
                        <span className="text-sm text-gray-600">Carregando psicólogos...</span>
                      </div>
                    )}

                    {child.psychologists && child.psychologists.length > 0 && (
                      <div className="space-y-3">
                        {child.psychologists.map((psychologist) => (
                          <div key={psychologist.id} className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-blue-800">Psicólogo</span>
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Ativo</span>
                            </div>
                            <p className="text-sm text-blue-900 font-medium">{psychologist.name}</p>
                            {psychologist.email && (
                              <p className="text-xs text-blue-700 mt-1">{psychologist.email}</p>
                            )}
                            {psychologist.phone && (
                              <p className="text-xs text-blue-700">{psychologist.phone}</p>
                            )}
                            {psychologist.specialization && (
                              <p className="text-xs text-blue-600 mt-1">
                                Especialização: {psychologist.specialization}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!psychologistsLoading[child.id] && (!child.psychologists || child.psychologists.length === 0) && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="text-sm text-yellow-800">Nenhum psicólogo vinculado</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    
                    
                    {child.psychologists && child.psychologists.length > 0 ? (
                      <>
                        <Link
                          to={`/parent/children/${child.id}`}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center text-sm"
                        >
                          <Heart className="w-4 h-4 mr-1" />
                          Ver Detalhes
                        </Link>
                       
                      </>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Link
            to="/parent/children/add"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
          >
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Adicionar Filho</p>
            <p className="text-sm text-gray-600">Cadastre um novo filho</p>
          </Link>
          
        </div>
      </div>
    </div>
  );
}