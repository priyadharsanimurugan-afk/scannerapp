import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";

export const saveTokens = async (accessToken: string, refreshToken: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_TOKEN, accessToken);
    localStorage.setItem(REFRESH_TOKEN, refreshToken);
  } else {
    await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken);
  }
};

export const getAccessToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem(ACCESS_TOKEN);
  } else {
    return await SecureStore.getItemAsync(ACCESS_TOKEN);
  }
};

export const getRefreshToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem(REFRESH_TOKEN);
  } else {
    return await SecureStore.getItemAsync(REFRESH_TOKEN);
  }
};

export const deleteTokens = async () => {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
  } else {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN);
  }
};
