import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Entypo } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { colors } from "@/constants/colors";
import { getRoles } from "@/utils/tokenStorage";
import { useDeviceType } from "@/hooks/useDeviceType";

export default function FloatingMenu() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const { isDesktop } = useDeviceType(); // 👈 added

   useEffect(() => {
    const checkRole = async () => {
      const roles = await getRoles();
      if (roles?.includes("Admin")) {
        setIsAdmin(true);
      }
    };

    checkRole();
  }, []);

  // 👇 Hide menu on desktop
  if (isDesktop) return null;

  return (
    <View style={styles.container}>

      {open && <View style={styles.menuBackground} />}

      {open && (
        <>
          {/* FIRST BUTTON (ROLE BASED) */}

          {isAdmin ? (
            <TouchableOpacity
              style={[styles.menuItem, { bottom: 0, right: 130 }]}
              onPress={() => {
                router.push("/users");
                setOpen(false);
              }}
            >
              <Icon name="people" size={24} color={colors.white} />
              <Text style={styles.label}>Users</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.menuItem, { bottom: 0, right: 110 }]}
              onPress={() => {
                router.push("/dashboard");
                setOpen(false);
              }}
            >
              <Entypo name="home" size={20} color={colors.white} />
              <Text style={styles.label}>Dashboard</Text>
            </TouchableOpacity>
          )}

          {/* Contacts */}
          <TouchableOpacity
            style={[styles.menuItem, { bottom: 60, right: 70 }]}
            onPress={() => {
              router.push("/contacts");
              setOpen(false);
            }}
          >
            <Entypo name="old-phone" size={20} color={colors.white} />
            <Text style={styles.label}>Contacts</Text>
          </TouchableOpacity>

          {/* Scan */}
          <TouchableOpacity
            style={[styles.menuItem, { bottom: 70, right: 0 }]}
            onPress={() => {
              router.push({ pathname: "/scan", params: { openCamera: Date.now().toString() } });
              setOpen(false);
            }}
          >
            <Entypo name="camera" size={20} color={colors.white} />
            <Text style={styles.label}>Scan</Text>
          </TouchableOpacity>
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen(!open)}
      >
        <Entypo
          name={open ? "cross" : "plus"}
          size={28}
          color={colors.white}
        />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    right: 25,
    alignItems: "center",
  },

  fab: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: colors.amber,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    zIndex: 10,
  },

  menuBackground: {
    position: "absolute",
    width: 270,
    height: 160,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    backgroundColor: colors.navy,
    opacity: 0.95,
    bottom: -20,
    right: -80,
  },

  menuItem: {
    position: "absolute",
    alignItems: "center",
    zIndex: 20,
  },

  label: {
    color: colors.white,
    marginTop: 5,
    fontSize: 11,
    fontWeight: "500",
  },
});
