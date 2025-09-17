// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/userStore";

export default function Page() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login"); // não logado
      return;
    }

    switch (user?.role) {
      case "PSICOLOGO":
        router.replace("/therapist");
        break;
      case "ADMIN":
        router.replace("/admin");
        break;
      case "PAI":
        router.replace("/parent");
        break;
      default:
        router.replace("/auth");
    }
  }, [user, token, isAuthenticated, router]);

  return <div>Carregando...</div>;
}
