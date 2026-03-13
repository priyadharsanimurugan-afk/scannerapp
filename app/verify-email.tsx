import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StatusBar } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { verifyEmail } from "@/services/auth";
import { loginStyles } from "@/components/styles/loginStyles";
import { colors } from "@/constants/colors";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);

      await verifyEmail({
        email: String(email),
        code: code,
      });

      alert("Email verified successfully!");
      router.replace("/login");

    } catch (error: any) {
      alert(error?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={loginStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* HERO SECTION */}
      <View style={loginStyles.hero}>
        <View style={loginStyles.heroGlow} />

        {/* Back Button */}
        <TouchableOpacity
          style={{ marginBottom: 20 }}
          onPress={() => router.replace("/login")}
        >
          <Icon name="arrow-back-outline" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={loginStyles.brand}>
          <View style={loginStyles.brandIcon}>
            <Icon name="mail-open-outline" size={18} color={colors.navy} />
          </View>

          <View>
            <Text style={loginStyles.brandName}>Verify Email</Text>
            <Text style={loginStyles.brandTag}>
              Secure your CardScan account
            </Text>
          </View>
        </View>

        <Text style={loginStyles.heroTitle}>
          Check your inbox
        </Text>

        <Text style={loginStyles.heroSub}>
          Enter the verification code sent to
        </Text>

        <Text style={{ color: colors.amber, fontWeight: "700", marginTop: 4 }}>
          {email}
        </Text>
      </View>

      {/* CARD */}
      <View style={loginStyles.card}>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Verification Code</Text>

          <View style={loginStyles.inputWrap}>
            <Icon
              name="key-outline"
              size={16}
              color={colors.muted}
              style={loginStyles.inputIcon}
            />

            <TextInput
              style={loginStyles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.inputPlaceholder}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={loginStyles.btn}
          onPress={handleVerify}
          disabled={loading}
        >
          <Icon
            name={loading ? "refresh-outline" : "checkmark-circle-outline"}
            size={18}
            color={colors.navy}
          />

          <Text style={loginStyles.btnText}>
            {loading ? "Verifying..." : "Verify Email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 20 }}
          onPress={() => router.replace("/login")}
        >
          <Text style={loginStyles.switchLink}>
            Back to Sign In →
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
