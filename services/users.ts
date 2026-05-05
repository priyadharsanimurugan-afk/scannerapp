import { AllUser, PremiumRequest } from "@/types/users";
import api from "./api";

// Get all users
export const getAllUsers = async (): Promise<AllUser[]> => {
  const res = await api.get("/admin/users");
  return res.data;
};

// Upgrade user to Premium
export const upgradeUser = async (userId: string) => {
  const res = await api.post(`/admin/upgrade/${userId}`);
  return res.data;
};

// Downgrade user to Free
export const downgradeUser = async (userId: string) => {
  const res = await api.post(`/admin/downgrade/${userId}`);
  return res.data;
};

/* =========================
   GET: All Premium Requests
========================= */
export const getAllPremiumRequests = async (): Promise<PremiumRequest[]> => {
  const res = await api.get("/admin/premium-requests");
  return res.data;
};

/* =========================
   GET: Single Request Detail
========================= */
export const getPremiumRequestById = async (
  id: number
): Promise<PremiumRequest> => {
  const res = await api.get(`/admin/premium-requests/${id}`);
  return res.data;
};

/* =========================
   POST: Review Request (Approve / Reject)
========================= */
export const reviewPremiumRequest = async (
  id: number,
  payload: {
    approve: boolean;
    adminRemark: string;
  }
) => {
  const res = await api.post(
    `/admin/premium-requests/review/${id}`,
    payload
  );
  return res.data;
};

export interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string;
}
/* =========================
   GET: All Contacts
========================= */
export const getAllContacts = async (
  userId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<Contact[]> => {
  const res = await api.get(
    `/admin/all-contact?userId=${userId}&page=${page}&pageSize=${pageSize}`
  );
  return res.data;
};