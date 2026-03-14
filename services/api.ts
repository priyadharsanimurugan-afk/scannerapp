import axios from "axios";
import { getAccessToken, getRefreshToken, saveTokens } from "@/utils/tokenStorage";
import { refreshTokenUser } from "./auth";

export const API_BASE_URL = "https://bs.lemeniz.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

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


// REQUEST INTERCEPTOR
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  async (error) => {

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {

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

        const res = await refreshTokenUser({
          refreshToken: refreshToken!,
        });

        const newAccessToken = res.accessToken;
        const newRefreshToken = res.refreshToken;

        await saveTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);

      } catch (err) {

        processQueue(err, null);
        console.log("Refresh token expired");

      } finally {

        isRefreshing = false;

      }

    }

    return Promise.reject(error);
  }
);

export default api;
