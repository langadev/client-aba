import { type JSX } from "react";
import { Routes, Route } from "react-router-dom";
import PsychologistRoutes from "./routes/PsychologistRoutes";
import LoginPage from "./screens/auth/login";
import AdminRoutes from "./routes/AdminRoutes";
import ParentRoutes from "./routes/ParentRoutes";
import ProtectedRoute from "./components/ProtectedRoutes";

const App = (): JSX.Element => {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute
            element={<AdminRoutes />}
            allowedRoles={["ADMIN"]}
          />
        }
      />

      {/* Psychologist */}
      <Route
        path="/psychologist/*"
        element={
          <ProtectedRoute
            element={<PsychologistRoutes />}
            allowedRoles={["PSICOLOGO"]}
          />
        }
      />

      {/* Parent */}
      <Route
        path="/parent/*"
        element={
          <ProtectedRoute
            element={<ParentRoutes />}
            allowedRoles={["PAI"]}
          />
        }
      />
    </Routes>
  );
};

export default App;
