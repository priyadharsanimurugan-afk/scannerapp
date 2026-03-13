import { useEffect, useState } from "react";
import { getDashboardSummary, getRecentContacts } from "@/services/dashboard";
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
