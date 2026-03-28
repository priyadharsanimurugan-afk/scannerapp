import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { loginStyles } from "@/components/styles/loginStyles";
import { colors } from "@/constants/colors";
import { useMenuVisibility } from "@/context/MenuVisibilityContext";
import { resetPasswordUser, resendResetCode } from "@/services/auth";
import { Toast } from "@/components/webalert";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { setMenuVisible } = useMenuVisibility();
  
  // Refs for input fields
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPassRef = useRef<TextInput>(null);

  useEffect(() => {
    setMenuVisible(false);
    return () => {
      setMenuVisible(true);
    };
  }, [setMenuVisible]);

  // Focus on first error field when errors occur
  useEffect(() => {
    const errorFields = Object.keys(fieldErrors);
    if (errorFields.length === 0) return;

    const focusTimeout = setTimeout(() => {
      const firstErrorField = errorFields[0].toLowerCase();
      
      switch (firstErrorField) {
        case 'code':
          codeRef.current?.focus();
          break;
        case 'newpassword':
        case 'password':
          passwordRef.current?.focus();
          break;
        case 'confirmpassword':
          confirmPassRef.current?.focus();
          break;
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

  const clearAllErrors = () => {
    setFieldErrors({});
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
          let mappedKey = key.toLowerCase();
          if (key === "NewPassword") {
            mappedKey = "newpassword";
          } else if (key === "Code") {
            mappedKey = "code";
          } else if (key === "ConfirmPassword") {
            mappedKey = "confirmpassword";
          }
          errorsMap[mappedKey] = value as string[];
        } else if (typeof value === 'string') {
          let mappedKey = key.toLowerCase();
          if (key === "NewPassword") {
            mappedKey = "newpassword";
          } else if (key === "Code") {
            mappedKey = "code";
          } else if (key === "ConfirmPassword") {
            mappedKey = "confirmpassword";
          }
          errorsMap[mappedKey] = [value];
        }
      }
    } else if (data.message) {
      errorsMap['general'] = [data.message];
    }

    return errorsMap;
  };

  const handleReset = async () => {
    // Clear previous errors
    clearAllErrors();

    // Frontend validation for password match only
    if (password !== confirmPass) {
      setFieldErrors({ confirmpassword: ["Passwords do not match"] });
      confirmPassRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      await resetPasswordUser({ 
        email: String(email), 
        code, 
        newPassword: password 
      });
      
      Toast.success("Password reset successful! Please login with your new password");
      
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
      
    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
      
      // Focus on the field that has error
      if (errors.code) {
        codeRef.current?.focus();
      } else if (errors.newpassword || errors.password) {
        passwordRef.current?.focus();
      } else if (errors.confirmpassword) {
        confirmPassRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    // Clear previous errors
    clearAllErrors();
    
    try {
      setResendLoading(true);
      await resendResetCode({ email: String(email) });
      
      Toast.success("A new reset code has been sent to your email address");
      
      setTimeout(() => {
        setCode("");
        codeRef.current?.focus();
      }, 500);
      
    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
      codeRef.current?.focus();
      
      if (errors.email) {
        Toast.error(errors.email[0]);
      } else if (errors.general) {
        Toast.error(errors.general[0]);
      }
    } finally {
      setResendLoading(false);
    }
  };

  const getFieldError = (field: string): string | null => {
    const possibleFields = [field];
    if (field === 'newpassword') {
      possibleFields.push('password');
    }
    
    for (const f of possibleFields) {
      const errors = fieldErrors[f];
      if (errors && errors.length > 0) {
        return errors[0];
      }
    }
    return null;
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
          <Icon name="lock-closed-outline" size={isDesktop ? 22 : 18} color={colors.navy} />
        </View>
        <View>
          <Text style={loginStyles.brandName}>Reset Password</Text>
          <Text style={loginStyles.brandTag}>Secure your CardScan account</Text>
        </View>
      </View>

      <Text style={loginStyles.heroTitle}>Create new password</Text>
      <Text style={loginStyles.heroSub}>Enter the code sent to your email</Text>
      <Text style={{ color: colors.amber, fontWeight: "700", marginTop: 4, fontSize: isDesktop ? 15 : 13 }}>
        {email}
      </Text>

      {isDesktop && (
        <View style={{ marginTop: 40, gap: 16 }}>
          {[
            { icon: "key-outline", text: "Check your email for the reset code" },
            { icon: "lock-open-outline", text: "Choose a strong new password" },
            { icon: "shield-checkmark-outline", text: "Your data is encrypted & safe" },
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
    const passwordError = getFieldError('newpassword');
    const confirmError = getFieldError('confirmpassword');
    
    return (
      <View style={[loginStyles.card, isDesktop && { marginHorizontal: 0, marginTop: 0 }]}>
        {/* CODE */}
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Verification Code</Text>
          <View style={[
            loginStyles.inputWrap,
            codeError && { borderColor: '#E24B4A' }
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
                clearFieldError('code');
              }}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              autoFocus={true}
              editable={!loading}
            />
          </View>
          {codeError && (
            <Text style={loginStyles.errorText}>{codeError}</Text>
          )}
        </View>

        {/* NEW PASSWORD */}
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>New Password</Text>
          <View style={[
            loginStyles.inputWrap,
            passwordError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="lock-closed-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={passwordRef}
              style={loginStyles.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('newpassword');
                clearFieldError('password');
                // Clear confirm password error when password changes
                if (confirmError) {
                  clearFieldError('confirmpassword');
                }
              }}
              returnKeyType="next"
              onSubmitEditing={() => confirmPassRef.current?.focus()}
              editable={!loading}
            />
          </View>
          {passwordError && (
            <Text style={loginStyles.errorText}>{passwordError}</Text>
          )}
          
          {/* Resend Code Link */}
          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginTop: 8 }}
            onPress={handleResendCode}
            disabled={resendLoading || loading}
          >
            <Text style={{ 
              color: colors.amber, 
              fontWeight: "600", 
              fontSize: 12,
              opacity: (resendLoading || loading) ? 0.5 : 1
            }}>
              {resendLoading ? "Sending..." : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONFIRM PASSWORD */}
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Confirm Password</Text>
          <View style={[
            loginStyles.inputWrap,
            confirmError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="shield-checkmark-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={confirmPassRef}
              style={loginStyles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry
              value={confirmPass}
              onChangeText={(text) => {
                setConfirmPass(text);
                clearFieldError('confirmpassword');
              }}
              returnKeyType="done"
              onSubmitEditing={handleReset}
              editable={!loading}
            />
          </View>
          {confirmError && (
            <Text style={loginStyles.errorText}>{confirmError}</Text>
          )}
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity 
          style={[loginStyles.btn, loading && loginStyles.btnDisabled]} 
          onPress={handleReset} 
          disabled={loading}
        >
          <Icon name={loading ? "refresh-outline" : "lock-open-outline"} size={18} color={colors.navy} />
          <Text style={loginStyles.btnText}>
            {loading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

        {/* BACK */}
        <TouchableOpacity 
          style={{ marginTop: 20, alignItems: "center" }} 
          onPress={() => router.replace("/login")}
          disabled={loading}
        >
          <Text style={[loginStyles.switchLink, loading && { opacity: 0.5 }]}>
            Back to Sign In →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView style={[loginStyles.container, { flexDirection: "row" }]} edges={["bottom"]}>
        <StatusBar barStyle="light-content" />
        <View style={[loginStyles.leftPanel, { flex: 1 }]}>
          {renderHeroContent()}
        </View>
        <View style={loginStyles.rightPanel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.navy, marginBottom: 24 }}>
              Reset your password
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