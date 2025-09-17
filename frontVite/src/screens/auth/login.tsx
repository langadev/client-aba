import React, { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../service/authService";
import { useAuthStore } from "../../store/userStore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

// importa o logo
import Logo from "../../assets/Logo Preto Fundo transparente.png";

interface LoginForm {
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  token?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuthStore();

  const [formData, setFormData] = useState<LoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { user, token }: { user: User; token: string } = await loginUser(
        formData.email,
        formData.password
      );

      auth.setUser(user, token);

      toast.success("Login realizado com sucesso! Redirecionando...", {
        position: "top-right",
        autoClose: 2000,
      });

      setTimeout(() => {
        switch (user.role) {
          case "ADMIN":
            navigate("/admin");
            break;
          case "PAI":
            navigate("/parent");
            break;
          case "PSICOLOGO":
            navigate("/psychologist");
            break;
          default:
            navigate("/");
        }
      }, 2000);
    } catch (err: any) {
      console.error("Erro no login:", err);

      let errorMessage = "Erro ao fazer login. Tente novamente.";

      if (err.response?.status === 401) {
        errorMessage = "E-mail ou senha incorretos.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="w-full max-w-md">
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              {/* Logo no lugar do título */}
              <img
                src={Logo}
                alt="ABA Clinic Logo"
                className="mx-auto h-20 object-contain"
              />
              <p className="text-gray-600 mt-2">
                Informe suas credenciais para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5 text-gray-500" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{" "}
                <a
                  href="/register"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Solicitar acesso
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
