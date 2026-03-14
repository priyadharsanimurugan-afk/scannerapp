//app/index.tsx

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { getAccessToken } from "@/utils/tokenStorage";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const token = await getAccessToken();

      if (token) {
        router.replace("/(tabs)/dashboard"); // go to dashboard
      } else {
        router.replace("/login"); // go to login
      }
    };

    checkLogin();
  }, []);

  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <ActivityIndicator size="large" />
    </View>
  );
}
