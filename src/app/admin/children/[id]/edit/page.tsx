const childrenSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  birthdate: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    return birthDate <= today;
  }, "A data de nascimento não pode ser futura"),
  gender: z.enum(Gender),
  parentId: z.number().min(1, "Selecione um responsável"),
  psychologistId: z.number().optional(),
   status: z.enum(
    ["active", "inactive"],),
})
type ChildrenFormData = z.infer<typeof childrenSchema>;

const EditChildPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [parents, setParents] = useState<Parent[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [linkedPsychologists, setLinkedPsychologists] = useState<Psychologist[]>([]);
  const [newPsychologistId, setNewPsychologistId] = useState<number | "">("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<ChildrenFormData>({
    resolver: zodResolver(childrenSchema),
    mode: "onSubmit",
    defaultValues: {
      name: "",
      birthdate: "",
      gender: Gender.male,
      parentId: 0,
      psychologistId: undefined,
    }
  });

  // const [formData, setFormData] = useState<ChildFormData>({
  // });

  // Carregar dados da criança, pais, psicólogos e lista de vinculados (N:N)
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast.error("ID da criança não especificado");
        navigate("/parent");
        return;
      }

      setLoadingData(true);
      try {
        const [childData, parentsData, psychologistsData, linkedPs] = await Promise.all([
          getChildById(id),
          getParents(),
          getPsychologists(),           // já retorna somente PSICOLOGO
          getChildPsychologists(id),    // lista de psicólogos vinculados via N:N
        ]);

        const child = (childData as any).data || childData;
        setValue("name", child.name || "");
        // setValue("birthdate", child.birthdate ? String(child.birthdate).split("T")[0] : "");
        // setValue("gender",child.gender || "male");
        setValue("parentId", child.parentId || 0);
        setValue("psychologistId", child.psychologistId || undefined); // principal (legado)

        setParents((parentsData as any).data || parentsData);
        setPsychologists((psychologistsData as any).data || psychologistsData);
        setLinkedPsychologists((linkedPs as any).data || linkedPs);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        const errorMessage =
          error?.response?.data?.message || "Erro ao carregar dados necessários.";
        toast.error(errorMessage);
        navigate("/parent");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, navigate]);



  // Adiciona +1 psicólogo (N:N)
  const handleAddPsychologist = async () => {
    if (!id || !newPsychologistId) return;
    try {
      const updated = await addPsychologistToChild(id, Number(newPsychologistId));
      const list = (updated as any).data || updated;
      setLinkedPsychologists(list);
      setNewPsychologistId("");
      toast.success("Psicólogo adicionado à criança.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao adicionar psicólogo");
    }
  };

  // Remove um psicólogo da criança (N:N)
  const handleRemovePsychologist = async (psychologistId: number) => {
    if (!id) return;
    try {
      const updated = await removePsychologistFromChild(id, psychologistId);
      const list = (updated as any).data || updated;
      setLinkedPsychologists(list);
      toast.success("Psicólogo removido da criança.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao remover psicólogo");
    }
  };

  const onSubmit = async (data: ChildFormData) => {
    setLoading(true);



    try {
      await updateChild(id!, data as any);
      toast.success("Criança atualizada com sucesso!");
      navigate("/parent");
    } catch (error: any) {
      console.error("Erro ao atualizar criança:", error);
      const errorMessage =
        error?.response?.data?.message || "Erro ao atualizar criança. Tente novamente.";
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
    return `${ age } anos`;
  };

  const getGenderLabel = (gender: Gender): string => {
    if(Gender.male) return "Masculino";
    if(Gender.female) return "Feminino";
    return "Outro";
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados da criança...</p>
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
            onClick={() => navigate("/parent")}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para lista de crianças
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Baby className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Criança</h1>
              <p className="text-gray-600">Atualize os dados da criança</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="name"
                      type="text"
                      {...register("name")}
                      minLength={3}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o nome completo"
                    />
                     {errors.name && <span>{errors.name.message}</span>}
                  </div>
                </div>

                <div>
                  <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="birthdate"
                      {...register("birthdate")}
                      type="date"
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      max={new Date().toISOString().split("T")[0]}
                    />
                     {errors.birthdate && <span>{errors.birthdate.message}</span>}
                  </div>
                  {getValues("birthdate") && (
                    <p className="text-sm text-green-600 mt-1">
                      <Cake className="w-4 h-4 inline mr-1" />
                      {calculateAge(getValues("birthdate"))} • {getGenderLabel(getValues("gender"))}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gênero *
                  </label>
                  <select
                    id="gender"
                    required
                    {...register("gender")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                  {errors.gender && <span>{errors.gender.message}</span>}
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    required
                    {...register("status")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </select>
                  {errors.status && <span>{errors.status.message}</span>}
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
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="parentId"
                      required
                      {...register("parentId", { valueAsNumber: true })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="0">Selecione um responsável</option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name} - {parent.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Psicólogo principal (LEGADO / opcional) */}
                <div>
                  <label htmlFor="psychologistId" className="block text-sm font-medium text-gray-700 mb-2">
                    Psicólogo principal (opcional)
                  </label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="psychologistId"
                      {...register("psychologistId", { valueAsNumber: true })}
                      
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Selecione um psicólogo</option>
                      {psychologists.map((psychologist) => (
                        <option key={psychologist.id} value={psychologist.id}>
                          {psychologist.name}
                          {psychologist.specialization ? ` - ${ psychologist.specialization }` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Psicólogos vinculados (N:N) */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-purple-600" />
                Psicólogos vinculados à criança
              </h2>

              {/* Lista de vinculados */}
              {linkedPsychologists.length === 0 ? (
                <p className="text-sm text-gray-600 mb-3">Nenhum psicólogo vinculado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {linkedPsychologists.map((ps) => (
                    <span
                      key={ps.id}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm"
                    >
                      {ps.name}
                      <button
                        type="button"
                        onClick={() => handleRemovePsychologist(ps.id)}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                        title="Remover"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Adicionar mais um psicólogo */}
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <select
                  value={newPsychologistId}
                  onChange={(e) =>
                    setNewPsychologistId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar psicólogo...</option>
                  {psychologists
                    .filter((p) => !linkedPsychologists.some((lp) => lp.id === p.id)) // evita duplicados
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.specialization ? `– ${ p.specialization }` : ""}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddPsychologist}
                  disabled={!newPsychologistId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Você pode manter um “psicólogo principal” no campo acima (legado) e vincular demais
                psicólogos aqui.
              </p>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/children")}
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
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Atualizar Criança
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
            <li>• A data de nascimento não pode ser futura</li>
            <li>• O nome deve ter pelo menos 3 caracteres</li>
            <li>• O status "Inativa" impede o acesso aos recursos da criança</li>
            <li>• A alteração do responsável atualizará todos os registros associados</li>
          </ul>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">Responsáveis Disponíveis</p>
                <p className="text-lg font-bold text-green-900">{parents.length} cadastrados</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center">
              <Heart className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-purple-800">Psicólogos Disponíveis</p>
                <p className="text-lg font-bold text-purple-900">{psychologists.length} cadastrados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dados da Criança */}
        {getValues("birthdate") && (
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Informações da Criança</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Idade Atual:</span>
                <p className="text-gray-900">{calculateAge(getValues("birthdate"))}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Data de Nascimento:</span>
                <p className="text-gray-900">
                  {new Date(getValues("birthdate")).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Gênero:</span>
                <p className="text-gray-900">{getGenderLabel(getValues("gender"))}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <p className="text-gray-900">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${ getValues("status") === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {getValues("status") === "active" ? "Ativa" : "Inativa"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
