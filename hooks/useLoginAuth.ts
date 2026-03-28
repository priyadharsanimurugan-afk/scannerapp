// useLoginAuth.ts (updated hook)
import { router } from 'expo-router';
import { useState } from 'react';

import {
  loginUser,
  signUpUser,
  forgotPasswordUser
} from "@/services/auth";
import { saveTokens } from '@/utils/tokenStorage';

interface AuthState {
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPass: string;
  setLoginPass: (pass: string) => void;
  showLoginPass: boolean;
  setShowLoginPass: (show: boolean) => void;
  userName: string;
  setUserName: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  signupEmail: string;
  setSignupEmail: (email: string) => void;
  signupPass: string;
  setSignupPass: (pass: string) => void;
  confirmPass: string;
  setConfirmPass: (pass: string) => void;
  showSignupPass: boolean;
  setShowSignupPass: (show: boolean) => void;
  showConfirmPass: boolean;
  setShowConfirmPass: (show: boolean) => void;
  passStrength: number;
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  activeTab: 'login' | 'signup';
  setActiveTab: (tab: 'login' | 'signup') => void;
  showForgot: boolean;
  setShowForgot: (show: boolean) => void;
  remember: boolean;
  setRemember: (remember: boolean) => void;
  loading: { login: boolean; signup: boolean };
  fieldErrors: Record<string, string[]>;
  handleLogin: () => Promise<void>;
  handleSignup: () => Promise<void>;
  handleForgot: () => Promise<void>;
  checkStrength: (val: string) => void;
  clearFieldError: (field: string) => void;
  setFieldErrors: (errors: Record<string, string[]>) => void;
}

const extractErrorsWithField = (error: any): Record<string, string[]> => {
  const data = error?.response?.data;
  const errorsMap: Record<string, string[]> = {};

  if (!data) {
    errorsMap['general'] = [error?.message || "Something went wrong"];
    return errorsMap;
  }

  if (data.errors) {
    for (const [key, value] of Object.entries(data.errors)) {
      if (Array.isArray(value)) {
        errorsMap[key] = value as string[];
      } else if (typeof value === 'string') {
        errorsMap[key] = [value];
      }
    }
  }

  return errorsMap;
};

export const useAuth = (): AuthState => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgot, setShowForgot] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState({ login: false, signup: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  const [forgotEmail, setForgotEmail] = useState('');

  const clearFieldError = (field: string): void => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleLogin = async (): Promise<void> => {
    try {
      setLoading((prev) => ({ ...prev, login: true }));
      setFieldErrors({});

      const res = await loginUser({ userName, password: loginPass });

      if (!res?.accessToken) throw new Error("Token not received");

      await saveTokens(res.accessToken, res.refreshToken, res.roles);

      router.replace("/dashboard");

    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  const handleSignup = async (): Promise<void> => {
    try {
      setLoading((prev) => ({ ...prev, signup: true }));
      setFieldErrors({});

      await signUpUser({
        email: signupEmail,
        userName,
        phoneNumber,
        password: signupPass,
      });

      router.replace({
        pathname: "/verify-email",
        params: { email: signupEmail },
      });

    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };

  const handleForgot = async (): Promise<void> => {
    try {
      setFieldErrors({});

      await forgotPasswordUser({ email: forgotEmail });

      router.replace({
        pathname: "/reset-password",
        params: { email: forgotEmail },
      });

    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
    }
  };

  const checkStrength = (val: string): void => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    setPassStrength(score);
  };

  return {
    loginEmail, setLoginEmail,
    loginPass, setLoginPass,
    showLoginPass, setShowLoginPass,
    userName, setUserName,
    phoneNumber, setPhoneNumber,
    signupEmail, setSignupEmail,
    signupPass, setSignupPass,
    confirmPass, setConfirmPass,
    showSignupPass, setShowSignupPass,
    showConfirmPass, setShowConfirmPass,
    passStrength,
    forgotEmail, setForgotEmail,
    activeTab, setActiveTab,
    showForgot, setShowForgot,
    remember, setRemember,
    loading,
    fieldErrors,
    handleLogin,
    handleSignup,
    handleForgot,
    checkStrength,
    clearFieldError,
    setFieldErrors,
  };
};