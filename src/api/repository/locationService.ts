import API from "@/lib/axios";
import { useAuthStore } from "@/store/userStore";

const auth = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface LocationDTO {
  userId: number;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  timezone?: string | null;
  preferredContactMethod?: "Email" | "Phone" | "SMS" | null;
}

export const getLocation = async (id: number): Promise<LocationDTO | null> => {
  const res = await API.get(`/location/${id}/location`, auth());
  return res.data ?? null;
};

export const upsertLocation = async (id: number, payload: Partial<LocationDTO>): Promise<LocationDTO> => {
  const res = await API.patch(`/location/${id}/location`, payload, auth());
  return res.data as LocationDTO;
};
