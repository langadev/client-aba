"use client";

import { type JSX } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/userStore";
import Image from "next/image";
import Logo from "../../public/images/Logo Preto Fundo transparente.png"; // ajusta o caminho conforme a tua pasta

export const HeaderSection = (): JSX.Element => {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleProfileClick = () => {
    if (!user) return;
    switch (user.role) {
      case "ADMIN":
        router.push(`/admin/users/profile/${user.id}`);
        break;
      case "PAI":
        router.push(`/pai/profile/${user.id}`);
        break;
  // manter conforme a store
      case "PSICOLOGO": // fallback caso corrijas o nome
        router.push(`/terapeuta/profile/${user.id}`);
        break;
      default:
        console.warn("Role não reconhecida:", user.role);
        router.push("/login");
    }
  };

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200
        h-16
      "
      role="banner"
    >
      <div
        className="
          h-full px-3 sm:px-4 lg:px-6
          max-w-7xl mx-auto
          flex items-center justify-between
        "
      >
        {/* Logo + Títulos */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
            <Image
              src={Logo}
              alt="ABA Clinic & Consulting"
              className="object-contain w-full h-full"
              draggable={false}
            />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              ABA Clinic & Consulting
            </div>
            <div className="text-gray-600 text-xs sm:text-sm truncate">
              {user ? `Bem-vindo(a) de volta, ${user.name}` : "Bem-vindo(a)"}
            </div>
          </div>
        </div>

        {/* Apenas o ícone de utilizador */}
        <button
          type="button"
          onClick={handleProfileClick}
          aria-label="Abrir perfil"
          title="Perfil"
          className="
            rounded-full focus:outline-none focus-visible:ring-2
            focus-visible:ring-blue-500/60 focus-visible:ring-offset-2
          "
        >
          <Avatar className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-200">
            <AvatarFallback className="bg-gray-200">
              <UserIcon className="w-4 h-4 text-gray-600" />
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
};
