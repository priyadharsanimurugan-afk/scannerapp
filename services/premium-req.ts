import api from "./api";

export interface PremiumRequestPayload {
  message: string;
  paymentReference: string;

}

export interface PremiumRequest {
  id: number;
  message: string;
  paymentReference: string;
  status?: string;
  createdAt?: string;
  adminRemark?: string;
  createdAtUtc?: string;
  reviewedAtUtc?: string;
}


// ✅ Create Premium Request
export const createPremiumRequest = async (
  payload: PremiumRequestPayload
): Promise<PremiumRequest> => {
  const res = await api.post("/premium-request", payload);
  return res.data;
};

// ✅ Get My Requests
export const getMyPremiumRequests = async (): Promise<PremiumRequest[]> => {
  const res = await api.get("/premium-request/my-requests");
  return res.data;
};
