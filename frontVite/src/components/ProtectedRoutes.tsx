import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/userStore";

interface ProtectedRouteProps {
  element: JSX.Element;
  allowedRoles: string[];
}

const ProtectedRoute = ({ element, allowedRoles }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    // Se não estiver logado, manda para login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Se não tiver a role necessária, manda para acesso negado ou login
    return <Navigate to="/login" replace />;
  }

  return element;
};

export default ProtectedRoute;
