import { Contact, getAllContacts } from "@/services/users";
import { useState, useEffect } from "react";


export const useAdminContacts = (
  userId: number,
  initialPage: number = 1,
  initialPageSize: number = 5
) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal]       = useState(0);

  /* =========================
     FETCH CONTACTS
  ========================= */
  const fetchContacts = async (
    currentPage: number = page,
    append: boolean = false
  ) => {
    try {
      setLoading(true);
      setError(null);

      const res: any = await getAllContacts(userId, currentPage, pageSize);

      // ⚠️ Adjust based on your API response
      const items = res?.items || res?.data || res;

      setContacts((prev) => (append ? [...prev, ...items] : items));

      setPage(res?.page || currentPage);
      setPageSize(res?.pageSize || pageSize);
      setTotal(res?.total || items.length);

    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch admin contacts");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOAD MORE (Pagination)
  ========================= */
  const loadMore = () => {
    if (contacts.length < total && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchContacts(nextPage, true);
    }
  };

  /* =========================
     INITIAL LOAD
  ========================= */
  useEffect(() => {
    if (userId) {
      fetchContacts(initialPage, false);
    }
  }, [userId]); // refetch when userId changes

  return {
    contacts,
    total,
    page,
    pageSize,
    loading,
    error,
    fetchContacts,
    loadMore,
    setPage,
    setPageSize,
  };
};