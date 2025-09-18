// src/api/repository/parentService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export type ParentLite = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  childNames?: string[]; // opcional
};

export async function listParentsLite(
  { q = "", limit = 20 }: { q?: string; limit?: number } = {}
): Promise<ParentLite[]> {
  // 1) tenta a rota nova (se existir no backend)
  try {
    const res = await API.get("/parents/lite", {
      ...getAuthHeaders(),
      params: { q, limit },
    });
    return res.data as ParentLite[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // 404 ⇒ segue para fallback. Outros erros, relança.
    if (err?.response?.status && err.response.status !== 404) throw err;
  }

  // 2) fallback: usar /users?role=PAI (já existente no teu backend)
  const res = await API.get("/users", {
    ...getAuthHeaders(),
    params: { role: "PAI" },
  });

  let list = (res.data || []) as Array<{
    id: number;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;

  // garante que só vem PAI mesmo se o backend esquecer de filtrar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list = list.filter(u => (u as any).role === "PAI" || (u as any).role === undefined);

  // pesquisa simples no cliente
  if (q) {
    const s = q.toLowerCase();
    list = list.filter(
      u =>
        (u.name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.phone || "").includes(q)
    );
  }

  // devolve o formato "lite"
  return list.slice(0, limit).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
  }));
}
