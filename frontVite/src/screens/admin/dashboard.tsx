import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/userStore";
import {
  DollarSignIcon,
  UsersIcon,
  CalendarIcon,
  TrendingUp,
  ClockIcon,
  DownloadIcon,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

// Charts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { listInvoices, type InvoiceDTO } from "../../service/invoiceService";
import { getChildren, type Child } from "../../service/childService";
import { getGoals, type Goal } from "../../service/goalService";
import { getUsers, type UserDTO } from "../../service/userService";
import { getConsultations, type Consultation } from "@/service/consultaionService";

// ========= Utils =========
const toNumber = (v: any, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const safeDate = (d: string | Date): Date | null => {
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? null : date;
};

const safeMonthKey = (d: string | Date): string | null => {
  const date = safeDate(d);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const fmtMoney = (n: number, currency = "MZN") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(toNumber(n));

const shortDate = (d: string) => {
  const dt = safeDate(d);
  return dt ? dt.toLocaleDateString() : "-";
};

type UserRole = "ADMIN" | "PAI" | "PSICOLOGO" | "USER";

const Dashboard: React.FC = () => {
  // ✅ seletores primitivos
  const role = (useAuthStore((s) => s.role) as UserRole) || "USER";
  const displayName =
  useAuthStore((s) => (s as any).user?.name);

  // Loading/error states
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Raw data
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);

  // Initial load (uma vez)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [inv, kids, cons, gls, us] = await Promise.all([
          listInvoices().catch(() => []),
          getChildren().catch(() => []),
          getConsultations().catch(() => []),
          getGoals().catch(() => []),
          getUsers().catch(() => []),
        ]);

        if (cancelled) return;

        setInvoices(Array.isArray(inv) ? inv : []);
        setChildren(Array.isArray(kids) ? kids : []);
        setConsultations(Array.isArray(cons) ? cons : []);
        setGoals(Array.isArray(gls) ? gls : []);
        setUsers(Array.isArray(us) ? us : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Falha ao carregar dados do dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const revenueThisMonth = invoices
      .filter((i) => safeMonthKey(i.date) === ym)
      .reduce((acc, i) => acc + (i.status === "paid" ? toNumber(i.total) : 0), 0);

    const openTotal = invoices
      .filter((i) => i.status !== "paid")
      .reduce((acc, i) => acc + toNumber(i.total), 0);

    const childrenCount = children.length;
    const consultationsThisMonth = consultations.filter((c) => safeMonthKey(c.date) === ym).length;

    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const goalsProgress = {
      completed: completedGoals,
      total: goals.length,
      pct: goals.length ? Math.round((completedGoals / goals.length) * 100) : 0,
    };

    return {
      revenueThisMonth,
      openTotal,
      childrenCount,
      consultationsThisMonth,
      goalsProgress,
    };
  }, [invoices, children, consultations, goals]);

  // ===== Charts data =====

  // 1) Receita por mês 
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    invoices
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const key = safeMonthKey(i.date);
        if (!key) return;
        map.set(key, toNumber(map.get(key)) + toNumber(i.total));
      });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-8)
      .map(([month, value]) => ({ month, value: toNumber(value) }));
  }, [invoices]);

  // 2) Faturas por status
  const invoiceStatusPie = useMemo(() => {
    const agg = { paid: 0, pending: 0, cancelled: 0 };
    invoices.forEach((i) => {
      if (i.status === "paid") agg.paid++;
      else if (i.status === "pending") agg.pending++;
      else agg.cancelled++;
    });
    const total = invoices.length || 1;
    return [
      { name: "Pagas", value: agg.paid },
      { name: "Pendentes", value: agg.pending },
      { name: "Canceladas", value: agg.cancelled },
    ].map((r) => ({ ...r, pct: Math.round((toNumber(r.value) / total) * 100) }));
  }, [invoices]);

  // 3) Consultas por status (mês atual)
  const consultationsByStatus = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const agg = new Map<string, number>();
    consultations
      .filter((c) => safeMonthKey(c.date) === ym)
      .forEach((c) => {
        const st = (c.status || "scheduled").toString().toUpperCase();
        agg.set(st, toNumber(agg.get(st)) + 1);
      });
    return Array.from(agg.entries()).map(([status, count]) => ({ status, count: toNumber(count) }));
  }, [consultations]);

  // 4) Ranking psicólogos (60 dias)
  const topPsychologists = useMemo(() => {
    const limitDays = 60;
    const now = Date.now();
    const map = new Map<number, number>();
    consultations.forEach((c) => {
      const dt = safeDate(c.date)?.getTime();
      if (!dt) return;
      if (now - dt <= limitDays * 86400000) {
        const psyId = c.psychologist?.id ?? c.psychologistId;
        if (!psyId) return;
        map.set(psyId, toNumber(map.get(psyId)) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([id, qty]) => ({
        id,
        name: users.find((u) => u.id === id)?.name || `#${id}`,
        qty: toNumber(qty),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [consultations, users]);

  // 5) Próximas faturas
  const upcomingInvoices = useMemo(() => {
    return [...invoices]
      .filter((i) => i.status === "pending")
      .sort((a, b) => {
        const da = safeDate(a.dueDate || a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const db = safeDate(b.dueDate || b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .slice(0, 5);
  }, [invoices]);

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        <p className="text-gray-600">A carregar dados…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">
            Bem-vindo, {displayName}. Aqui está o panorama geral.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {role === "ADMIN" && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receita (mês)</p>
              <p className="text-2xl font-bold text-gray-900">
                {fmtMoney(kpis.revenueThisMonth)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSignIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Aberto</p>
              <p className="text-2xl font-bold text-gray-900">
                {fmtMoney(kpis.openTotal)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crianças</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.childrenCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Consultas (mês)</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.consultationsThisMonth}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Receita por mês */}
        <Card className="xl:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Receita por mês</h3>
              <p className="text-sm text-gray-600">Somente faturas pagas</p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip formatter={(v: any) => fmtMoney(toNumber(v))} />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status de faturas */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Faturas por status</h3>
              <p className="text-sm text-gray-600">Distribuição atual</p>
            </div>
            <div className="flex items-center justify-center h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {(() => {
                    const total = Math.max(invoiceStatusPie.reduce((a, b) => a + toNumber(b.value), 0), 1);
                    return (
                      <Pie
                        data={invoiceStatusPie}
                        dataKey="value"
                        nameKey="name"
                        outerRadius="75%"
                        paddingAngle={2}
                        labelLine={false}
                        label={(e: any) => `${Math.round((toNumber(e.value) / total) * 100)}%`}
                      >
                        <Cell fill="#16a34a" /> {/* Paid */}
                        <Cell fill="#f59e0b" /> {/* Pending */}
                        <Cell fill="#ef4444" /> {/* Cancelled */}
                      </Pie>
                    );
                  })()}
                  <Legend />
                  <Tooltip formatter={(v: any) => toNumber(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultas por status + Próximas faturas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Consultas por status (mês atual)
              </h3>
            </div>
            <div className="h-72"> {/* um pouco maior */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consultationsByStatus} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Próximas faturas a vencer
            </h3>
            <div className="space-y-3">
              {upcomingInvoices.length === 0 && (
                <p className="text-sm text-gray-600">Nenhuma fatura pendente.</p>
              )}
              {upcomingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-start justify-between border-b pb-3 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-gray-900">#{inv.number}</div>
                    <div className="text-sm text-gray-600">
                      Vence: {shortDate(inv.dueDate || inv.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{fmtMoney(inv.total)}</div>
                    <div className="text-xs uppercase text-amber-600">{inv.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking psicólogos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Top Psicólogos (últimos 60 dias)
            </h3>
            <div className="space-y-2">
              {topPsychologists.length === 0 && (
                <p className="text-sm text-gray-600">Sem dados suficientes.</p>
              )}
              {topPsychologists.map((r, idx) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-gray-900">{r.name}</span>
                  </div>
                  <span className="text-gray-600">{r.qty} consultas</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
