import API from "../axiosClient";

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await API.post("/auth/login", { email, password });
    
    const { token, user } = response.data;

    localStorage.setItem("token", token); // salva JWT localmente
    return { user, token }; // retorna token também
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new Error(err.response?.data?.error || "Erro ao fazer login");
  }
};
