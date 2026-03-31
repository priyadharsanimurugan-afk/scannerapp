import { createPremiumRequest, getMyPremiumRequests, PremiumRequest, PremiumRequestPayload } from "@/services/premium-req";
import { useEffect, useState } from "react";


export const usePremiumRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async (payload: PremiumRequestPayload) => {
    try {
      setLoading(true);
      setError(null);

      const res = await createPremiumRequest(payload);
      return res;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit request");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    submitRequest,
  };
};


export const useMyPremiumRequests = () => {
  const [data, setData] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getMyPremiumRequests();
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    data,
    loading,
    error,
    fetchRequests,
  };
};
