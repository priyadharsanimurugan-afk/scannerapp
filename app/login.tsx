import React, { useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  useWindowDimensions,
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

const LoginScreen = () => {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;

  const {
    // Login
    loginEmail,
    setLoginEmail,
    loginPass,
    setLoginPass,
    showLoginPass,
    setShowLoginPass,

    // Signup
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
    handleLogin,
    handleSignup,
    handleForgot,
    checkStrength,
  } = useAuth();

  const { setMenuVisible } = useMenuVisibility();

  useEffect(() => {
    setMenuVisible(false);
    return () => {
      setMenuVisible(true);
    };
  }, [setMenuVisible]);

  // Shared auth form props
  const authFormProps = {
    loginEmail,
    setLoginEmail,
    loginPass,
    setLoginPass,
    showLoginPass,
    setShowLoginPass,
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
    forgotEmail,
    setForgotEmail,
    activeTab,
    showForgot,
    remember,
    setRemember,
    loading,
    setActiveTab,
    setShowForgot,
    handleLogin,
    handleSignup,
    handleForgot,
    checkStrength,
  };

  // ── Hero Section (shared across layouts) ────────────────────────────────────
  const renderHero = (hideTabsAndSub = false) => (
    <View
      style={[
        loginStyles.hero,
        isDesktop && { flex: 1 },

        // ✅ ONLY for mobile
        !isTablet && !isDesktop && {
          marginTop: 0,
        },
      ]}
    >

      <View style={loginStyles.heroGlow} />

      <View style={loginStyles.brand}>
      <View
  // style={[
  //   loginStyles.brandIcon,
  //   isDesktop && { marginTop: 100 },
  // ]}
>
<Image
  source={require("@/assets/images/scannerlogo.png")}
  style={[
    {
      width: isDesktop ? 60 : 50,
      height: isDesktop ? 60 : 50,
      resizeMode: "contain",
      marginRight: 20,
      marginTop: 20
    },
    isDesktop && { marginTop: 120 ,marginRight: 20},
  ]}
/>

</View>

        <View>
          <Text
            style={[
              loginStyles.brandName,
          

              // ✅ only desktop
              isDesktop && { marginTop: 120 },
            ]}
          >
            CardScan Pro
          </Text>

          <Text style={loginStyles.brandTag}>
            Smart Business Card Scanner
          </Text>

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
          {/* Decorative features list for desktop left panel */}
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

      {/* Tabs — shown on mobile and tablet, hidden on desktop */}
      {!isDesktop && (
        <View style={loginStyles.tabs}>
          <TouchableOpacity
            style={[loginStyles.tab, activeTab === "login" && loginStyles.activeTab]}
            onPress={() => setActiveTab("login")}
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
            style={[loginStyles.tab, activeTab === "signup" && loginStyles.activeTab]}
            onPress={() => setActiveTab("signup")}
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

  // ── Bottom Info ─────────────────────────────────────────────────────────────
  const renderBottomInfo = () => (
    <View style={loginStyles.bottomInfo}>
      <Text style={loginStyles.bottomText}>
        By continuing, you agree to our{" "}
        <Text style={loginStyles.bottomLink}>Terms of Service</Text>
        {"\n"}
        and <Text style={loginStyles.bottomLink}>Privacy Policy</Text>. Your
        data is encrypted & secure.
      </Text>
    </View>
  );

  // ── DESKTOP LAYOUT (two-column) ────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView style={[loginStyles.container, { flexDirection: "row" }]} edges={["bottom"]}>
        {/* Toast */}
        {toast.show && (
          <View
            style={[
              loginStyles.toast,
              toast.type === "error" && { backgroundColor: "#ff4d4d" },
              toast.type === "success" && { backgroundColor: "#4CAF50" },
              toast.type === "info" && { backgroundColor: "#333" },
            ]}
          >
            <Icon
              name={
                toast.type === "error"
                  ? "close-circle"
                  : toast.type === "success"
                    ? "checkmark-circle"
                    : "information-circle"
              }
              size={18}
              color="#fff"
            />
            <Text style={loginStyles.toastText}>{toast.msg}</Text>
          </View>
        )}

        {/* Left — Hero panel */}
        <View style={loginStyles.leftPanel}>{renderHero(true)}</View>

        {/* Right — Form panel */}
        <View style={loginStyles.rightPanel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            {/* Desktop tabs inside right panel */}
            <View style={[loginStyles.tabs, { marginBottom: 24, backgroundColor: "rgba(15,23,42,0.07)" }]}>
              <TouchableOpacity
                style={[loginStyles.tab, activeTab === "login" && loginStyles.activeTab]}
                onPress={() => setActiveTab("login")}
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
                style={[loginStyles.tab, activeTab === "signup" && loginStyles.activeTab]}
                onPress={() => setActiveTab("signup")}
              >
                <Text
                  style={[
                    loginStyles.tabText,
                    { color: activeTab === "signup" ? undefined : colors.muted },
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

  // ── TABLET LAYOUT (single column, centered card) ───────────────────────────
  if (isTablet) {
    return (
      <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
        {/* Toast */}
        {toast.show && (
          <View
            style={[
              loginStyles.toast,
              toast.type === "error" && { backgroundColor: "#ff4d4d" },
              toast.type === "success" && { backgroundColor: "#4CAF50" },
              toast.type === "info" && { backgroundColor: "#333" },
            ]}
          >
            <Icon
              name={
                toast.type === "error"
                  ? "close-circle"
                  : toast.type === "success"
                    ? "checkmark-circle"
                    : "information-circle"
              }
              size={18}
              color="#fff"
            />
            <Text style={loginStyles.toastText}>{toast.msg}</Text>
          </View>
        )}

        <KeyboardAwareScrollView
          style={loginStyles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
          extraHeight={120}
        >
          {/* Center content wrapper */}
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 680 }}>
            {renderHero()}

            <AuthForms {...authFormProps} />
            {renderBottomInfo()}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ── MOBILE LAYOUT (original) ───────────────────────────────────────────────
  return (
    <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
      {/* Toast */}
      {toast.show && (
        <View
          style={[
            loginStyles.toast,
            toast.type === "error" && { backgroundColor: "#ff4d4d" },
            toast.type === "success" && { backgroundColor: "#4CAF50" },
            toast.type === "info" && { backgroundColor: "#333" },
          ]}
        >
          <Icon
            name={
              toast.type === "error"
                ? "close-circle"
                : toast.type === "success"
                  ? "checkmark-circle"
                  : "information-circle"
            }
            size={18}
            color="#fff"
          />
          <Text style={loginStyles.toastText}>{toast.msg}</Text>
        </View>
      )}

      <KeyboardAwareScrollView
        style={loginStyles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
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