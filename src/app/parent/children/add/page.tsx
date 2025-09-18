
"use client";
import React, { useState, useEffect } from "react";
import { createChild, getParents, getPsychologists } from "@/api/repository/childRepository";
import {
    ArrowLeft,
    Save,
    User,
    Calendar,
    Users,
    Heart,
    Cake,
    Loader,
    Baby
} from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ErrorText } from "@/components/ErrorText";

// Tipos baseados no schema Zod

interface Parent {
    id: number;
    name: string;
    email: string;
}

interface Psychologist {
    id: number;
    name: string;
    specialization: string;
}

const childFormSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    birthdate: z.string().refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        return birthDate <= today;
    }, "A data de nascimento não pode ser futura"),
    gender: z.enum(["male", "female"]),
    parentId: z.number().min(1, "É necessário selecionar um responsável"),
    psychologistId: z.number().optional()
});
type ChildFormData = z.infer<typeof childFormSchema>;
export default function AddChildPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [parents, setParents] = useState<Parent[]>([]);
    const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues
    } = useForm<ChildFormData>({
        resolver: zodResolver(childFormSchema),
        defaultValues: {
            name: "",
            birthdate: "",
            gender: "male",
            parentId: 0,
            psychologistId: undefined
        }
    });
    // Carregar pais e psicólogos
    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const [parentsData, psychologistsData] = await Promise.all([
                    getParents(),
                    getPsychologists()
                ]);

                setParents(parentsData);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setPsychologists(psychologistsData as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error("Erro ao carregar dados:", error);
                const errorMessage = error.response?.data?.message || "Erro ao carregar dados necessários.";
                toast.error(errorMessage);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, []);


    const onSubmit = async (data: ChildFormData) => {

        try {
            await createChild(data);

            toast.success("Criança cadastrada com sucesso!");
            router.push("/parent");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Erro ao cadastrar criança:", error);
            const errorMessage = error.response?.data?.message || "Erro ao cadastrar criança. Tente novamente.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (birthdate: string): string => {
        if (!birthdate) return "";

        const birthDate = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();

        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return `${age} anos`;
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Cabeçalho */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push("/parent")}
                        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Voltar para lista
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Baby className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Cadastrar Criança</h1>
                            <p className="text-gray-600">Preencha os dados da nova criança</p>
                        </div>
                    </div>
                </div>

                {/* Formulário */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Informações Básicas */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-blue-600" />
                                Informações Básicas
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Nome da Criança *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            id="name"
                                            {...register("name")}
                                            type="text"
                                            minLength={3}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Digite o nome completo"
                                        />
                                        <ErrorText field={errors.name} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                                        Data de Nascimento *
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            id="birthdate"
                                            type="date"
                                            {...register("birthdate")}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                        <ErrorText field={errors.birthdate} />
                                    </div>
                                    {getValues("birthdate") && (
                                        <p className="text-sm text-green-600 mt-1">
                                            <Cake className="w-4 h-4 inline mr-1" />
                                            {calculateAge(getValues("birthdate"))}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                                        Gênero *
                                    </label>
                                    <select
                                        id="gender"
                                        {...register("gender")}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="male">Masculino</option>
                                        <option value="female">Feminino</option>
                                        <option value="other">Outro</option>
                                    </select>
                                    <ErrorText field={errors.gender} />
                                </div>
                            </div>
                        </div>

                        {/* Responsáveis */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-green-600" />
                                Responsáveis
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Responsável (Pai/Mãe) *
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            id="parentId"
                                            {...register("parentId", { valueAsNumber: true })}

                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        >
                                            <option value="0">Selecione um responsável</option>
                                            {parents.map(parent => (
                                                <option key={parent.id} value={parent.id}>
                                                    {parent.name} - {parent.email}
                                                </option>
                                            ))}
                                        </select>
                                        <ErrorText field={errors.parentId} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="psychologistId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Psicólogo (Opcional)
                                    </label>
                                    <div className="relative">
                                        <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            id="psychologistId"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                            {...register("psychologistId", { valueAsNumber: true })}
                                        >
                                            <option value="">Selecione um psicólogo</option>
                                            {psychologists.map(psychologist => (
                                                <option key={psychologist.id} value={psychologist.id}>
                                                    {psychologist.name} - {psychologist.specialization}
                                                </option>
                                            ))}
                                        </select>
                                        <ErrorText field={errors.psychologistId} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.push("/parent")}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin mr-2" />
                                        Cadastrando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Cadastrar Criança
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
                        <li>• O responsável deve estar previamente cadastrado no sistema</li>
                        <li>• O psicólogo é opcional e pode ser atribuído posteriormente</li>
                        <li>• A data de nascimento não pode ser futura</li>
                        <li>• O nome deve ter pelo menos 3 caracteres</li>
                    </ul>
                </div>

                {/* Estatísticas Rápidas */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center">
                            <Users className="w-6 h-6 text-green-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-green-800">Responsáveis</p>
                                <p className="text-lg font-bold text-green-900">{parents.length} cadastrados</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center">
                            <Heart className="w-6 h-6 text-purple-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-purple-800">Psicólogos</p>
                                <p className="text-lg font-bold text-purple-900">{psychologists.length} disponíveis</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

}