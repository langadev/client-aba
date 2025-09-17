// app/messages/page.tsx
"use client";

import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import {
  Send as SendIcon,
  Search as SearchIcon,
  Paperclip as PaperclipIcon,
  UserPlus2,
  EllipsisVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink,
  CalendarClock,
  Inbox,
  BellDot,
  ChevronLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMessageStore } from "../store/messageStore";
import { useAuthStore } from "@/store/userStore";

import {
  getParentsByPsychologist,
  getPsychologistsByParent,
  getAllPsychologists,
} from "../api/repository/userReporitories";

import {
  getChildren,
  getChildrenByPsychologist,
  type Child,
} from "../api/repository/childRepository";
import { getGoalsByChildId } from "../api/repository/goalRepository";
import { toast } from "react-toastify";

/* ---------------- Helpers ---------------- */
const initials = (name?: string) =>
  (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const fmtTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

const yearsFrom = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const n = new Date();
  let y = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) y--;
  return String(y);
};

/* ---------------- UI primitives ---------------- */
const Tag: React.FC<{
  children: React.ReactNode;
  tone?: "green" | "blue" | "amber" | "gray";
}> = ({ children, tone = "gray" }) => {
  const map: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${map[tone]}`}>{children}</span>
  );
};

const TargetIconMini = (props: any) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" {...props}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

/* ---------------- Drawer (lista de conversas no mobile) ---------------- */
const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: React.ReactNode;
}> = ({ open, onClose, side = "left", title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 ${
          side === "left" ? "left-0" : "right-0"
        } h-full w-[92%] max-w-sm bg-white shadow-xl transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : side === "left"
            ? "-translate-x-full"
            : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b p-3 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Fechar">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-gray-900">{title || "Conversations"}</h3>
        </div>
        <div className="h-[calc(100%-3rem)] overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
};

/* ---------------- Bolha ---------------- */
const BubbleBase: React.FC<{
  own?: boolean;
  name?: string;
  time?: string;
  children: React.ReactNode;
}> = ({ own, name, time, children }) => (
  <div className={`flex ${own ? "justify-end" : "justify-start"}`} role="listitem">
    <div
      className={`max-w-[82%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
        own
          ? "bg-blue-600 text-white rounded-tr-sm"
          : "bg-white border border-gray-200 rounded-tl-sm"
      }`}
    >
      {name ? (
        <div
          className={`text-[11px] font-medium mb-1 ${
            own ? "text-blue-100" : "text-gray-700"
          }`}
        >
          {name}
        </div>
      ) : null}
      <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
        {children}
      </div>
      {time ? (
        <div className={`text-[10px] mt-1 ${own ? "text-blue-100" : "text-gray-400"}`}>
          {time}
        </div>
      ) : null}
    </div>
  </div>
);
const Bubble = memo(BubbleBase);

/* ---------------- Right Sidebar ---------------- */
const KeyRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="text-sm flex items-start justify-between gap-3 py-1">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 text-right">{value ?? "—"}</span>
  </div>
);

const Progress: React.FC<{ value: number }> = ({ value }) => (
  <div className="mt-2">
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-2 bg-blue-600"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        role="progressbar"
      />
    </div>
    <div className="text-xs text-gray-600 mt-1">{value}% concluído</div>
  </div>
);

const RightPanel: React.FC<{
  convName?: string;
  patient?: Child | null;
  primaryTherapist?: string;
  goalsPct?: number;
}> = ({ convName, patient, primaryTherapist, goalsPct }) => {
  const name = patient?.name || convName || "Paciente";
  const age = yearsFrom(patient?.birthdate) || "—";
  const progress = Number.isFinite(goalsPct!) ? (goalsPct as number) : 0;

};

/* ---------------- Chips e skeletons ---------------- */
const FilterChip: React.FC<{
  active?: boolean;
  onClick?: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}> = ({ active, onClick, label, count, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
    }`}
  >
    {icon ? (
      <span className={`${active ? "text-white" : "text-gray-600"}`}>{icon}</span>
    ) : null}
    <span>{label}</span>
    {typeof count === "number" ? (
      <span
        className={`ml-1 px-1.5 rounded-full ${
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        {count}
      </span>
    ) : null}
  </button>
);

const MessageSkeleton: React.FC = () => (
  <div className="space-y-3" role="status" aria-live="polite">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
        <div className="w-48 h-6 bg-gray-200 rounded-2xl" />
      </div>
    ))}
  </div>
);

/* ---------------- Página ---------------- */

type TabKey = "inbox" | "unread" | "open" | "resolved";

export default function Messages(): JSX.Element {
  const {
    conversations,
    messagesByConversation,
    selectedConversationId,
    fetchConversations,
    fetchConversationsByUser,
    selectConversation,
    sendMessage,
    createConversation,
    addPsychologistToConversation,
    refreshSelectedConversation,
  } = useMessageStore();

  const user = useAuthStore((s) => s.user);
  const canAddTherapist = (user?.role || "").toUpperCase() !== "PAI";

  // dados auxiliares para Patient Info
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [patient, setPatient] = useState<Child | null>(null);
  const [goalsPct, setGoalsPct] = useState<number | undefined>(undefined);
  const [primaryTherapist, setPrimaryTherapist] = useState<string | undefined>(
    undefined
  );

  // UI state
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("inbox");

  const [isListOpen, setIsListOpen] = useState(false); // mobile drawer

  // chat scroll helpers
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinel = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [incomingUnread, setIncomingUnread] = useState(0);

  // Debounce da pesquisa
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Carrega conversas e crianças
  useEffect(() => {
    const load = async () => {
      const uid = Number(user?.id);
      try {
        setLoadingConversations(true);
        if (!uid || Number.isNaN(uid)) await fetchConversations();
        else await fetchConversationsByUser(uid);
      } catch {
        await fetchConversations().catch(() => {});
      } finally {
        setLoadingConversations(false);
      }
      getChildren()
        .then((kids) => setAllChildren(kids || []))
        .catch(() => setAllChildren([]));
    };
    load();
  }, [user?.id, fetchConversations, fetchConversationsByUser]);

  // Polling da conversa aberta
  useEffect(() => {
    if (!selectedConversationId) return;
    refreshSelectedConversation();
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden")
        return;
      refreshSelectedConversation();
    }, 60000);
    return () => clearInterval(t);
  }, [selectedConversationId, refreshSelectedConversation]);

  // Resolver Patient Info
  useEffect(() => {
    const conv = conversations.find((c) => c.id === selectedConversationId) as any;
    if (!conv) {
      setPatient(null);
      setGoalsPct(undefined);
      setPrimaryTherapist(undefined);
      return;
    }

    const psy = conv.participants?.find(
      (p: any) => (p.role || "").toUpperCase() === "PSICOLOGO"
    );
    const pai = conv.participants?.find(
      (p: any) => (p.role || "").toUpperCase() === "PAI"
    );
    setPrimaryTherapist(psy?.name);

    let candidate =
      (pai &&
        allChildren.find(
          (c) => Number(c.parentId) === Number((pai as any).id)
        )) ||
      null;

    const fillGoals = async (childId: number) => {
      try {
        const goals = await getGoalsByChildId(childId);
        const total = goals.length || 0;
        const completed = goals.filter((g: any) => g.status === "completed").length;
        setGoalsPct(total ? Math.round((completed / total) * 100) : 0);
      } catch {
        setGoalsPct(undefined);
      }
    };

    if (candidate) {
      setPatient(candidate);
      fillGoals(candidate.id);
      return;
    }

    const byPsy = async () => {
      if (!psy) {
        setPatient(null);
        return;
      }
      try {
        const kids = await getChildrenByPsychologist(Number(psy.id));
        candidate = kids?.[0] || null;
        setPatient(candidate);
        if (candidate) fillGoals(candidate.id);
      } catch {
        setPatient(null);
      }
    };
    byPsy();
  }, [selectedConversationId, conversations, allChildren]);

  // contagens e filtragem
  const counts = useMemo(() => {
    const inbox = conversations.length;
    const unread = conversations.filter((c: any) => (c.unread || 0) > 0).length;
    const open = conversations.filter((c: any) => (c.unread || 0) > 0).length;
    const resolved = inbox - open;
    return { inbox, unread, open, resolved };
  }, [conversations]);

  const filteredConvs = useMemo(() => {
    let list: any[] = conversations as any[];
    if (activeTab === "unread") list = list.filter((c) => (c.unread || 0) > 0);
    else if (activeTab === "open") list = list.filter((c) => (c.unread || 0) > 0);
    else if (activeTab === "resolved")
      list = list.filter((c) => (c.unread || 0) === 0);

    if (debounced) {
      const s = debounced.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(s) ||
          (c.lastMessage || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [conversations, activeTab, debounced]);

  const currentMessages = selectedConversationId
    ? // @ts-expect-error store shape dinâmica
      messagesByConversation[selectedConversationId] || []
    : [];
  const currentConv = (conversations as any[]).find(
    (c) => c.id === selectedConversationId
  );
  const currentName = currentConv?.name || "Conversation";

  // autoscroll ao abrir conversa / enviar mensagem
  const scrollPrefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight + 100,
      behavior: scrollPrefersReduced ? "auto" : behavior,
    });
  };

  useLayoutEffect(() => {
    if (selectedConversationId) {
      setTimeout(() => scrollToBottom("auto"), 10);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    // Observer para saber se está no fundo
    const target = bottomSentinel.current;
    const root = scrollRef.current;
    if (!target || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const atBottom = entry && entry.isIntersecting;
        setIsAtBottom(!!atBottom);
        if (atBottom) setIncomingUnread(0);
      },
      { root, threshold: 0.9 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [selectedConversationId]);

  useEffect(() => {
    // Quando chegam novas mensagens
    if (!currentMessages.length) return;
    if (isAtBottom) {
      scrollToBottom("smooth");
    } else {
      setIncomingUnread((n) => n + 1);
    }
  }, [currentMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- actions ---------- */
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = async () => {
    const base = newMessage.trim();
    if (!base && !attachment) return;
    const content = attachment
      ? `${base}${base ? " " : ""}[attachment:${attachment.name}]`
      : base;
    try {
      setSending(true);
      await sendMessage(content);
      setNewMessage("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      requestAnimationFrame(() => {
        textRef.current?.focus();
      });
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (!user) return;
    try {
      let usersList: { id: number; name: string }[] = [];
      if ((user.role || "").toUpperCase() === "PAI")
        usersList = await getPsychologistsByParent(user.id);
      else if ((user.role || "").toUpperCase() === "PSICOLOGO")
        usersList = await getParentsByPsychologist(user.id);
      if (usersList.length === 0) {
        toast.info("Nenhum usuário disponível.");
        return;
      }
      const who = usersList[0];
      const c = await createConversation(who.id);
      selectConversation(c.id);
      setIsListOpen(false);
    } catch {
      toast.error("Erro ao carregar usuários.");
    }
  };

  const openAddTherapist = async () => {
    if (!selectedConversationId) return;
    const list = await getAllPsychologists();
    const currentIds = new Set((currentConv?.participants || []).map((p: any) => p.id));
    const me = Number(user?.id);
    const filtered = list.filter(
      (p: any) => !currentIds.has(p.id) && ((user?.role || "").toUpperCase() !== "PSICOLOGO" || p.id !== me)
    );
    if (filtered.length === 0) {
      toast.info("Nenhum terapeuta disponível.");
      return;
    }
    await addPsychologistToConversation(selectedConversationId, filtered[0].id);
    toast.success("Terapeuta adicionado à conversa.");
  };

  const handleFileIconClick = () => fileInputRef.current?.click();
  const handleFileSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    setAttachment(f);
  };

  // textarea auto-resize
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [newMessage]);

  /* ---------- render ---------- */
  return (
    <div className="h-full min-h-[60vh] bg-gray-50 flex min-h-0">
      {/* LEFT: Conversas */}
      <div className="hidden lg:flex w-[360px] xl:w-[380px] bg-white border-r border-gray-200 flex-col min-h-0">
        <div className="px-4 py-2 text-xs bg-amber-50 border-b border-amber-100 text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Not for Medical Emergencies — for
          urgent care call +351 123 456 789
        </div>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="hidden md:flex"
                aria-label="Search conversations"
              >
                <SearchIcon className="w-4 h-4 mr-1" /> Search
              </Button>
              <Button size="sm" className="bg-blue-600 text-white" onClick={handleNewConversation}>
                + New
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <FilterChip
              active={activeTab === "inbox"}
              onClick={() => setActiveTab("inbox")}
              icon={<Inbox className="w-3.5 h-3.5" />}
              label={`Inbox`}
              count={counts.inbox}
            />
            <FilterChip
              active={activeTab === "unread"}
              onClick={() => setActiveTab("unread")}
              icon={<BellDot className="w-3.5 h-3.5" />}
              label="Unread"
              count={counts.unread}
            />
            <FilterChip
              active={activeTab === "open"}
              onClick={() => setActiveTab("open")}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="Open"
              count={counts.open}
            />
            <FilterChip
              active={activeTab === "resolved"}
              onClick={() => setActiveTab("resolved")}
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              label="Resolved"
              count={counts.resolved}
            />
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              aria-label="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" role="navigation" aria-label="Conversation list">
          {loadingConversations ? (
            <div className="p-4 text-sm text-gray-500">Loading conversations…</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No conversations found</div>
          ) : (
            filteredConvs.map((c: any) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                  selectedConversationId === c.id ? "bg-blue-50/60 border-l-4 border-l-blue-600" : ""
                }`}
                aria-current={selectedConversationId === c.id ? "true" : undefined}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gray-200 text-gray-700">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 truncate">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.time || ""}</div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {c.role ? <Tag tone="blue">{c.role}</Tag> : null}
                      {(c.unread || 0) > 0 ? <Tag tone="green">Open</Tag> : <Tag tone="gray">Resolved</Tag>}
                    </div>
                    {c.lastMessage ? (
                      <div className="text-sm text-gray-600 truncate mt-1">{c.lastMessage}</div>
                    ) : null}
                    {(c.unread || 0) > 0 ? (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                  <EllipsisVertical className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MIDDLE: Thread */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Chat header sticky */}
        <div className="sticky top-0 z-20 p-3 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile: botão abre a lista */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsListOpen(true)}
              aria-label="Abrir conversas"
              aria-controls="mobile-conversation-drawer"
              aria-expanded={isListOpen}
            >
              <Inbox className="w-4 h-4" />
            </Button>
            {selectedConversationId ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700">
                    {initials(currentName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900">
                    {currentName}
                  </div>
                  <div className="text-[11px] text-gray-500">Online now</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-600">Select or create a conversation</div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button size="sm" variant="outline">
              <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" />
              Mark Urgent
            </Button>
            <Button size="sm" variant="outline">
              <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
              Resolve
            </Button>
            {canAddTherapist ? (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={openAddTherapist}
                title="Adicionar terapeuta à conversa"
              >
                <UserPlus2 className="w-4 h-4 mr-1" /> Adicionar terapeuta
              </Button>
            ) : null}
          </div>
        </div>

        {/* Next appointment (opcional) */}
        {selectedConversationId ? (
          <div className="px-3 pt-3">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-center gap-3">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <span className="font-medium text-blue-900">Next Appointment:</span>{" "}
                Tomorrow, Dec 21 at 2:00 PM – ABA Therapy Session
              </div>
            </div>
          </div>
        ) : null}

        {/* Thread scrollable */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0"
          role="list"
          aria-live="polite"
          aria-atomic="false"
        >
          {!selectedConversationId ? (
            <div className="h-full grid place-items-center text-gray-400">
              Select a conversation to start
            </div>
          ) : !currentMessages.length ? (
            <MessageSkeleton />
          ) : (
            <>
              {/* Carregar mais (placeholder) */}
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => refreshSelectedConversation()}>
                  Load older messages
                </Button>
              </div>

              {currentMessages.map((m: any) => {
                const isOwn =
                  m.senderId === Number(user?.id) ||
                  (m.sender && Number(m.sender.id) === Number(user?.id));
                const senderName =
                  m.sender?.name ||
                  currentConv?.participants?.find((p: any) => p.id === m.senderId)?.name ||
                  `User ${m.senderId}`;
                const contentHasAttachment =
                  /\[attachment:.*\]$/i.test(m.content || "") ||
                  /\.(pdf|docx?|xlsx?|png|jpe?g)$/i.test(m.content || "");
                return (
                  <Bubble key={m.id} own={isOwn} name={senderName} time={fmtTime(m.createdAt)}>
                    {m.content}
                    {contentHasAttachment ? (
                      <a
                        className="block mt-2 text-xs underline opacity-90"
                        href="#"
                        onClick={(e) => e.preventDefault()}
                      >
                        <FileText className="inline w-3.5 h-3.5 mr-1" /> Attachment
                      </a>
                    ) : null}
                  </Bubble>
                );
              })}
              <div ref={bottomSentinel} />
            </>
          )}
        </div>

        {/* Scroll-to-bottom + indicador de novas mensagens */}
        {!isAtBottom && selectedConversationId ? (
          <div className="absolute bottom-24 right-4 z-30 flex flex-col items-end gap-2">
            {incomingUnread > 0 ? (
              <div className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full shadow">
                {incomingUnread} novas
              </div>
            ) : null}
            <Button
              size="sm"
              className="shadow bg-white border hover:bg-gray-50"
              onClick={() => scrollToBottom("smooth")}
            >
              Ir para o fim
            </Button>
          </div>
        ) : null}

        {/* Composer sticky bottom */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600"
              onClick={handleFileIconClick}
              title="Anexar"
              aria-label="Anexar ficheiro"
            >
              <PaperclipIcon className="w-4 h-4" />
            </Button>
            <textarea
              ref={textRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message…"
              onFocus={() => scrollToBottom("auto")}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") return handleSend();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              aria-label="Message input"
              className="flex-1 max-h-40 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSend}
              disabled={sending || (!newMessage.trim() && !attachment)}
              aria-label="Enviar mensagem"
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>

          {attachment ? (
            <div className="mt-2 text-xs text-gray-700 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[60%]">{attachment.name}</span>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remover
              </button>
            </div>
          ) : null}

          <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Schedule
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Painel (desktop) */}
      {selectedConversationId ? (
        <RightPanel
          convName={currentName}
          patient={patient}
          primaryTherapist={primaryTherapist}
          goalsPct={goalsPct}
        />
      ) : null}

      {/* DRAWER MOBILE: Lista de conversas */}
      <Drawer
        open={isListOpen}
        onClose={() => setIsListOpen(false)}
        side="left"
        title="Messages"
      >
        <div id="mobile-conversation-drawer">
          <div className="px-4 py-2 text-xs bg-amber-50 border-b border-amber-100 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Not for Medical Emergencies —
            for urgent care call +351 123 456 789
          </div>
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Conversations</div>
              <Button size="sm" className="bg-blue-600 text-white" onClick={handleNewConversation}>
                + New
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <FilterChip
                active={activeTab === "inbox"}
                onClick={() => setActiveTab("inbox")}
                icon={<Inbox className="w-3.5 h-3.5" />}
                label={`Inbox`}
                count={counts.inbox}
              />
              <FilterChip
                active={activeTab === "unread"}
                onClick={() => setActiveTab("unread")}
                icon={<BellDot className="w-3.5 h-3.5" />}
                label="Unread"
                count={counts.unread}
              />
              <FilterChip
                active={activeTab === "open"}
                onClick={() => setActiveTab("open")}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                label="Open"
                count={counts.open}
              />
              <FilterChip
                active={activeTab === "resolved"}
                onClick={() => setActiveTab("resolved")}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
                label="Resolved"
                count={counts.resolved}
              />
            </div>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                aria-label="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="divide-y">
            {loadingConversations ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No conversations</div>
            ) : (
              filteredConvs.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    selectConversation(c.id);
                    setIsListOpen(false);
                  }}
                  className="w-full text-left p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gray-200 text-gray-700">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 truncate">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.time || ""}</div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {c.role ? <Tag tone="blue">{c.role}</Tag> : null}
                        {(c.unread || 0) > 0 ? (
                          <Tag tone="green">Open</Tag>
                        ) : (
                          <Tag tone="gray">Resolved</Tag>
                        )}
                      </div>
                      {c.lastMessage ? (
                        <div className="text-sm text-gray-600 truncate mt-1">
                          {c.lastMessage}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
