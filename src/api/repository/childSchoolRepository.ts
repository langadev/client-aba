// src/service/childSchoolService.ts
import API from "../axiosClient";
import { useAuthStore } from "../../store/userStore";

const auth = () => {
  const token = useAuthStore.getState().token || localStorage.getItem("token");
  if (!token) throw new Error("Usuário não autenticado");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface ChildSchoolDTO {
  childId: number;
  schoolName?: string | null;
  grade?: string | null;
  yearLabel?: string | null;
  teacherName?: string | null;
  transportPlan?: boolean;
  independencePlan?: boolean;
  iepActive?: boolean;
  iepNotes?: string | null;
  accommodations?: { title: string; note?: string }[] | null; // JSON
  therapistId?: number | null; // opcional, exibido se existir
  createdAt?: string;
  updatedAt?: string;
}

export const getChildSchool = async (childId: number): Promise<ChildSchoolDTO | null> => {
  const res = await API.get(`/childrenSchool/${childId}/school`, auth());
  return res.data ?? null;
};

export const upsertChildSchool = async (
  childId: number,
  payload: Partial<ChildSchoolDTO>
): Promise<ChildSchoolDTO> => {
  const res = await API.patch(`/childrenSchool/${childId}/school`, payload, auth());
  return res.data as ChildSchoolDTO;
};
