import api from "./api";
import { GetSummary, RecentContact } from "@/types/dashboard";

// Get dashboard summary
export const getDashboardSummary = async (): Promise<GetSummary> => {
  const res = await api.get("/dashboard/summary");
  return res.data;
};

// Get recent contacts (default 10)
export const getRecentContacts = async (take: number = 10): Promise<RecentContact[]> => {
  const res = await api.get(`/dashboard/recent-contacts?take=${take}`);
  return res.data;
};
