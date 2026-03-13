import { useState, useEffect } from "react";
import {
  createContact,
  getContactById,
  getContacts,
  updateContact,
  deleteContact,
} from "@/services/contact";
import { CreateContact, ContactDetail, PaginatedContacts } from "@/types/contact";

export const useContact = (initialPage: number = 1, initialPageSize: number = 20) => {
  const [contacts, setContacts] = useState<ContactDetail[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal]       = useState(0);

  // Create a new contact
  const addContact = async (data: CreateContact): Promise<ContactDetail> => {
    try {
      setLoading(true);
      setError(null);
      const res = await createContact(data);
      return res;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create contact");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch single contact by ID
  const fetchContact = async (id: string | number): Promise<ContactDetail> => {
    try {
      setLoading(true);
      setError(null);
      const res = await getContactById(id);
      return res;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch contact");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: accepts append flag — true for loadMore, false (default) for refresh/initial
  const fetchContacts = async (currentPage: number = page, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data: PaginatedContacts = await getContacts(currentPage, pageSize);
      setContacts((prev) => append ? [...prev, ...data.items] : data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  // Update contact by ID
  const editContact = async (id: string | number, data: CreateContact): Promise<ContactDetail> => {
    try {
      setLoading(true);
      setError(null);
      const res = await updateContact(id, data);
      setContacts((prev) => prev.map((c) => (c.id === id ? res : c)));
      return res;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update contact");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete contact by ID
  const removeContact = async (id: string | number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete contact");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: appends next page instead of replacing
  const loadMore = () => {
    if (contacts.length < total && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchContacts(nextPage, true); // append=true
    }
  };

  // Auto-fetch on mount only (page/pageSize changes handled manually via loadMore)
  useEffect(() => {
    fetchContacts(initialPage, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    contacts,
    total,
    page,
    pageSize,
    loading,
    error,
    addContact,
    fetchContact,
    fetchContacts,
    editContact,
    removeContact,
    loadMore,
    setPage,
    setPageSize,
  };
};