"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Baby,
  Heart,
  User as UserIcon,
  Calendar,
  Edit,
  Trash2,
  Search as SearchIcon,
  RefreshCw,
  Loader,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/userStore";
import { HeaderSection } from "@/components/headerSection";
import {
  getChildrenByPsychologist,
  deleteChild,
} from "../../api/repository/childRepository";

// ===== Tipos =====
type Gender = "male" | "female" | "other";
type Status = "active" | "inactive";

interface Child {
  id: number | string;
  name: string;
  birthdate: string;
  gender: Gender;
  parentId: number;
  status: Status;
  createdAt: string;
  updatedAt?: string;
  parentName?: string;
}

// ===== Utils =====
const calculateAge = (birthdate: string): number => {
  const d = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const genderLabel = (g: Gender) =>
  g === "male" ? "Masculino" : g === "female" ? "Feminino" : "Outro";

const genderEmoji = (g: Gender) => (g === "female" ? "👧" : "👦");

const statusPill = (s: Status) =>
  s === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";

// simples debounce hook
function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function PsychologistChildrenPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const psychologistId = user?.id;

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros / ordenação / busca
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [status, setStatus] = useState<"all" | Status>("all");
  const [gender, setGender] = useState<"all" | Gender>("all");
  const [sort, setSort] = useState<"name_asc" | "age_desc" | "created_desc">(
    "name_asc"
  );

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Guard de role
  useEffect(() => {
    if (user && user.role !== "PSICOLOGO") {
      toast.error("Acesso restrito a psicólogos.");
      router.push("/"); // ajusta a rota que fizer sentido
    }
  }, [user, router]);

  const fetchChildren = async (isRefreshing = false) => {
    if (!psychologistId) return;
    setError(null);
    isRefreshing ? setRefreshing(true) : setLoading(true);
    try {
      const data = await getChildrenByPsychologist(Number(psychologistId));
      // normaliza ids para número quando possível
      const normalized: Child[] = (data || []).map((c: any) => ({
        ...c,
        id: typeof c.id === "string" && /^\d+$/.test(c.id) ? Number(c.id) : c.id,
      }));
      setChildren(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Erro ao carregar crianças.");
      toast.error("Não foi possível carregar as crianças.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psychologistId]);

  // derived: stats
  const stats = useMemo(() => {
    const total = children.length;
    const active = children.filter((c) => c.status === "active").length;
    const ages = children.map((c) => calculateAge(c.birthdate));
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const male = children.filter((c) => c.gender === "male").length;
    const female = children.filter((c) => c.gender === "female").length;
    const other = children.filter((c) => c.gender === "other").length;
    return { total, active, avgAge, male, female, other };
  }, [children]);

  // filtra + ordena
  const filtered = useMemo(() => {
    let list = [...children];

    if (debouncedQ.trim()) {
      const t = debouncedQ.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(t) ||
          (c.parentName || "").toLowerCase().includes(t)
      );
    }
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (gender !== "all") list = list.filter((c) => c.gender === gender);

    switch (sort) {
      case "age_desc":
        list.sort((a, b) => calculateAge(b.birthdate) - calculateAge(a.birthdate));
        break;
      case "created_desc":
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [children, debouncedQ, status, gender, sort]);

  // paginação derivada
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  useEffect(() => {
    // sempre que filtros/busca mudarem, volta para a página 1
    setPage(1);
  }, [debouncedQ, status, gender, sort, pageSize]);

  const handleDeleteChild = async (childId: number | string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta criança?")) return;
    try {
      await deleteChild(childId);
      setChildren((prev) => prev.filter((c) => c.id !== childId));
      toast.success("Criança excluída com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Erro ao excluir criança.");
    }
  };

  // ===== Render =====
  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <HeaderSection />
        <div className="mt-20 max-w-7xl mx-auto space-y-6">
          {/* skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl border animate-pulse bg-gray-100" />
            ))}
          </div>
          <div className="rounded-xl border p-6">
            <div className="h-10 w-full rounded bg-gray-100 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl border animate-pulse bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <HeaderSection />
        <div className="mt-20 max-w-2xl mx-auto">
          <div className="rounded-xl border p-6 text-center">
            <p className="text-red-600 font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => fetchChildren(true)}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <HeaderSection />

      <div className="mt-20 max-w-7xl mx-auto space-y-6">
        {/* Título + ações */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Minhas Crianças</h1>
            <p className="text-gray-600">Crianças sob minha responsabilidade</p>
          </div>
          <button
            onClick={() => fetchChildren(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Baby className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm text-gray-600">Total de Crianças</h3>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="p-2 bg-green-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm text-gray-600">Ativas</h3>
            <p className="text-xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm text-gray-600">Idade Média</h3>
            <p className="text-xl font-bold text-gray-900">{stats.avgAge} anos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome ou responsável…"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>

              <select
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="all">Todos os gêneros</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>

              <select
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
              >
                <option value="name_asc">Ordenar: Nome (A→Z)</option>
                <option value="age_desc">Ordenar: Idade (maior→menor)</option>
                <option value="created_desc">Ordenar: Mais recente</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Por página</span>
              <select
                className="px-3 py-2 border rounded-lg"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[8, 12, 16, 24].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Crianças que estão em terapia comigo
            </h2>

            {children.length === 0 ? (
              <div className="text-center py-12">
                <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma criança sob sua responsabilidade.</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum resultado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginated.map((child) => (
                  <div
                    key={child.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{genderEmoji(child.gender)}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{child.name}</h3>
                          <p className="text-sm text-gray-600">
                            {calculateAge(child.birthdate)} anos • {genderLabel(child.gender)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/psychologist/children/edit/${child.id}`}
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
                        Nascimento:{" "}
                        {new Intl.DateTimeFormat("pt-PT").format(new Date(child.birthdate))}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                        Responsável: {child.parentName || "N/A"} (ID: {child.parentId})
                      </div>

                      <div className="flex items-center text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusPill(child.status)}`}>
                          {child.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`therapist/dashboard/${child.id}`}
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

            {/* Paginação */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando{" "}
                  <span className="font-medium">
                    {(pageSafe - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-medium">
                    {Math.min(pageSafe * pageSize, filtered.length)}
                  </span>{" "}
                  de <span className="font-medium">{filtered.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe === 1}
                    className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {pageSafe} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe === totalPages}
                    className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Busy overlay em refresh (leve) */}
      {refreshing && (
        <div className="fixed bottom-4 right-4 rounded-full bg-white shadow px-3 py-2 border flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">A atualizar…</span>
        </div>
      )}
    </div>
  );
}
