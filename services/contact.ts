import api from "./api";
import { CreateContact, ContactDetail, PaginatedContacts } from "@/types/contact";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Buffer } from "buffer";

// Create a new contact
export const createContact = async (data: CreateContact): Promise<ContactDetail> => {
  const res = await api.post("/contacts", data);
  return res.data;
};

// Get a contact by ID
export const getContactById = async (id: string | number): Promise<ContactDetail> => {
  const res = await api.get(`/contacts/${id}`);
  return res.data;
};

// Get paginated contacts
export const getContacts = async (page: number = 1, pageSize: number = 20): Promise<PaginatedContacts> => {
  const res = await api.get(`/contacts?page=${page}&pageSize=${pageSize}`);
  return res.data;
};

// Update contact by ID — POST only
export const updateContact = async (id: string | number, data: CreateContact): Promise<ContactDetail> => {
  const res = await api.post(`/contacts/update/${id}`, data); // ✅ POST to update endpoint
  return res.data;
};

// Delete contact by ID — POST only
export const deleteContact = async (id: string | number): Promise<void> => {
  await api.post(`/contacts/delete/${id}`); // ✅ POST to delete endpoint
};

// Export contacts as Excel
export const exportContacts = async () => {
  try {
    const res = await api.get("/export/contacts.xlsx", {
      responseType: "arraybuffer",
    });

    const fileUri = FileSystem.documentDirectory + "contacts.xlsx";

    const base64Data = Buffer.from(res.data, "binary").toString("base64");

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
  } catch (error) {
    console.error(error);
    throw new Error("Export failed");
  }
};
