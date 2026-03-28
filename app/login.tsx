// LoginScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { loginStyles } from "@/components/styles/loginStyles";
import { colors } from "../constants/colors";
import { useAuth } from "@/hooks/useLoginAuth";
import { AuthForms } from "@/components/authForm";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useMenuVisibility } from "@/context/MenuVisibilityContext";
import { Image } from "react-native";
import {
  getRememberedCredentials,
  saveRememberedCredentials,
  clearRememberedCredentials,
} from "@/utils/tokenStorage";
import { router } from "expo-router";

const LoginScreen = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const {
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
  } = useAuth();

  // Refs for input fields
  const userNameRef = useRef<TextInput>(null);
  const loginPassRef = useRef<TextInput>(null);
  const signupUserNameRef = useRef<TextInput>(null);
  const signupPhoneRef = useRef<TextInput>(null);
  const signupEmailRef = useRef<TextInput>(null);
  const signupPassRef = useRef<TextInput>(null);
  const confirmPassRef = useRef<TextInput>(null);
  const forgotEmailRef = useRef<TextInput>(null);

  const { setMenuVisible } = useMenuVisibility();
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const handleTabSwitch = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setFieldErrors({}); // Clear all errors when switching tabs
    setShowForgot(false); // Also close forgot password if open
  };
  // Focus on first error field when errors occur
  useEffect(() => {
    const errorFields = Object.keys(fieldErrors);
    if (errorFields.length === 0) return;

    // Focus on the first error field
    const focusTimeout = setTimeout(() => {
      const firstErrorField = errorFields[0].toLowerCase();
      
      switch (firstErrorField) {
        case 'username':
          if (activeTab === 'login') {
            userNameRef.current?.focus();
          } else if (activeTab === 'signup') {
            signupUserNameRef.current?.focus();
          }
          break;
        case 'password':
          if (activeTab === 'login') {
            loginPassRef.current?.focus();
          } else if (activeTab === 'signup') {
            signupPassRef.current?.focus();
          }
          break;
        case 'email':
          if (activeTab === 'signup') {
            signupEmailRef.current?.focus();
          } else if (showForgot) {
            forgotEmailRef.current?.focus();
          }
          break;
        case 'phonenumber':
          if (activeTab === 'signup') {
            signupPhoneRef.current?.focus();
          }
          break;
        case 'confirmpassword':
          if (activeTab === 'signup') {
            confirmPassRef.current?.focus();
          }
          break;
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [fieldErrors, activeTab, showForgot]);

  useEffect(() => {
    const loadRememberedCredentials = async () => {
      const { userName: rememberedUserName, password } = await getRememberedCredentials();

      if (rememberedUserName && password && activeTab === "login") {
        setUserName(rememberedUserName);
        setLoginPass(password);
        setRemember(true);
      }
      setIsLoadingCredentials(false);
    };

    loadRememberedCredentials();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "signup") {
      setUserName("");
    }
  }, [activeTab]);

  useEffect(() => {
    setMenuVisible(false);
    return () => { setMenuVisible(true); };
  }, [setMenuVisible]);

  const handleRememberMe = async (checked: boolean) => {
    setRemember(checked);
    if (!checked) {
      await clearRememberedCredentials();
    } else {
      if (userName && loginPass) {
        await saveRememberedCredentials(userName, loginPass);
      }
    }
  };

  const handleLoginWithRemember = async () => {
    try {
      await handleLogin();
      if (remember && userName && loginPass) {
        await saveRememberedCredentials(userName, loginPass);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleFieldChange = (field: string) => {
    clearFieldError(field);
  };

  const authFormProps = {
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
    activeTab,
    showForgot,
    remember,
    setRemember: handleRememberMe,
    loading,
   setActiveTab: handleTabSwitch,
    setShowForgot,
    handleLogin: handleLoginWithRemember,
    handleSignup,
    handleForgot,

    checkStrength,
    fieldErrors,
    clearFieldError: handleFieldChange,
    userNameRef,
    loginPassRef,
    signupUserNameRef,
    signupPhoneRef,
    signupEmailRef,
    signupPassRef,
    confirmPassRef,
    forgotEmailRef,
    handleFieldChange,
  };

  // Rest of render methods remain the same...
  const renderHero = (hideTabsAndSub = false) => (
    <View style={[loginStyles.hero, isDesktop && { flex: 1 }, !isTablet && !isDesktop && { marginTop: 10 }]}>
      <View style={loginStyles.heroGlow} />
      <View style={loginStyles.brand}>
        <View>
          <Image
            source={require("@/assets/images/scannerlogo.png")}
            style={[
              { width: isDesktop ? 60 : 50, height: isDesktop ? 60 : 50, resizeMode: "contain", marginRight: 20, marginTop: 20 },
              isDesktop && { marginTop: 120, marginRight: 20 },
            ]}
          />
        </View>
        <View>
          <Text style={[loginStyles.brandName, isDesktop && { marginTop: 120 }]}>CardScan Pro</Text>
          <Text style={loginStyles.brandTag}>Smart Business Card Scanner</Text>
        </View>
      </View>

      <Text style={loginStyles.heroTitle}>
        Your contacts,{"\n"}
        <Text style={loginStyles.heroSpan}>always with you.</Text>
      </Text>

      {!hideTabsAndSub && (
        <Text style={loginStyles.heroSub}>Sign in to access your scanned cards & network</Text>
      )}

      {isDesktop && (
        <>
          <Text style={loginStyles.heroSub}>Sign in to access your scanned cards & network</Text>
          <View style={{ marginTop: 40, gap: 16 }}>
            {[
              { icon: "scan-outline", text: "Instantly scan business cards" },
              { icon: "people-outline", text: "Manage your entire network" },
              { icon: "cloud-upload-outline", text: "Sync across all your devices" },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,159,10,0.15)", justifyContent: "center", alignItems: "center" }}>
                  <Icon name={item.icon} size={18} color={colors.amber} />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" }}>{item.text}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!isDesktop && (
        <View style={loginStyles.tabs}>
          <TouchableOpacity style={[loginStyles.tab, activeTab === "login" && loginStyles.activeTab]} onPress={() => handleTabSwitch("login")}>
            <Text style={[loginStyles.tabText, activeTab === "login" && loginStyles.activeTabText]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[loginStyles.tab, activeTab === "signup" && loginStyles.activeTab]} onPress={() => handleTabSwitch("signup")}>
            <Text style={[loginStyles.tabText, activeTab === "signup" && loginStyles.activeTabText]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBottomInfo = () => (
    <View style={loginStyles.bottomInfo}>
      <Text style={loginStyles.bottomText}>
        By continuing, you agree to our{" "}
        <Text style={loginStyles.bottomLink} onPress={() => router.push("/privacy-policy")}>
          Privacy Policy
        </Text>.
      </Text>
    </View>
  );

  // Desktop view
  if (isDesktop) {
    return (
      <SafeAreaView style={[loginStyles.container, { flexDirection: "row" }]} edges={["bottom"]}>
        <View style={loginStyles.leftPanel}>{renderHero(true)}</View>
        <View style={loginStyles.rightPanel}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={[loginStyles.tabs, { marginBottom: 24, backgroundColor: "rgba(15,23,42,0.07)" }]}>
              <TouchableOpacity style={[loginStyles.tab, activeTab === "login" && loginStyles.activeTab]} onPress={() => handleTabSwitch("login")}>
                <Text style={[loginStyles.tabText, { color: activeTab === "login" ? undefined : colors.muted }, activeTab === "login" && loginStyles.activeTabText]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[loginStyles.tab, activeTab === "signup" && loginStyles.activeTab]} onPress={() => handleTabSwitch("signup")}>
                <Text style={[loginStyles.tabText, { color: activeTab === "signup" ? undefined : colors.muted }, activeTab === "signup" && loginStyles.activeTabText]}>Create Account</Text>
              </TouchableOpacity>
            </View>
            <AuthForms {...authFormProps} />
            {renderBottomInfo()}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Tablet view
  if (isTablet) {
    return (
      <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
        <KeyboardAwareScrollView style={loginStyles.scrollView} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20} extraHeight={120}>
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 680 }}>
            {renderHero()}
            <AuthForms {...authFormProps} />
            {renderBottomInfo()}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // Mobile view
  return (
    <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
      <KeyboardAwareScrollView style={loginStyles.scrollView} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20} extraHeight={120}>
        {renderHero()}
        <AuthForms {...authFormProps} />
        {renderBottomInfo()}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;