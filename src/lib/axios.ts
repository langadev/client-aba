import axios from "axios";

// Create an Axios instance with a base URL and default headers
const API = axios.create({
  baseURL: "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000, // opcional
});

export const loginUser = async (email: string, password: string) => {
  const response = await API.post("/auth/login", { email, password });
  localStorage.setItem("token", response.data.token);
  return response.data.user;
};

export default API;