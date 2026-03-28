import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { verifyEmail, resendVerifyEmail } from "@/services/auth";
import { loginStyles } from "@/components/styles/loginStyles";
import { colors } from "@/constants/colors";
import { useMenuVisibility } from "@/context/MenuVisibilityContext";
import { Toast } from "@/components/webalert";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [resendError, setResendError] = useState<string | null>(null);

  const { setMenuVisible } = useMenuVisibility();
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    setMenuVisible(false);
    return () => {
      setMenuVisible(true);
    };
  }, [setMenuVisible]);

  // Focus on error field when errors occur
  useEffect(() => {
    const errorFields = Object.keys(fieldErrors);
    if (errorFields.length === 0) return;

    const focusTimeout = setTimeout(() => {
      const firstErrorField = errorFields[0].toLowerCase();
      
      if (firstErrorField === 'code' || firstErrorField === 'email') {
        codeRef.current?.focus();
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [fieldErrors]);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

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
          errorsMap[key.toLowerCase()] = value as string[];
        } else if (typeof value === 'string') {
          errorsMap[key.toLowerCase()] = [value];
        }
      }
    } else if (data.message) {
      errorsMap['general'] = [data.message];
    }

    return errorsMap;
  };

  const handleVerify = async () => {
    // Clear previous errors
    setFieldErrors({});
    
    // Validate code
    if (!code || code.length !== 6) {
      setFieldErrors({ code: ["Please enter a valid 6-digit verification code"] });
      codeRef.current?.focus();
      return;
    }

    try {
      setLoading(true);

      await verifyEmail({ email: String(email), code });

      Toast.success("Email verified successfully!");

      setTimeout(() => {
        router.replace("/login");
      }, 1200);

    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
      
      // Focus on code field if it has errors
      if (errors.code || errors.general || errors.email) {
        codeRef.current?.focus();
      }
      
      // Show alert for general errors
      if (errors.general) {
        Alert.alert("Verification Failed", errors.general[0]);
      } else if (errors.code) {
        Alert.alert("Invalid Code", errors.code[0]);
      } else if (errors.email) {
        Alert.alert("Invalid Email", errors.email[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    // Clear previous resend error and field errors
    setResendError(null);
    setFieldErrors({});
    
    try {
      setResendLoading(true);
      await resendVerifyEmail(String(email));
      
      Toast.success("A new verification code has been sent to your email address");
      
      setTimeout(() => {
        setCode("");
        codeRef.current?.focus();
      }, 500);
      
    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      
      // Handle specific field errors
      if (errors.email) {
        setResendError(errors.email[0]);
        setFieldErrors({ email: errors.email });
      } else if (errors.general) {
        setResendError(errors.general[0]);
        setFieldErrors({ general: errors.general });
      } else {
        const errorMsg = "Unable to send verification code. Please try again.";
        setResendError(errorMsg);
        setFieldErrors({ general: [errorMsg] });
      }
      
      // Focus on code field
      codeRef.current?.focus();
      
      // Show alert for better UX
      Alert.alert(
        "Failed to Resend",
        resendError || "Unable to send verification code. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const getFieldError = (field: string): string | null => {
    const errors = fieldErrors[field.toLowerCase()];
    return errors && errors.length > 0 ? errors[0] : null;
  };

  // ── Shared Hero Content ────────────────────────────────────────────────────
  const renderHeroContent = () => (
    <>
      <View style={loginStyles.heroGlow} />

      <TouchableOpacity
        style={{ marginBottom: isDesktop ? 32 : 20, marginTop: isDesktop ? -100 : 20 }}
        onPress={() => router.replace("/login")}
      >
        <Icon name="arrow-back-outline" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={loginStyles.brand}>
        <View style={loginStyles.brandIcon}>
          <Icon name="mail-open-outline" size={isDesktop ? 22 : 18} color={colors.navy} />
        </View>
        <View>
          <Text style={loginStyles.brandName}>Verify Email</Text>
          <Text style={loginStyles.brandTag}>Secure your CardScan account</Text>
        </View>
      </View>

      <Text style={loginStyles.heroTitle}>Check your inbox</Text>
      <Text style={loginStyles.heroSub}>Enter the verification code sent to</Text>
      <Text style={{ color: colors.amber, fontWeight: "700", marginTop: 4, fontSize: isDesktop ? 15 : 13 }}>
        {email}
      </Text>

      {/* Decorative info block for desktop */}
      {isDesktop && (
        <View style={{ marginTop: 40, gap: 16 }}>
          {[
            { icon: "shield-checkmark-outline", text: "6-digit code sent to your email" },
            { icon: "time-outline", text: "Code expires in 10 minutes" },
            { icon: "refresh-outline", text: "Didn't get it? Check your spam folder" },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: "rgba(245,159,10,0.15)",
                justifyContent: "center", alignItems: "center",
              }}>
                <Icon name={item.icon} size={18} color={colors.amber} />
              </View>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" }}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  // ── Shared Form Content ────────────────────────────────────────────────────
  const renderFormContent = () => {
    const codeError = getFieldError('code');
    const emailError = getFieldError('email');
    const generalError = getFieldError('general');
    
    // Display the most relevant error (code error takes priority)
    const displayError = codeError || emailError || generalError || resendError;
    
    return (
      <View style={[loginStyles.card, isDesktop && { marginHorizontal: 0, marginTop: 0 }]}>
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Verification Code</Text>
          <View style={[
            loginStyles.inputWrap,
            displayError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="key-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={codeRef}
              style={loginStyles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.inputPlaceholder}
              value={code}
              onChangeText={(text) => {
                setCode(text);
                // Clear all errors when typing
                setFieldErrors({});
                setResendError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus={true}
            />
          </View>
          {/* Error displayed below the input field */}
          {displayError && (
            <Text style={loginStyles.errorText}>{displayError}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[loginStyles.btn, loading && loginStyles.btnDisabled]} 
          onPress={handleVerify} 
          disabled={loading}
        >
          <Icon name={loading ? "refresh-outline" : "checkmark-circle-outline"} size={18} color={colors.navy} />
          <Text style={loginStyles.btnText}>
            {loading ? "Verifying..." : "Verify Email"}
          </Text>
        </TouchableOpacity>

        {/* Resend Code Section */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Didn't receive the code?
            </Text>
            <TouchableOpacity 
              onPress={handleResendCode} 
              disabled={resendLoading}
            >
              <Text 
                style={[
                  loginStyles.switchLink,
                  { 
                    fontSize: 14, 
                    fontWeight: "600",
                    opacity: resendLoading ? 0.5 : 1 
                  }
                ]}
              >
                {resendLoading ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Help text */}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
            Check your spam folder if you don't see the email
          </Text>
        </View>

        <TouchableOpacity 
          style={{ marginTop: 20, alignItems: "center" }} 
          onPress={() => router.replace("/login")}
        >
          <Text style={loginStyles.switchLink}>Back to Sign In →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView style={[loginStyles.container, { flexDirection: "row" }]} edges={["bottom"]}>
        <StatusBar barStyle="light-content" />

        {/* Left hero panel */}
        <View style={[loginStyles.leftPanel, { flex: 1 }]}>
          {renderHeroContent()}
        </View>

        {/* Right form panel */}
        <View style={loginStyles.rightPanel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.navy, marginBottom: 24 }}>
              Enter your code
            </Text>
            {renderFormContent()}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ── TABLET LAYOUT ──────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <SafeAreaView style={loginStyles.container} edges={["bottom"]}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 680 }}>
            <View style={loginStyles.hero}>{renderHeroContent()}</View>
            {renderFormContent()}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={loginStyles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={loginStyles.hero}>{renderHeroContent()}</View>
        {renderFormContent()}
      </ScrollView>
    </SafeAreaView>
  );
}