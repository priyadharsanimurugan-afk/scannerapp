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

  // ─── Tab Switch ───────────────────────────────────────────────────────────
  const handleTabSwitch = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setFieldErrors({});
    setShowForgot(false);
  };

  // ─── Focus username on validation errors (always default to top field) ────
  useEffect(() => {
    const errorFields = Object.keys(fieldErrors);
    if (errorFields.length === 0) return;

    const focusTimeout = setTimeout(() => {
      if (showForgot) {
        forgotEmailRef.current?.focus();
        return;
      }
      if (activeTab === "login") {
        userNameRef.current?.focus();
      } else {
        signupUserNameRef.current?.focus();
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [fieldErrors, activeTab, showForgot]);

  // ─── Load remembered credentials once on mount ───────────────────────────
  useEffect(() => {
    const loadRememberedCredentials = async () => {
      try {
        const { userName: rememberedUserName, password } =
          await getRememberedCredentials();
        if (rememberedUserName && password) {
          setUserName(rememberedUserName);
          setLoginPass(password);
          setRemember(true);
        }
      } catch (error) {
        console.error("Failed to load remembered credentials:", error);
      } finally {
        setIsLoadingCredentials(false);
      }
    };
    loadRememberedCredentials();
  }, []); // runs only once on mount — prevents login username restoring on tab switch

  // ─── Clear shared userName state when switching to signup ─────────────────
  useEffect(() => {
    if (activeTab === "signup") {
      setUserName("");
      setPhoneNumber("");
      setSignupEmail("");
      setSignupPass("");
      setConfirmPass("");
    } else if (activeTab === "login") {
      // When switching back to login, restore remembered credentials if any,
      // otherwise clear so signup's typed username doesn't bleed through
      const restoreOrClear = async () => {
        try {
          const { userName: rememberedUserName, password } =
            await getRememberedCredentials();
          if (rememberedUserName && password) {
            setUserName(rememberedUserName);
            setLoginPass(password);
            setRemember(true);
          } else {
            setUserName("");
            setLoginPass("");
          }
        } catch {
          setUserName("");
          setLoginPass("");
        }
      };
      restoreOrClear();
    }
  }, [activeTab]);

  // ─── Hide bottom menu on this screen ─────────────────────────────────────
  useEffect(() => {
    setMenuVisible(false);
    return () => {
      setMenuVisible(true);
    };
  }, [setMenuVisible]);

  // ─── Remember Me handler ──────────────────────────────────────────────────
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

  // ─── Login with remember me ───────────────────────────────────────────────
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

  // ─── Field change clears its error ───────────────────────────────────────
  const handleFieldChange = (field: string) => {
    clearFieldError(field);
  };

  // ─── Auth form props ──────────────────────────────────────────────────────
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

  // ─── Hero section ─────────────────────────────────────────────────────────
  const renderHero = (hideTabsAndSub = false) => (
    <View
      style={[
        loginStyles.hero,
        isDesktop && { flex: 1 },
        !isTablet && !isDesktop && { marginTop: 10 },
      ]}
    >
      <View style={loginStyles.heroGlow} />
      <View style={loginStyles.brand}>
        <View>
          <Image
            source={require("@/assets/images/scannerlogo.png")}
            style={[
              {
                width: isDesktop ? 60 : 50,
                height: isDesktop ? 60 : 50,
                resizeMode: "contain",
                marginRight: 20,
                marginTop: 20,
              },
              isDesktop && { marginTop: 120, marginRight: 20 },
            ]}
          />
        </View>
        <View>
          <Text style={[loginStyles.brandName, isDesktop && { marginTop: 120 }]}>
            CardScan Pro
          </Text>
          <Text style={loginStyles.brandTag}>Smart Business Card Scanner</Text>
        </View>
      </View>

      <Text style={loginStyles.heroTitle}>
        Your contacts,{"\n"}
        <Text style={loginStyles.heroSpan}>always with you.</Text>
      </Text>

      {!hideTabsAndSub && (
        <Text style={loginStyles.heroSub}>
          Sign in to access your scanned cards & network
        </Text>
      )}

      {isDesktop && (
        <>
          <Text style={loginStyles.heroSub}>
            Sign in to access your scanned cards & network
          </Text>
          <View style={{ marginTop: 40, gap: 16 }}>
            {[
              { icon: "scan-outline", text: "Instantly scan business cards" },
              { icon: "people-outline", text: "Manage your entire network" },
              { icon: "cloud-upload-outline", text: "Sync across all your devices" },
            ].map((item, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "rgba(245,159,10,0.15)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon name={item.icon} size={18} color={colors.amber} />
                </View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!isDesktop && (
        <View style={loginStyles.tabs}>
          <TouchableOpacity
            style={[
              loginStyles.tab,
              activeTab === "login" && loginStyles.activeTab,
            ]}
            onPress={() => handleTabSwitch("login")}
          >
            <Text
              style={[
                loginStyles.tabText,
                activeTab === "login" && loginStyles.activeTabText,
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              loginStyles.tab,
              activeTab === "signup" && loginStyles.activeTab,
            ]}
            onPress={() => handleTabSwitch("signup")}
          >
            <Text
              style={[
                loginStyles.tabText,
                activeTab === "signup" && loginStyles.activeTabText,
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ─── Bottom privacy info ──────────────────────────────────────────────────
  const renderBottomInfo = () => (
    <View style={loginStyles.bottomInfo}>
      <Text style={loginStyles.bottomText}>
        By continuing, you agree to our{" "}
        <Text
          style={loginStyles.bottomLink}
          onPress={() => router.push("/privacy-policy")}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );

  // ─── Desktop layout ───────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView
        style={[loginStyles.container, { flexDirection: "row" }]}
        edges={["bottom"]}
      >
        <View style={loginStyles.leftPanel}>{renderHero(true)}</View>
        <View style={loginStyles.rightPanel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <View
              style={[
                loginStyles.tabs,
                { marginBottom: 24, backgroundColor: "rgba(15,23,42,0.07)" },
              ]}
            >
              <TouchableOpacity
                style={[
                  loginStyles.tab,
                  activeTab === "login" && loginStyles.activeTab,
                ]}
                onPress={() => handleTabSwitch("login")}
              >
                <Text
                  style={[
                    loginStyles.tabText,
                    { color: activeTab === "login" ? undefined : colors.muted },
                    activeTab === "login" && loginStyles.activeTabText,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  loginStyles.tab,
                  activeTab === "signup" && loginStyles.activeTab,
                ]}
                onPress={() => handleTabSwitch("signup")}
              >
                <Text
                  style={[
                    loginStyles.tabText,
                    {
                      color: activeTab === "signup" ? undefined : colors.muted,
                    },
                    activeTab === "signup" && loginStyles.activeTabText,
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
            <AuthForms {...authFormProps} />
            {renderBottomInfo()}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Tablet layout ────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
        <KeyboardAwareScrollView
          style={loginStyles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
          extraHeight={120}
        >
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 680 }}>
            {renderHero()}
            <AuthForms {...authFormProps} />
            {renderBottomInfo()}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ─── Mobile layout ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
      <KeyboardAwareScrollView
        style={loginStyles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        extraHeight={120}
      >
        {renderHero()}
        <AuthForms {...authFormProps} />
        {renderBottomInfo()}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;