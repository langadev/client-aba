// src/service/categoryService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

// 🔑 Recupera token
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// 🔎 Tipagem
export interface Category {
  id: number;
  name: string;
  description?: string;
}

// READ - todas as categorias
export const getCategories = async (): Promise<Category[]> => {
  const response = await API.get("/categories", getAuthHeaders());
  return response.data;
};

// READ - por id
export const getCategoryById = async (id: number | string): Promise<Category> => {
  const response = await API.get(`/categories/${id}`, getAuthHeaders());
  return response.data;
};

// CREATE - nova categoria
export const createCategory = async (data: Omit<Category, "id">): Promise<Category> => {
  const response = await API.post("/categories", data, getAuthHeaders());
  return response.data;
};

// UPDATE - atualizar categoria
export const updateCategory = async (
  id: number | string,
  data: Partial<Omit<Category, "id">>
): Promise<Category> => {
  const response = await API.put(`/categories/${id}`, data, getAuthHeaders());
  return response.data;
};

// DELETE - remover categoria
export const deleteCategory = async (id: number | string) => {
  const response = await API.delete(`/categories/${id}`, getAuthHeaders());
  return response.data;
};