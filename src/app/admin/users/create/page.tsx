'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "../../../../api/repository/userReporitories";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "react-toastify";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'
import {z} from "zod";

// Tipos baseados no schema Zod
// type Gender = "male" | "female" | "other";
// type UserRole = "ADMIN" | "PAI" | "PSICOLOGO";

enum UserRole {
  PAI = "PAI",
  MAE = "MAE",
  FILHO = "FILHO",
  RESPONSAVEL = "RESPONSAVEL",
}

enum Gender {
  M = "M",
  F = "F",
  O = "O",
}
 const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme sua senha"),
  phone: z.string().min(10, "Telefone inválido"),
  birthdate: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, {
    message: "Data de nascimento inválida",
  }),
  gender: z.enum([Gender.F,Gender.M,Gender.O],"Selecione um gênero"),
  role: z.enum([UserRole.PAI,UserRole.MAE,UserRole.FILHO,UserRole.RESPONSAVEL],"Selecione um tipo de usuário"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});


 type UserFormData = z.infer<typeof userFormSchema>;

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      birthdate: "",
      gender: undefined,
      role: UserRole.PAI,
    },
  });



  const onSubmit = async (data:UserFormData) => {

    try {
      // Preparar dados para envio (remover confirmPassword)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createUser(data as unknown as any);
      
      toast.success("Usuário criado com sucesso!");
      router.back();
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      const errorMessage = error.response?.data?.message || "Erro ao criar usuário. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Novo Usuário</h1>
              <p className="text-gray-600">Preencha os dados para criar um novo usuário</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="name"
                      type="text"
                      required
                       {...register("name")}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o nome completo"
                    />
                     {errors.name && <span>{errors.name.message}</span>}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="exemplo@email.com"
                    />
                     {errors.email && <span>{errors.email.message}</span>}
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Usuário *
                  </label>
                  <select
                    id="role"
                    required
                    {...register("role")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PAI">Pai/Responsável</option>
                    <option value="PSICOLOGO">Psicólogo</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  {errors.role && <span>{errors.role.message}</span>}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gênero
                  </label>
                  <select
                    id="gender"
                    {...register("gender")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                          {errors.gender && <span>{errors.gender.message}</span>}
                </div>
              </div>
            </div>

            {/* Informações de Contato */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="(+257) 84 123 4567"
                      />
                      {errors.phone && <span>{errors.phone.message}</span>} 
                  </div>
                </div>

                <div>
                  <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="birthdate"
                      type="date"
                       {...register("birthdate")}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                  </div>
                      {errors.birthdate && <span>{errors.birthdate.message}</span>}
                </div>
              </div>
            </div>

            {/* Senha */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Segurança</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      {...register("password")}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      {...register("confirmPassword")}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                     {errors.password && <span>{errors.password.message}</span>}
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      {...register("confirmPassword")}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite novamente a senha"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                       {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Informações Importantes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Campos marcados com * são obrigatórios</li>
            <li>• A senha deve ter no mínimo 6 caracteres</li>
            <li>• O e-mail será usado para login no sistema</li>
            <li>• O tipo de usuário define as permissões de acesso</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
