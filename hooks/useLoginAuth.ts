import { router } from 'expo-router';
import { useState } from 'react';

import {
  loginUser,
  signUpUser,
  forgotPasswordUser
} from "@/services/auth";
import { saveTokens } from '@/utils/tokenStorage';



interface AuthState {
  
  // Login
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPass: string;
  setLoginPass: (pass: string) => void;
  showLoginPass: boolean;
  setShowLoginPass: (show: boolean) => void;
  
  // Signup - UPDATED
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
  
  // Forgot
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  
  // UI
  activeTab: 'login' | 'signup';
  setActiveTab: (tab: 'login' | 'signup') => void;
  showForgot: boolean;
  setShowForgot: (show: boolean) => void;
  remember: boolean;
  setRemember: (remember: boolean) => void;
  loading: { login: boolean; signup: boolean };
  toast: { show: boolean; msg: string; type: 'success' | 'error' | 'info' };
  
  // Functions
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  handleLogin: () => void;
  handleSignup: () => void;
  handleForgot: () => void;
  checkStrength: (val: string) => void;
}

type ToastType = 'success' | 'error' | 'info';

export const useAuth = (): AuthState => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgot, setShowForgot] = useState(false);
  const [remember, setRemember] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    type: ToastType;
  }>({
    show: false,
    msg: '',
    type: 'info',
  });
  const [loading, setLoading] = useState({ login: false, signup: false });

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup form - UPDATED
  const [userName, setUserName] = useState('');           // Changed from firstName
  const [phoneNumber, setPhoneNumber] = useState('');     // Changed from lastName
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  // Forgot form
  const [forgotEmail, setForgotEmail] = useState('');

  const validateEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const showToast = (msg: string, type: ToastType = 'info'): void => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'info' }), 2800);
  };

const handleLogin = async (): Promise<void> => {
  if (!validateEmail(loginEmail)) {
    showToast("Please enter a valid email", "error");
    return;
  }

  if (!loginPass) {
    showToast("Password is required", "error");
    return;
  }

  try {
    setLoading((prev) => ({ ...prev, login: true }));

    const res = await loginUser({
      email: loginEmail,
      password: loginPass,
    });

    if (!res?.accessToken) {
      throw new Error("Token not received");
    }

    // ✅ Save BOTH tokens
    await saveTokens(res.accessToken, res.refreshToken);

    console.log("Access Token:", res.accessToken);
    console.log("Refresh Token:", res.refreshToken);

    showToast("Login successful!", "success");

    router.replace("/dashboard");

  } catch (error: any) {
    showToast(
      error?.response?.data?.message || error.message || "Login failed",
      "error"
    );
  } finally {
    setLoading((prev) => ({ ...prev, login: false }));
  }
};



const handleSignup = async (): Promise<void> => {
  if (!userName) {
    showToast("User name is required", "error");
    return;
  }

  if (!phoneNumber) {
    showToast("Phone number is required", "error");
    return;
  }

  if (!validateEmail(signupEmail)) {
    showToast("Valid email is required", "error");
    return;
  }

  if (signupPass !== confirmPass) {
    showToast("Passwords do not match", "error");
    return;
  }

  try {
    setLoading((prev) => ({ ...prev, signup: true }));

    await signUpUser({
      email: signupEmail,
      userName,
      phoneNumber,
      password: signupPass,
    });

    showToast("Verification code sent to your email 📧", "success");

    // Navigate to verify screen
    router.push({
      pathname: "/verify-email",
      params: { email: signupEmail },
    });

  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Signup failed",
      "error"
    );
  } finally {
    setLoading((prev) => ({ ...prev, signup: false }));
  }
};



const handleForgot = async (): Promise<void> => {
  if (!validateEmail(forgotEmail)) {
    showToast("Enter a valid email", "error");
    return;
  }

  try {
    await forgotPasswordUser({
      email: forgotEmail,
    });

    showToast("Reset email sent 📧", "success");

    setTimeout(() => setShowForgot(false), 1000);

  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Something went wrong",
      "error"
    );
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
    // Login
    loginEmail, 
    setLoginEmail,
    loginPass, 
    setLoginPass,
    showLoginPass, 
    setShowLoginPass,
    
    // Signup - UPDATED
    userName, 
    setUserName,
    phoneNumber, 
    setPhoneNumber,
    signupEmail, 
    setSignupEmail,
    signupPass, 
    setSignupPass,
    confirmPass, 
    setConfirmPass,
    showSignupPass, 
    setShowSignupPass,
    showConfirmPass, 
    setShowConfirmPass,
    passStrength,
    
    // Forgot
    forgotEmail, 
    setForgotEmail,
    
    // UI
    activeTab, 
    setActiveTab,
    showForgot, 
    setShowForgot,
    remember, 
    setRemember,
    loading,
    toast,
    
    // Functions
    showToast,
    handleLogin,
    handleSignup,
    handleForgot,
    checkStrength,
  };
};