import api from "./api";
import {
  SignUp,
  VerifyEmail,
  Login,
  ForgotPassword,
  ResetPassword,
  RefreshToken,
} from "@/types/auth";

// SIGNUP
export const signUpUser = async (data: SignUp) => {
  const res = await api.post("/auth/signup", data);
  return res.data;
};

// REFRESH TOKEN
export const refreshTokenUser = async (data: RefreshToken) => {
  const res = await api.post("/auth/refresh-token",data);
  return res.data;
};

// VERIFY EMAIL
export const verifyEmail = async (data: VerifyEmail) => {
  const res = await api.post("/auth/verify-email", data);
  return res.data;
};

// RESEND VERIFY EMAIL

export const resendVerifyEmail = async (email: string) => {
  const res = await api.post("/auth/resend-verification", { email });
  return res.data;
};
// LOGIN
export const loginUser = async (data: Login) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

// FORGOT PASSWORD
export const forgotPasswordUser = async (data: ForgotPassword) => {
  const res = await api.post("/auth/forgot-password", data);
  return res.data;
};

// RESET PASSWORD
export const resetPasswordUser = async (data: ResetPassword) => {
  const res = await api.post("/auth/reset-password", data);
  return res.data;
};

// RESEND RESET CODE
export const resendResetCode = async (data: ForgotPassword) => {
  const res = await api.post("/auth/resend-reset-code", data);
  return res.data;
};