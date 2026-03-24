import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text } from "react-native";
import { useEffect, useState } from "react";
import { getAccessToken, deleteTokens } from "@/utils/tokenStorage";
import { CardProvider } from "@/components/store/useCardStore";
import { SafeAreaView } from "react-native-safe-area-context";
import FloatingMenu from "./FloatingMenu";
import { MenuVisibilityProvider, useMenuVisibility } from "@/context/MenuVisibilityContext";
import { setLogoutHandler, getIsLoggingOut } from "@/utils/logout";
import { ToastProvider } from "@/components/alertProvider";

function LayoutContent() {
  const { isMenuVisible } = useMenuVisibility();
  const router = useRouter();
  const segments = useSegments();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      // 🚨 Stop layout updates during logout
      if (getIsLoggingOut()) return;

      const token = await getAccessToken();

      const publicRoutes = ["login", "verify-email", "reset-password"];
      const currentRoute = segments[0];

      const isPublicRoute = publicRoutes.includes(currentRoute);
      const inAuthGroup = currentRoute === "login";

      if (!token && !isPublicRoute) {
        router.replace("/login");
      } else if (token && inAuthGroup) {
        router.replace("/(tabs)/dashboard");
      }

      // Smooth UX (avoid flicker)
      setTimeout(() => setLoading(false), 400);
    };

    checkLogin();
  }, [segments]);

  // 🌟 BEAUTIFUL LOADING SCREEN
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#131C30",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Logo / App Initial */}
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 20,
            backgroundColor: "#F59E0B",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>
            C
          </Text>
        </View>

        {/* App Name */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#fff",
            marginBottom: 8,
          }}
        >
          CardScan
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 13,
            color: "#aaa",
            marginBottom: 20,
          }}
        >
          Loading your screen...
        </Text>

        {/* Loader */}
        <ActivityIndicator size="small" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Top safe area */}
      <SafeAreaView style={{ backgroundColor: "#131C30" }} edges={["top"]} />

      <StatusBar style="light" translucent />

      <Stack screenOptions={{ headerShown: false }} />

      {isMenuVisible && <FloatingMenu />}
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Global logout handler
    setLogoutHandler(async () => {
      await deleteTokens();
      router.replace("/login");
    });
  }, []);

  return (
    <ToastProvider>
      <CardProvider>
        <MenuVisibilityProvider>
          <LayoutContent />
        </MenuVisibilityProvider>
      </CardProvider>
    </ToastProvider>
  );
}
