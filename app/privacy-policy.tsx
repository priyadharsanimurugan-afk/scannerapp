import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  Platform,
  Image,
  Animated,
} from "react-native";
import { colors } from "@/constants/colors";
import { useMenuVisibility } from "@/context/MenuVisibilityContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { router } from "expo-router";

export default function PrivacyPolicyScreen() {
  const { setMenuVisible } = useMenuVisibility();
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    setMenuVisible(false);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    return () => setMenuVisible(true);
  }, []);

  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      .pp-card { transition: box-shadow 0.25s ease, border-color 0.25s ease; }
      .pp-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important; border-color: rgba(99,102,241,0.25) !important; }
      .pp-back { transition: background 0.2s ease; cursor: pointer; }
      .pp-back:hover { background: #F1F5F9 !important; }
      .pp-email { cursor: pointer; transition: opacity 0.2s ease; }
      .pp-email:hover { opacity: 0.7; }
    `;
    document.head.appendChild(el);
    return () => { if (document.head.contains(el)) document.head.removeChild(el); };
  }, []);

const sections = [
  {
    icon: "document-text-outline",
    title: "Information We Collect",
    content:
      "We collect the details from business cards you scan, including name, phone number, email, company, and address. We also store your account email to provide access across devices.",
  },
  {
    icon: "options-outline",
    title: "How We Use Your Data",
    content:
      "Your data is used only to store, organize, and help you manage your business contacts. This enables search, viewing, and exporting your saved cards anytime.",
  },
  {
    icon: "cloud-outline",
    title: "Cloud Storage",
    content:
      "All scanned cards are securely stored in the cloud, allowing you to access your data anytime from any device by logging into your account.",
  },
  {
    icon: "card-outline",
    title: "Free Usage",
    content:
      "You can scan and store up to 50 business cards for free. After that, a subscription is required to continue adding new cards.",
  },
  {
    icon: "shield-outline",
    title: "Privacy Protection",
    content:
      "Your data is private and used only within the app. We do not sell, rent, or share your information with third parties.",
  },
  {
    icon: "lock-closed-outline",
    title: "Data Security",
    content:
      "We use modern security practices to protect your data and ensure safe storage and transmission.",
  },
  {
    icon: "mail-outline",
    title: "Contact Us",
    content: "For any privacy-related questions, contact us at ",
    isEmail: true,
    emailText: "info@lemenizinfotech.com",
  },
];


  const maxW = isDesktop ? 960 : isTablet ? 700 : "100%";
  const cols = isMobile ? 1 : 2;

  const renderGrid = () => {
    const rows: (typeof sections)[] = [];
    for (let i = 0; i < sections.length; i += cols) rows.push(sections.slice(i, i + cols));
    return rows.map((row, ri) => (
      <View key={ri} style={[styles.row, { gap: 14, marginBottom: 14 }]}>
        {row.map((s, ci) => (
          <View
            key={ci}
            // @ts-ignore
            className={isWeb ? "pp-card" : ""}
            style={[styles.card, { flex: 1 }]}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={s.icon} size={18} color={INDIGO} />
            </View>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>
              {s.content}
              {s.isEmail && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${s.emailText}`)}
                  activeOpacity={0.7}
                  // @ts-ignore
                  className={isWeb ? "pp-email" : ""}
                >
                  <Text style={styles.emailLink}>{s.emailText}</Text>
                </TouchableOpacity>
              )}
            </Text>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.wrapper,
          { maxWidth: maxW },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            activeOpacity={0.8}
            // @ts-ignore
            className={isWeb ? "pp-back" : ""}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={18} color={SLATE} />
          </TouchableOpacity>

          <Image
            source={require("@/assets/images/scannerlogo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CardScan Pro</Text>
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={12} color={INDIGO} />
            <Text style={styles.heroBadgeText}>Privacy Policy</Text>
          </View>

          <Text style={[styles.heroTitle, isMobile && { fontSize: 26 }]}>
            Your data, protected.
          </Text>
          <Text style={styles.heroDesc}>
            CardScan Pro stores your scanned business cards securely in the cloud. 
            Access your collection from any device, export your contacts anytime, 
            and enjoy 50 free scans before any payment is required.
          </Text>

          <View style={styles.trustRow}>
            {["Cloud Synced", "Export Any Time", "50 Free Scans"].map((t) => (
              <View key={t} style={styles.trustChip}>
                <View style={styles.trustDot} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Policy Details</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Cards ── */}
        <View>{renderGrid()}</View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Image
            source={require("@/assets/images/scannerlogo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerBrand}>CardScan Pro</Text>
          <Text style={styles.footerCopy}>© 2024 CardScan Pro. All rights reserved.</Text>
  
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const INDIGO = colors.amber;        // primary highlight (buttons, icons, accents)
const SLATE  = colors.muted;        // secondary text
const MUTED  = colors.textLight;    // light text
const BG     = colors.bg;           // background
const CARD   = colors.white;        // cards
const BORDER = colors.border;       // borders
const DARK   = colors.navy;         // headings / main text

const FONT   = Platform.OS === "web" ? "'Inter', system-ui, sans-serif" : undefined;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 60,
  },
  wrapper: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 24,
    alignSelf: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f3f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandName: {
    fontSize: 15,
    fontWeight: "600",
    color: DARK,
    letterSpacing: -0.3,
    fontFamily: FONT,
  },

  // Hero
  hero: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 28,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: colors.navy,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: INDIGO,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: FONT,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: DARK,
    letterSpacing: -0.8,
    marginBottom: 10,
    fontFamily: FONT,
  },
  heroDesc: {
    fontSize: 14,
    color: SLATE,
    lineHeight: 22,
    maxWidth: 540,
    marginBottom: 20,
    fontFamily: FONT,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fcfbf8",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: INDIGO,
  },
  trustText: {
    fontSize: 12,
    color: SLATE,
    fontWeight: "500",
    fontFamily: FONT,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    fontSize: 10,
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: FONT,
  },

  // Cards
  row: {
    flexDirection: "row",
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#fff8ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK,
    marginBottom: 6,
    letterSpacing: -0.2,
    fontFamily: FONT,
  },
  cardBody: {
    fontSize: 13,
    color: SLATE,
    lineHeight: 20,
    fontFamily: FONT,
  },
  emailLink: {
    color: INDIGO,
    fontWeight: "500",
    textDecorationLine: "underline",
    fontFamily: FONT,
  },

  // Footer
  footer: {
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 12,
    gap: 4,
  },
  footerLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginBottom: 6,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: "600",
    color: DARK,
    fontFamily: FONT,
  },
  footerCopy: {
    fontSize: 11,
    color: MUTED,
    fontFamily: FONT,
  },
  footerNote: {
    fontSize: 11,
    color: "#CBD5E1",
    fontFamily: FONT,
  },
});