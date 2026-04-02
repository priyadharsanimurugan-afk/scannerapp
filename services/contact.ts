import api from "./api";
import { CreateContact, ContactDetail, PaginatedContacts } from "@/types/contact";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';


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

    const base64Data = Buffer.from(res.data, "binary").toString("base64");

    if (Platform.OS === 'android') {
      // Write directly to Downloads folder on Android
      const downloadDir = FileSystem.StorageAccessFramework;
      const permissions = await downloadDir.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        // Fallback: save to app's document directory
        const fileUri = FileSystem.documentDirectory + "contacts.xlsx";
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert('Saved', `File saved to app storage: contacts.xlsx`);
        return;
      }

      const fileUri = await downloadDir.createFileAsync(
        permissions.directoryUri,
        "contacts.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      await downloadDir.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert('Success', 'contacts.xlsx saved to your selected folder');

    } else {
      // iOS — save to documents directory and share
      const fileUri = FileSystem.documentDirectory + "contacts.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Save contacts.xlsx',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }

  } catch (error) {
    console.error(error);
    throw new Error("Export failed");
  }
};


export const exportContactsWeb = async () => {
  try {
    const res = await api.get("/export/contacts.xlsx", {
      responseType: "blob", // 👈 important for web
    });

    // Create blob link
    const url = window.URL.createObjectURL(new Blob([res.data]));

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "contacts.xlsx"); // file name

    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error(error);
    throw new Error("Export failed");
  }
};

