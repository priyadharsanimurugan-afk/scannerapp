import axios from "axios";
import {
  deleteTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/utils/tokenStorage";
import { refreshTokenUser } from "./auth";
import { triggerLogout } from "@/utils/logout";

export const API_BASE_URL = "https://bsapi.lemeniz.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

// ✅ Process queued requests
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// ✅ REQUEST INTERCEPTOR
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    console.log("Interceptor hit:", error?.response?.status);

    // ❌ If no response → network error
    if (!error.response) {
      return Promise.reject(error);
    }

    // ✅ If 401 and already retried → logout directly
    if (error.response.status === 401 || originalRequest._retry) {
      console.log("Already retried → force logout");

      await deleteTokens();
      await triggerLogout();

      return Promise.reject(error);
    }

    // ✅ Handle first 401
    if (error.response.status === 401 && !originalRequest._retry) {
      // 🔁 If refresh already happening → queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();

        // ❌ No refresh token → logout
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const res = await refreshTokenUser({
          refreshToken,
        });

        console.log("Refresh API response:", res);

        // ❌ Invalid response (very important fix)
        if (!res?.accessToken) {
          throw new Error("Invalid refresh response");
        }

        const newAccessToken = res.accessToken;
        const newRefreshToken = res.refreshToken;
        const roles = res.roles;

        // ✅ Save new tokens
        await saveTokens(newAccessToken, newRefreshToken, roles);

        // ✅ Resolve queued requests
        processQueue(null, newAccessToken);

        // ✅ Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (err: any) {
        console.log("Refresh failed:", err?.response?.status);

        processQueue(err, null);

        // ✅ FORCE LOGOUT
        await deleteTokens();
        await triggerLogout();

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
