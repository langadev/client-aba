// app/users/[id]/edit/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Save,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  Loader,
  CheckCircle2,
  MapPin,
  Building,
  Globe,
  Plus,
} from "lucide-react";

import { useAuthStore } from "@/store/userStore";
import { getUserById, updateUser } from "../../api/repository/userReporitories";

// LOCATION
import {
  getLocation,
  upsertLocation,
  type LocationDTO,
} from "../../api/repository/locationService";

// CHILDREN
import {
  getChildrenByParent,
  getChildrenByPsychologist,
  createChild,
  type Child,
  type Gender as ChildGender,
} from "../../api/repository/childRepository";

// HEALTH / SCHOOL
import {
  getChildHealth,
  upsertChildHealth,
  type ChildHealthDTO,
} from "../../api/repository/childHealthService";
import {
  getChildSchool,
  upsertChildSchool,
  type ChildSchoolDTO,
} from "../../api/repository/childSchoolService";

// Tipos
type Gender = "male" | "female" | "other";
type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";

interface UserFormData {
  id?: number;
  name: string;
  email: string;
  // Senhas
  oldPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  // Pessoais/Contato
  phone?: string;
  birthdate?: string;
  gender?: Gender | "";
  role: UserRole;
  isActive: boolean;
  preferredName?: string;
  secondaryPhone?: string;
  contactMethod?: "Email" | "Phone" | "SMS";
  // Endereço/Localização
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  // Faturação (mockável)
  nif?: string;
  iban?: string;
  billingName?: string;
  company?: string;
  // Datas
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

type TabKey = "pessoal" | "filhos" | "saude" | "educacao" | "documentos";

const mockFallback = {
  phone: "+258 84 123 4567",
  secondaryPhone: "+258 82 987 6543",
  preferredName: "",
  contactMethod: "Email" as const,
  street: "Av. Július Nyerere, 100",
  city: "Maputo",
  state: "",
  postalCode: "1100",
  country: "Moçambique",
  timezone: "Africa/Maputo",
  nif: "123456789",
  iban: "MZ59 •••• •••• ••••",
  billingName: "",
  company: "",
};

const getInitials = (name?: string) =>
  (name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

const roleLabel = (r?: UserRole) =>
  r === "PAI"
    ? "Pai/Responsável"
    : r === "PSICOLOGO"
    ? "Psicólogo"
    : r === "ADMIN"
    ? "Administrador"
    : "Utilizador";

const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "—";

const formatDateOnly = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // auth & redirecionamento por role
  const auth = useAuthStore();
  const userRole = auth.user?.role as UserRole | undefined;
  const loggedUserId = Number(auth.user?.id);

  const redirectByRole = () => {
    if (userRole === "ADMIN") router.push("/admin/users");
    else if (userRole === "PAI") router.push("/parent");
    else if (userRole === "PSICOLOGO") router.push("/psychologist/dashboard");
    else router.push("/");
  };

  // estados base
  const [loadingPage, setLoadingPage] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<TabKey>("pessoal");

  const [form, setForm] = useState<UserFormData>({
    name: "",
    email: "",
    birthdate: "",
    gender: "",
    role: "USER",
    isActive: true,
    ...mockFallback,
  });

  // LOCATION
  const [location, setLocation] = useState<LocationDTO | null>(null);

  // FILHOS
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // SAÚDE / EDUCAÇÃO (dados do filho selecionado)
  const [childHealth, setChildHealth] = useState<ChildHealthDTO | null>(null);
  const [childSchool, setChildSchool] = useState<ChildSchoolDTO | null>(null);

  // Sucesso inline nas abas
  const [successHealth, setSuccessHealth] = useState<string | null>(null);
  const [successSchool, setSuccessSchool] = useState<string | null>(null);

  // Modal: adicionar filho (apenas PAI)
  const [openAddChild, setOpenAddChild] = useState(false);
  const [newChild, setNewChild] = useState<{
    name: string;
    birthdate: string;
    gender: ChildGender | "";
  }>({ name: "", birthdate: "", gender: "" });

  // Formulários inline (saúde/escola)
  const [healthForm, setHealthForm] = useState<ChildHealthDTO>({
    childId: 0,
    allergies: "",
    medications: "",
    diagnoses: "",
    notes: "",
  });

  const [schoolForm, setSchoolForm] = useState<ChildSchoolDTO>({
    childId: 0,
    schoolName: "",
    grade: "",
    yearLabel: "",
    teacherName: "",
    transportPlan: false,
    independencePlan: false,
    iepActive: false,
    iepNotes: "",
    accommodations: [],
  });

  // header helpers
  const iniciais = useMemo(() => getInitials(form.name), [form.name]);

  // carregar utilizador + localização + filhos/pacientes
  useEffect(() => {
    let cancelado = false;
    const run = async () => {
      if (!id) return;
      setLoadingPage(true);
      try {
        // USER
        const res = await getUserById(id);
        const data = res.data ?? res;

        // LOCATION
        let loc: LocationDTO | null = null;
        try {
          loc = await getLocation(Number(id));
        } catch {
          loc = null;
        }

        // CHILDREN/PACIENTES
        let kids: Child[] = [];
        try {
          if (userRole === "PAI" && Number(id) === loggedUserId) {
            kids = await getChildrenByParent(loggedUserId);
          } else if (userRole === "PSICOLOGO" && Number(id) === loggedUserId) {
            kids = await getChildrenByPsychologist(loggedUserId);
          } else {
            kids = [];
          }
        } catch {
          kids = [];
        }

        if (cancelado) return;

        setForm((prev) => ({
          ...prev,
          id: data?.id ?? prev.id,
          name: data?.name ?? prev.name,
          email: data?.email ?? prev.email,
          phone: data?.phone ?? prev.phone ?? mockFallback.phone,
          birthdate: data?.birthdate ?? prev.birthdate ?? "",
          gender: (data?.gender as Gender) ?? prev.gender ?? "",
          role: (data?.role as UserRole) ?? prev.role,
          isActive: typeof data?.isActive === "boolean" ? data.isActive : true,
          // datas
          createdAt: data?.createdAt ?? prev.createdAt,
          updatedAt: data?.updatedAt ?? prev.updatedAt,
          lastLogin: data?.lastLogin ?? prev.lastLogin,
          // location
          street: loc?.street ?? prev.street,
          city: loc?.city ?? prev.city,
          state: loc?.state ?? prev.state,
          postalCode: loc?.postalCode ?? prev.postalCode,
          country: loc?.country ?? prev.country,
          timezone: loc?.timezone ?? prev.timezone,
          // faturação mocks
          nif: prev.nif,
          iban: prev.iban,
          billingName: prev.billingName || data?.name || prev.name,
          company: prev.company,
          oldPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        }));

        setLocation(loc);
        setChildren(kids);
        setSelectedChildId(kids.length ? kids[0].id : null);
      } catch (err: any) {
        console.error(err);
        toast.error(
          err?.response?.data?.message || "Erro ao carregar dados do utilizador."
        );
        redirectByRole();
      } finally {
        if (!cancelado) setLoadingPage(false);
      }
    };
    run();
    return () => {
      cancelado = true;
    };
  }, [id, userRole, loggedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar saúde/escola do filho selecionado
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedChildId) {
        setChildHealth(null);
        setChildSchool(null);
        setHealthForm({
          childId: 0,
          allergies: "",
          medications: "",
          diagnoses: "",
          notes: "",
        });
        setSchoolForm({
          childId: 0,
          schoolName: "",
          grade: "",
          yearLabel: "",
          teacherName: "",
          transportPlan: false,
          independencePlan: false,
          iepActive: false,
          iepNotes: "",
          accommodations: [],
        });
        return;
      }
      try {
        const [h, s] = await Promise.all([
          getChildHealth(selectedChildId).catch(() => null),
          getChildSchool(selectedChildId).catch(() => null),
        ]);
        if (cancelled) return;

        setChildHealth(h);
        setChildSchool(s);

        setHealthForm({
          childId: selectedChildId,
          allergies: h?.allergies ?? "",
          medications: h?.medications ?? "",
          diagnoses: h?.diagnoses ?? "",
          notes: h?.notes ?? "",
        });
        setSchoolForm({
          childId: selectedChildId,
          schoolName: s?.schoolName ?? "",
          grade: s?.grade ?? "",
          yearLabel: s?.yearLabel ?? "",
          teacherName: s?.teacherName ?? "",
          transportPlan: !!s?.transportPlan,
          independencePlan: !!s?.independencePlan,
          iepActive: !!s?.iepActive,
          iepNotes: s?.iepNotes ?? "",
          accommodations: s?.accommodations ?? [],
          therapistId: s?.therapistId ?? undefined,
        });
      } catch {
        if (!cancelled) {
          setChildHealth(null);
          setChildSchool(null);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  // helpers
  const setField = (
    name: keyof UserFormData,
    value: string | UserFormData[keyof UserFormData]
  ) => setForm((p) => ({ ...p, [name]: value}));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Alterar senha: requer senha atual + nova + confirmação
    const querAlterarSenha =
      !!form.oldPassword || !!form.newPassword || !!form.confirmNewPassword;

    if (querAlterarSenha) {
      if (!form.oldPassword) {
        toast.error("Para alterar a senha, informe a senha atual.");
        return;
      }
      if (!form.newPassword || !form.confirmNewPassword) {
        toast.error("Informe a nova senha e a confirmação.");
        return;
      }
      if (form.newPassword !== form.confirmNewPassword) {
        toast.error("As novas senhas não coincidem.");
        return;
      }
      if (form.newPassword.length < 6) {
        toast.error("A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }
    }

    setSalvando(true);
    try {
      // 1) Atualiza usuário
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthdate: form.birthdate || undefined,
        gender: form.gender || undefined,
        role: form.role,
        isActive: form.isActive,
        // mocks (ok enviar)
        contactMethod: form.contactMethod,
        preferredName: form.preferredName,
        secondaryPhone: form.secondaryPhone,
        // faturação
        nif: form.nif,
        iban: form.iban,
        billingName: form.billingName,
        company: form.company,
      };

      if (querAlterarSenha) {
        payload.oldPassword = form.oldPassword;
        payload.password = form.newPassword;
      }

      await updateUser(id!, payload);

      // 2) Upsert de localização
      const uid = Number(id);
      if (!Number.isNaN(uid)) {
        const locPayload: Partial<LocationDTO> = {
          userId: uid,
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          timezone: form.timezone,
          preferredContactMethod: (form.contactMethod) || undefined,
        };
        await upsertLocation(uid, locPayload);
      }

      toast.success("Utilizador atualizado com sucesso!");
      redirectByRole();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Falha ao atualizar utilizador. Verifique os dados."
      );
    } finally {
      setSalvando(false);
    }
  };

  // salvar saúde (aba saúde) – apenas PAI
  const saveHealth = async () => {
    if (userRole !== "PAI") return;
    try {
      if (!selectedChildId) {
        toast.info("Selecione uma criança primeiro.");
        return;
      }
      const payload = {
        allergies: healthForm.allergies || null,
        diagnoses: healthForm.diagnoses || null,
        medications: healthForm.medications || null,
        notes: healthForm.notes || null,
      };
      await upsertChildHealth(selectedChildId, payload);
      const fresh = await getChildHealth(selectedChildId).catch(() => null);
      setChildHealth(fresh);
      toast.success("Informações de saúde guardadas.");
      setSuccessHealth("As informações de saúde foram guardadas com sucesso.");
      setTimeout(() => setSuccessHealth(null), 3500);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao guardar saúde.");
    }
  };

  // salvar educação (aba educacao) – apenas PAI
  const saveSchool = async () => {
    if (userRole !== "PAI") return;
    try {
      if (!selectedChildId) {
        toast.info("Selecione uma criança primeiro.");
        return;
      }
      const payload = {
        schoolName: schoolForm.schoolName || null,
        grade: schoolForm.grade || null,
        yearLabel: schoolForm.yearLabel || null,
        teacherName: schoolForm.teacherName || null,
        transportPlan: !!schoolForm.transportPlan,
        independencePlan: !!schoolForm.independencePlan,
        iepActive: !!schoolForm.iepActive,
        iepNotes: schoolForm.iepNotes || null,
        accommodations: schoolForm.accommodations || null,
        therapistId: schoolForm.therapistId ?? null,
      };
      await upsertChildSchool(selectedChildId, payload);
      const fresh = await getChildSchool(selectedChildId).catch(() => null);
      setChildSchool(fresh);
      toast.success("Informações de educação guardadas.");
      setSuccessSchool("As informações escolares foram guardadas com sucesso.");
      setTimeout(() => setSuccessSchool(null), 3500);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao guardar educação.");
    }
  };

  // criar filho – apenas PAI
  const submitNewChild = async () => {
    try {
      if (userRole !== "PAI") {
        toast.error("Apenas Pai/Responsável pode adicionar filhos.");
        return;
      }
      if (!newChild.name || !newChild.birthdate || !newChild.gender) {
        toast.error("Preencha nome, data de nascimento e género.");
        return;
      }
      const payload = {
        name: newChild.name,
        birthdate: newChild.birthdate,
        gender: newChild.gender as ChildGender,
        parentId: loggedUserId,
      };
      const created = await createChild(payload);
      toast.success("Filho adicionado com sucesso.");
      setOpenAddChild(false);
      // atualiza lista
      const updated =
        userRole === "PAI"
          ? await getChildrenByParent(loggedUserId)
          : await getChildrenByPsychologist(loggedUserId);
      setChildren(updated);
      setSelectedChildId(created.id);
      // reset form
      setNewChild({ name: "", birthdate: "", gender: "" });
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao adicionar filho.");
    }
  };

  const currentChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId) || null
    : null;

  const isPsychologist = userRole === "PSICOLOGO";
  const isParent = userRole === "PAI";

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Voltar */}
        <button
          onClick={redirectByRole}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Perfil curto */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold">
                {getInitials(form.name)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {form.name || "Utilizador"}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                  </span>
                </div>

                <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-3">
                  <span>{roleLabel(form.role)}</span>
                  <span>•</span>
                  <span>{form.email}</span>
                  {form.phone && (
                    <>
                      <span>•</span>
                      <span>{form.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Datas */}
            <div className="text-xs text-gray-600">
              <div>
                <strong>Criado em:</strong> {formatDateTime(form.createdAt)}
              </div>
              <div>
                <strong>Atualizado em:</strong> {formatDateTime(form.updatedAt)}
              </div>
              <div>
                <strong>Último login:</strong> {formatDateTime(form.lastLogin)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto mt-5">
            <div className="flex gap-6 px-1 border-b">
              {[
                { k: "pessoal", label: "Informações Pessoais" },
                { k: "filhos", label: "Filhos/Pacientes" },
                { k: "saude", label: "Informações de Saúde" },
                { k: "educacao", label: "Educação & Vida Diária" },
                { k: "documentos", label: "Documentos" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setAbaAtiva(t.k as TabKey)}
                  className={`py-3 text-sm border-b-2 -mb-px ${
                    abaAtiva === t.k
                      ? "border-blue-600 text-blue-700 font-semibold"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border">
          <div className="p-6">
            {abaAtiva === "pessoal" && (
              <form onSubmit={onSubmit} className="space-y-8">
                {/* Informações Pessoais */}
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Informações Pessoais
                  </h2>

                  {/* Básicas */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Dados Básicos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">Nome completo *</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            required
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Nome preferido</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.preferredName || ""}
                          onChange={(e) => setField("preferredName", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Data de nascimento</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="date"
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            value={form.birthdate || ""}
                            onChange={(e) => setField("birthdate", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Género</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.gender || ""}
                          onChange={(e) => setField("gender", e.target.value as Gender)}
                        >
                          <option value="">Selecione…</option>
                          <option value="male">Masculino</option>
                          <option value="female">Feminino</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Contacto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">E-mail *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            required
                            value={form.email}
                            onChange={(e) => setField("email", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Telemóvel (principal)</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            value={form.phone || ""}
                            onChange={(e) => setField("phone", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Telemóvel (secundário)</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.secondaryPhone || ""}
                          onChange={(e) => setField("secondaryPhone", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">
                          Método de contacto preferido
                        </label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.contactMethod || "Email"}
                          onChange={(e) =>
                            setField(
                              "contactMethod",
                              e.target.value as UserFormData["contactMethod"]
                            )
                          }
                        >
                          <option value="Email">Email</option>
                          <option value="Phone">Telefone</option>
                          <option value="SMS">SMS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Endereço & Localização */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Endereço & Localização
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm mb-1">Morada</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            value={form.street || ""}
                            onChange={(e) => setField("street", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Cidade</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.city || ""}
                          onChange={(e) => setField("city", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Estado/Província</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.state || ""}
                          onChange={(e) => setField("state", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Código Postal</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.postalCode || ""}
                          onChange={(e) => setField("postalCode", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">País</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            value={form.country || ""}
                            onChange={(e) => setField("country", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Fuso horário</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.timezone || ""}
                          onChange={(e) => setField("timezone", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Papel & Atividade */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Papel & Atividade
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">Papel do utilizador</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.role}
                          onChange={(e) => setField("role", e.target.value as UserRole)}
                        >
                          <option value="USER">Utilizador</option>
                          <option value="PAI">Pai/Responsável</option>
                          <option value="PSICOLOGO">Psicólogo</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="ativo"
                          type="checkbox"
                          className="w-4 h-4"
                          checked={form.isActive}
                          onChange={(e) => setField("isActive", e.target.checked)}
                        />
                        <label htmlFor="ativo" className="text-sm">
                          Utilizador ativo
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Faturação */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Faturação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">NIF</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.nif || ""}
                          onChange={(e) => setField("nif", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Nome de faturação</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                            value={form.billingName || form.name}
                            onChange={(e) => setField("billingName", e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">IBAN (opcional)</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.iban || ""}
                          onChange={(e) => setField("iban", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Empresa (opcional)</label>
                        <input
                          className="w-full px-3 py-2 border rounded-lg"
                          value={form.company || ""}
                          onChange={(e) => setField("company", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alterar senha */}
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Alterar senha
                    </h3>
                    <p className="text-xs text-gray-600 mb-3">
                      Para atualizar, forneça a <strong>senha atual</strong> e
                      defina a nova senha.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">Senha atual</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type={mostrarSenhaAtual ? "text" : "password"}
                            className="w-full pl-9 pr-9 py-2 border rounded-lg"
                            value={form.oldPassword || ""}
                            onChange={(e) => setField("oldPassword", e.target.value)}
                            placeholder="••••••"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                            onClick={() => setMostrarSenhaAtual((v) => !v)}
                          >
                            {mostrarSenhaAtual ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Nova senha</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type={mostrarNovaSenha ? "text" : "password"}
                            className="w-full pl-9 pr-9 py-2 border rounded-lg"
                            value={form.newPassword || ""}
                            onChange={(e) => setField("newPassword", e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                            onClick={() => setMostrarNovaSenha((v) => !v)}
                          >
                            {mostrarNovaSenha ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">
                          Confirmar nova senha
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type={mostrarConfirmacao ? "text" : "password"}
                            className="w-full pl-9 pr-9 py-2 border rounded-lg"
                            value={form.confirmNewPassword || ""}
                            onChange={(e) =>
                              setField("confirmNewPassword", e.target.value)
                            }
                            minLength={6}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                            onClick={() => setMostrarConfirmacao((v) => !v)}
                          >
                            {mostrarConfirmacao ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={redirectByRole}
                      className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={salvando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
                      disabled={salvando}
                    >
                      {salvando ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          A guardar…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Guardar alterações
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </form>
            )}

            {abaAtiva === "filhos" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isParent ? "Filhos" : isPsychologist ? "Pacientes" : "Perfis"}
                  </h2>
                  {isParent && (
                    <button
                      onClick={() => setOpenAddChild(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Filho
                    </button>
                  )}
                </div>

                {(!isParent && !isPsychologist) ? (
                  <p className="text-sm text-gray-600">
                    Esta secção está disponível para Pai/Responsável (filhos) e Psicólogo (pacientes).
                  </p>
                ) : children.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    {isParent ? "Nenhum filho encontrado." : "Nenhum paciente encontrado."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children.map((c) => (
                      <div
                        key={c.id}
                        className={`p-4 rounded-lg border cursor-pointer ${
                          selectedChildId === c.id
                            ? "border-blue-600 bg-blue-50/30"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedChildId(c.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                            {getInitials(c.name)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-600">
                              Nasc.: {formatDateOnly(c.birthdate)} • Género: {c.gender}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {abaAtiva === "saude" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Informações de Saúde
                  </h2>
                  {successHealth && (
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded">
                      {successHealth}
                    </div>
                  )}
                </div>

                {(!isParent && !isPsychologist) ? (
                  <p className="text-sm text-gray-600">
                    Disponível para o Pai/Responsável e para o Psicólogo (visualização).
                  </p>
                ) : children.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhuma criança/paciente encontrado(a).</p>
                ) : (
                  <>
                    {/* seleção do filho/paciente */}
                    <div className="flex flex-wrap gap-2">
                      {children.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedChildId(c.id)}
                          className={`px-3 py-1.5 rounded-lg border text-sm ${
                            selectedChildId === c.id
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>

                    {/* formulário inline */}
                    {selectedChildId ? (
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Alergias</label>
                          <textarea
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            rows={2}
                            value={healthForm.allergies || ""}
                            onChange={(e) =>
                              setHealthForm((p) => ({ ...p, allergies: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Medicação</label>
                          <textarea
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            rows={2}
                            value={healthForm.medications || ""}
                            onChange={(e) =>
                              setHealthForm((p) => ({ ...p, medications: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Diagnósticos</label>
                          <textarea
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            rows={2}
                            value={healthForm.diagnoses || ""}
                            onChange={(e) =>
                              setHealthForm((p) => ({ ...p, diagnoses: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Notas</label>
                          <textarea
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            rows={2}
                            value={healthForm.notes || ""}
                            onChange={(e) =>
                              setHealthForm((p) => ({ ...p, notes: e.target.value }))
                            }
                          />
                        </div>

                        {isParent && (
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={saveHealth}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Guardar saúde
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Selecione uma criança/paciente para visualizar.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}

            {abaAtiva === "educacao" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Educação & Vida Diária
                  </h2>
                  {successSchool && (
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded">
                      {successSchool}
                    </div>
                  )}
                </div>

                {(!isParent && !isPsychologist) ? (
                  <p className="text-sm text-gray-600">
                    Disponível para o Pai/Responsável e para o Psicólogo (visualização).
                  </p>
                ) : children.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhuma criança/paciente encontrado(a).</p>
                ) : (
                  <>
                    {/* seleção do filho/paciente */}
                    <div className="flex flex-wrap gap-2">
                      {children.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedChildId(c.id)}
                          className={`px-3 py-1.5 rounded-lg border text-sm ${
                            selectedChildId === c.id
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>

                    {/* formulário inline escola */}
                    {selectedChildId ? (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm mb-1">Escola</label>
                          <input
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            value={schoolForm.schoolName || ""}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, schoolName: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Ano/Turma</label>
                          <input
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            value={schoolForm.grade || ""}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, grade: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Ano letivo (rótulo)</label>
                          <input
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            value={schoolForm.yearLabel || ""}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, yearLabel: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Professor(a)</label>
                          <input
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            value={schoolForm.teacherName || ""}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, teacherName: e.target.value }))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="iepActive"
                            type="checkbox"
                            disabled={isPsychologist}
                            checked={!!schoolForm.iepActive}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, iepActive: e.target.checked }))
                            }
                          />
                          <label htmlFor="iepActive" className="text-sm">
                            IEP ativo
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="transportPlan"
                            type="checkbox"
                            disabled={isPsychologist}
                            checked={!!schoolForm.transportPlan}
                            onChange={(e) =>
                              setSchoolForm((p) => ({
                                ...p,
                                transportPlan: e.target.checked,
                              }))
                            }
                          />
                          <label htmlFor="transportPlan" className="text-sm">
                            Plano de transporte
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="independencePlan"
                            type="checkbox"
                            disabled={isPsychologist}
                            checked={!!schoolForm.independencePlan}
                            onChange={(e) =>
                              setSchoolForm((p) => ({
                                ...p,
                                independencePlan: e.target.checked,
                              }))
                            }
                          />
                          <label htmlFor="independencePlan" className="text-sm">
                            Plano de autonomia
                          </label>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm mb-1">Notas IEP</label>
                          <textarea
                            disabled={isPsychologist}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                            }`}
                            rows={2}
                            value={schoolForm.iepNotes || ""}
                            onChange={(e) =>
                              setSchoolForm((p) => ({ ...p, iepNotes: e.target.value }))
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm mb-1">
                            Acomodações (título — nota opcional)
                          </label>
                          <div className="space-y-2">
                            {(schoolForm.accommodations || []).map((ac, idx) => (
                              <div key={idx} className="flex gap-2">
                                <input
                                  disabled={isPsychologist}
                                  className={`flex-1 border rounded-lg px-3 py-2 ${
                                    isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                                  }`}
                                  placeholder="Título"
                                  value={ac.title}
                                  onChange={(e) => {
                                    const list = [...(schoolForm.accommodations || [])];
                                    list[idx] = { ...list[idx], title: e.target.value };
                                    setSchoolForm((p) => ({
                                      ...p,
                                      accommodations: list,
                                    }));
                                  }}
                                />
                                <input
                                  disabled={isPsychologist}
                                  className={`flex-1 border rounded-lg px-3 py-2 ${
                                    isPsychologist ? "bg-gray-100 cursor-not-allowed" : ""
                                  }`}
                                  placeholder="Nota (opcional)"
                                  value={ac.note || ""}
                                  onChange={(e) => {
                                    const list = [...(schoolForm.accommodations || [])];
                                    list[idx] = { ...list[idx], note: e.target.value };
                                    setSchoolForm((p) => ({
                                      ...p,
                                      accommodations: list,
                                    }));
                                  }}
                                />
                              </div>
                            ))}
                            {!isPsychologist && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSchoolForm((p) => ({
                                    ...p,
                                    accommodations: [
                                      ...(p.accommodations || []),
                                      { title: "", note: "" },
                                    ],
                                  }))
                                }
                                className="text-sm text-blue-600"
                              >
                                + Adicionar acomodação
                              </button>
                            )}
                          </div>
                        </div>

                        {isParent && (
                          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={saveSchool}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Guardar educação
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Selecione uma criança/paciente para visualizar.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}

            {abaAtiva === "documentos" && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Documentos
                </h2>
                <p className="text-sm text-gray-600">Em breve.</p>
              </section>
            )}
          </div>
        </div>

        {/* Rodapé – dicas */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-1">Notas</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Campos com * são obrigatórios.</li>
            <li>
              • Para alterar a senha, informe a <strong>senha atual</strong> e a
              nova senha (mínimo 6 caracteres).
            </li>
            <li>
              • Campos de endereço e faturação já estão prontos para integração
              com o backend (Location/Billing).
            </li>
          </ul>
        </div>
      </div>

      {/* MODAL: Adicionar Filho (apenas PAI) */}
      {openAddChild && isParent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Adicionar Filho
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Nome *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newChild.name}
                  onChange={(e) =>
                    setNewChild((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Data de nascimento *</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  value={newChild.birthdate}
                  onChange={(e) =>
                    setNewChild((p) => ({ ...p, birthdate: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Género *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={newChild.gender}
                  onChange={(e) =>
                    setNewChild((p) => ({
                      ...p,
                      gender: e.target.value as ChildGender,
                    }))
                  }
                >
                  <option value="">Selecione…</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="md:col-span-2 text-xs text-gray-500">
                O <b>parentId</b> será definido automaticamente como o ID do
                utilizador atual ({loggedUserId}).
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setOpenAddChild(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={submitNewChild}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
     