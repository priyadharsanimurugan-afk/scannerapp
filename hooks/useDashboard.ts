import { useEffect, useState } from "react";
import { generatePaymentUrl, getDashboardSummary, getRecentContacts } from "@/services/dashboard";
import { GetSummary, RecentContact } from "@/types/dashboard";

export const useDashboard = () => {
  const [summary, setSummary] = useState<GetSummary | null>(null);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary and recent contacts in parallel
      const [summaryData, recentContactsData] = await Promise.all([
        getDashboardSummary(),
        getRecentContacts(10),
      ]);

      setSummary(summaryData);
      setRecentContacts(recentContactsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    summary,
    recentContacts,
    loading,
    error,
    fetchDashboard,
  };
};
export const usePaymentUrl = () => {
  const [paymentUrl, setPaymentUrl] = useState<string | any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = await generatePaymentUrl();
      setPaymentUrl(url);

      return url; // useful if you want to open immediately
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to generate payment URL");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    paymentUrl,
    loading,
    error,
    fetchPaymentUrl,
  };
};