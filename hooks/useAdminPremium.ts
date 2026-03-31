import { getAllPremiumRequests, getPremiumRequestById, reviewPremiumRequest } from "@/services/users";
import { PremiumRequest } from "@/types/users";
import { useEffect, useState } from "react";


export const useAdminPremiumRequests = () => {
  const [data, setData] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllPremiumRequests();
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


export const usePremiumRequestDetail = (id: number) => {
  const [data, setData] = useState<PremiumRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getPremiumRequestById(id);
      setData(res);
    } catch (err) {
      console.log("Failed to fetch detail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  return { data, loading, fetchDetail };
};


export const useReviewPremiumRequest = () => {
  const [loading, setLoading] = useState(false);

  const review = async (
    id: number,
    approve: boolean,
    adminRemark: string
  ) => {
    try {
      setLoading(true);

      const res = await reviewPremiumRequest(id, {
        approve,
        adminRemark,
      });

      return res;
    } catch (err) {
      console.log("Review failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { review, loading };
};
