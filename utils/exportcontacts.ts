// services/exportContacts.ts
// Drop-in replacement for the exportContacts helper used in the dashboard.
// Avoids expo-file-system EncodingType / cacheDirectory issues by using
// expo-file-system's string-based writeAsStringAsync with the literal "base64"
// encoding string, and falls back gracefully on older expo-file-system versions.

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import api from "@/services/api";

/** Fetch the xlsx blob from the API */
export const exportContacts = async (): Promise<Blob> => {
  const res = await api.get("/export/contacts.xlsx", {
    responseType: "blob",
  });
  return res.data;
};

/**
 * Full export flow:
 *   1. Fetch xlsx blob from API
 *   2. Convert to base64 via FileReader
 *   3. Write to a temp file using expo-file-system
 *   4. Share via expo-sharing
 *
 * Call this directly from the dashboard instead of calling exportContacts() + manual steps.
 */
export const exportAndShareContacts = async (): Promise<void> => {
  // 1. Fetch blob
  const blob = await exportContacts();

  // 2. blob → base64 string (strips the "data:...;base64," prefix)
  const base64 = await blobToBase64(blob);

  // 3. Write to cache dir
  //    Use string literals to avoid FileSystem.EncodingType / cacheDirectory TS errors
  //    on some expo-file-system versions.
  const cacheDir: string =
    (FileSystem as any).cacheDirectory ??           // expo-file-system >= 16
    (FileSystem as any).documentDirectory ??        // fallback
    "";

  if (!cacheDir) {
    throw new Error("expo-file-system: could not resolve a writable directory.");
  }

  const fileUri = `${cacheDir}contacts_export.xlsx`;

  // writeAsStringAsync accepts the literal string "base64" even when EncodingType
  // enum is not exposed, so we cast to avoid the TS error.
  await (FileSystem as any).writeAsStringAsync(fileUri, base64, {
    encoding: "base64",
  });

  // 4. Share
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Contacts",
      UTI: "com.microsoft.excel.xlsx",   // iOS hint — ignored on Android
    });
  } else {
    Alert.alert("Exported", `File saved to:\n${fileUri}`);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result looks like "data:application/...;base64,AAAA..."
      const base64 = result.split(",")[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error("FileReader produced an unexpected result format."));
      }
    };
    reader.onerror = () => reject(new Error("FileReader failed to read blob."));
    reader.readAsDataURL(blob);
  });
}