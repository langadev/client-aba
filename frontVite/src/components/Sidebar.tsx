// src/screens/admin/AdminSidebar.tsx
import React, { useEffect, useState, type JSX } from "react";
import { HeaderSection } from "@/components/headerSection";
import {
  Home,
  Users,
  UserCog,
  Calendar,
  BarChart3,
  MessageSquare,
  CreditCard,
  Menu as MenuIcon,
  X as CloseIcon,
  User as UserIcon,
  LogOut,
} from "lucide-react";

import ManageChildren from "@/screens/admin/ManageChildren";
import ManageConsultation from "@/screens/admin/ManageConsultation";
import ManageUsers from "@/screens/admin/ManageUsers";
import Reports from "@/screens/reports/reports";
import Dashboard from "@/screens/admin/dashboard"
import {Appointments} from "@/screens/appointments/appointments";
import Billing from "@/screens/billing/billing";
// import Messages from "@/screens/messages/messages"; // habilita se já tiveres o módulo

import { useAuthStore } from "@/store/userStore";
import { cn } from "../../utils/cn";

/* =========================================================
   Tipagem das telas
========================================================= */
export type Screen =
  | "dashboard"
  | "children"
  | "psychologists"
  | "consultations"
  | "reports"
  | "appointments"
  | "billing"
  | "messages";

/* =========================================================
   Placeholder de Agendamentos (se ainda não tiver módulo)
========================================================= */


/* =========================================================
   Componente principal
========================================================= */
const AdminSidebar = (): JSX.Element => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();

  // trava o scroll quando o drawer está aberto
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isMobileMenuOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobileMenuOpen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "children":
        return <ManageChildren />;
      case "psychologists":
        return <ManageUsers />;
      case "consultations":
        return <ManageConsultation />;
      case "reports":
        return <Reports />;
      case "appointments":
        return <Appointments />;
      case "billing":
        return <Billing />;
      // case "messages":
      //   return <Messages />;
      default:
        return <Dashboard />;
    }
  };

  /* =========================================================
     Navegação (desktop + mobile drawer)
  ========================================================= */
  const NavigationSection = ({
    currentScreen,
    onScreenChange,
    variant = "mobile",
  }: {
    currentScreen: Screen;
    onScreenChange: (s: Screen) => void;
    variant?: "mobile" | "desktop";
  }) => {
    const menuItems = [
      { id: "dashboard" as Screen, label: "Dashboard", icon: Home },
      { id: "children" as Screen, label: "Crianças", icon: Users },
      { id: "psychologists" as Screen, label: "Usuários", icon: UserCog },
      { id: "consultations" as Screen, label: "Consultas", icon: Calendar },
      { id: "appointments" as Screen, label: "Agendamentos", icon: Calendar },
      { id: "reports" as Screen, label: "Relatórios", icon: BarChart3 },
      { id: "billing" as Screen, label: "Faturamento", icon: CreditCard },
      // { id: "messages" as Screen, label: "Mensagens", icon: MessageSquare },
    ];

    const isDesktop = variant === "desktop";

    return (
      <>
        {/* Botão do menu e overlay — apenas no mobile */}
        {!isDesktop && (
          <>
            <div className="lg:hidden fixed top-4 left-4 z-50">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Abrir menu"
                className="p-2 rounded-md bg-white shadow-md border border-gray-200"
              >
                <MenuIcon size={22} />
              </button>
            </div>

            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <nav
          aria-label="Navegação principal"
          className={cn(
            "bg-white border-r border-gray-200",
            // MOBILE drawer (aparece abaixo do header fixo)
            !isDesktop &&
              "fixed left-0 top-16 z-50 w-72 h-[calc(100vh-4rem)] shadow-xl transition-transform duration-300 ease-out",
            !isDesktop && (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"),
            // DESKTOP sidebar fixa
            isDesktop && "h-full w-64 flex flex-col"
          )}
        >
          {/* Cabeçalho da sidebar */}
          <div className={cn("flex items-center justify-between px-4 border-b", isDesktop ? "h-14" : "h-16")}>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-gray-900">Administração</h1>
              <p className="text-xs text-gray-600">Painel de controlo</p>
            </div>
            {!isDesktop && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-2 hover:bg-gray-100"
              >
                <CloseIcon size={20} />
              </button>
            )}
          </div>

          {/* Lista (scroll própria) */}
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = currentScreen === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onScreenChange(item.id);
                        if (!isDesktop) setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* User info no rodapé da sidebar */}
          <div className="border-t border-gray-200 p-4 sticky bottom-0 bg-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name ?? "Utilizador"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email ?? ""}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <LogOut size={16} className="mr-3" />
              Terminar Sessão
            </button>
          </div>
        </nav>
      </>
    );
  };

  /* =========================================================
     Layout
  ========================================================= */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header fixo */}
      <HeaderSection />

      {/* Área abaixo do header */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar desktop fixa */}
        <div className="hidden lg:block lg:fixed lg:left-0 lg:top-16 lg:w-64 lg:h-[calc(100vh-4rem)] lg:bg-white lg:border-r lg:border-gray-200 lg:z-30">
          <NavigationSection
            currentScreen={currentScreen}
            onScreenChange={setCurrentScreen}
            variant="desktop"
          />
        </div>

        {/* Drawer mobile */}
        <div className="lg:hidden">
          <NavigationSection
            currentScreen={currentScreen}
            onScreenChange={setCurrentScreen}
            variant="mobile"
          />
        </div>

        {/* Conteúdo principal com scroll independente */}
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-4rem)]">
          <div className="p-4 lg:p-6 h-full">
            <div className="bg-white rounded-xl p-4 lg:p-6 h-full overflow-y-auto">
              {renderScreen()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSidebar;
