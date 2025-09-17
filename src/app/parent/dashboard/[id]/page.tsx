"use client";

import React, { useEffect, useState, type JSX } from "react";
import { HeaderSection } from "@/components/headerSection";
import { useAuthStore } from "@/store/userStore";
import { cn } from "@/lib/utils";
import {
  Home,
  Calendar,
  BarChart3,
  MessageSquare,
  CreditCard,
  Target as TargetIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  User,
  LogOut,
} from "lucide-react";

// ⚠️ Ajuste estes caminhos conforme a tua estrutura real
import ChildInfo from "../../../../components/ChildInfo";
import Goals from "@/components/Goals";
import Sessions from "@/components/Sessions";
import Reports from "@/components/Reports";
import Appointments from "@/components/Appointments";
import Billing from "@/components/Billing";
import Messages from "@/components/Message";

export type Screen =
  | "dashboard"
  | "goals"
  | "consultations"
  | "reports"
  | "appointments"
  | "billing"
  | "messages";

const HEADER_HEIGHT = "4rem";

const ParentDashboard = (): JSX.Element => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    // Evita “scroll” quando o menu móvel está aberto
    document.body.classList.toggle("overflow-hidden", isMobileMenuOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobileMenuOpen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "goals":
        return <Goals />;
      case "consultations":
        return <Sessions />;
      case "reports":
        return <Reports />;
      case "appointments":
        return <Appointments />;
      case "billing":
        return <Billing />;
      case "messages":
        return <Messages />;
      default:
        return <ChildInfo />;
    }
  };

  const NavigationSection = ({
    currentScreen,
    onScreenChange,
    variant = "mobile",
  }: {
    currentScreen: Screen;
    onScreenChange: (screen: Screen) => void;
    variant?: "mobile" | "desktop";
  }) => {
    const menuItems = [
      { id: "dashboard" as Screen, label: "Dashboard", icon: Home },
      { id: "consultations" as Screen, label: "Consultas", icon: Calendar },
      { id: "goals" as Screen, label: "Metas", icon: TargetIcon },
      { id: "reports" as Screen, label: "Relatórios", icon: BarChart3 },
      { id: "appointments" as Screen, label: "Agendamentos", icon: Calendar },
      { id: "billing" as Screen, label: "Faturamento", icon: CreditCard },
      { id: "messages" as Screen, label: "Mensagens", icon: MessageSquare },
    ];

    const isDesktop = variant === "desktop";

    return (
      <>
        {/* Botão + overlay só no mobile */}
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
            // MOBILE: drawer abaixo do header, com altura certa
            !isDesktop &&
              "fixed left-0 top-16 z-50 w-72 h-[calc(100vh-4rem)] shadow-xl transition-transform duration-300 ease-out",
            !isDesktop && (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"),
            // DESKTOP: ocupa 100% do wrapper
            isDesktop && "h-full w-64 flex flex-col"
          )}
        >
          {/* Cabeçalho dentro da sidebar */}
          <div
            className={cn(
              "flex items-center justify-between px-4 border-b",
              isDesktop ? "h-14" : "h-16"
            )}
          >
            <div>
              <h1 className="text-base lg:text-lg font-bold text-gray-900">
                Portal dos Pais
              </h1>
              <p className="text-xs text-gray-600">Acompanhamento Terapêutico</p>
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

          {/* Lista com scroll próprio */}
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
                        active
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
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

          {/* User Info — sempre visível */}
          <div className="border-t border-gray-200 p-4 sticky bottom-0 bg-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name ?? "Utilizador"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header fixo */}
      <HeaderSection />

      {/* Área abaixo do header */}
      <div className="flex flex-1 pt-16" style={{ height: `calc(100vh - ${HEADER_HEIGHT})` }}>
        {/* Sidebar desktop fixa (wrapper) */}
        <div className="hidden lg:block lg:fixed lg:left-0 lg:top-16 lg:w-64 lg:h-[calc(100vh-4rem)] lg:bg-white lg:border-r lg:border-gray-200 lg:z-30">
          <NavigationSection
            currentScreen={currentScreen}
            onScreenChange={setCurrentScreen}
            variant="desktop"
          />
        </div>

        {/* Drawer mobile (instância separada) */}
        <div className="lg:hidden">
          <NavigationSection
            currentScreen={currentScreen}
            onScreenChange={setCurrentScreen}
            variant="mobile"
          />
        </div>

        {/* Conteúdo principal */}
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

export default ParentDashboard;
