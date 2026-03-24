// components/styles/dashboardStyles.ts
import { StyleSheet, Platform, Dimensions } from "react-native";
import { colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const isWeb = Platform.OS === "web";
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;
const isLargeScreen = isTablet || isDesktop;

// Responsive spacing/sizing helpers
const hp = (val: number) => (isDesktop ? val * 1.2 : val);
const rp = (mobile: number, tablet: number, desktop: number) => {
  if (isDesktop) return desktop;
  if (isTablet) return tablet;
  return mobile;
};

export const dashboardStyles = StyleSheet.create({
  // ─── Layout ────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  body: {
    flex: 1,
    backgroundColor: colors.phoneBg,
  },

  // ─── Web/Tablet outer wrapper ───────────────────────────────────────────────
  webWrapper: isLargeScreen
    ? {
        flex: 1,
        flexDirection: "row" as any,
        backgroundColor: colors.phoneBg,
      }
    : { flex: 1, backgroundColor: colors.phoneBg },

  // Sidebar (desktop only)
  sidebar: isDesktop
    ? {
        width: 240,
        backgroundColor: colors.navy,
        paddingTop: 28,
        paddingHorizontal: 16,
        paddingBottom: 24,
      }
    : { display: "none" as any },

  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  sidebarLogoIcon: {
    width: 38,
    height: 38,
    backgroundColor: colors.amber,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarLogoText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sidebarLogoTag: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sidebarNav: { gap: 4, flex: 1 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sidebarItemActive: {
    backgroundColor: "rgba(245,159,10,0.15)",
  },
  sidebarLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  sidebarLabelActive: {
    color: colors.amber,
  },

  // Main content area (next to sidebar on desktop)
  mainContent: isDesktop
    ? {
        flex: 1,
        backgroundColor: colors.phoneBg,
        overflow: "hidden" as any,
      }
    : { flex: 1, backgroundColor: colors.phoneBg },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: rp(24, 32, 32),
    paddingTop: rp(20, 24, 24),
    paddingBottom: rp(28, 32, 28),
    position: "relative",
    overflow: "hidden",
  },
  headerGlow1: {
    position: "absolute",
    top: -34,
    right: -40,
    width: rp(160, 200, 220),
    height: rp(160, 200, 220),
    borderRadius: rp(80, 100, 110),
    backgroundColor: colors.amber,
    opacity: 0.12,
  },
  headerGlow2: {
    position: "absolute",
    bottom: -50,
    left: -20,
    width: rp(120, 160, 180),
    height: rp(120, 160, 180),
    borderRadius: rp(60, 80, 90),
    backgroundColor: colors.amber,
    opacity: 0.07,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: rp(12, 13, 13),
    fontWeight: "500",
    marginBottom: 3,
  },
  titleText: {
    color: colors.white,
    fontSize: rp(24, 28, 26),
    fontWeight: "800",
    lineHeight: rp(29, 34, 32),
  },
  titleSpan: {
    color: colors.amber,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: rp(44, 50, 46),
    height: rp(44, 50, 46),
    borderRadius: rp(22, 25, 23),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: rp(16, 18, 16),
    fontWeight: "800",
    color: colors.white,
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: colors.error,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.navy,
  },

  // ─── Scan CTA ──────────────────────────────────────────────────────────────
  scanCta: {
    marginHorizontal: rp(16, 24, 24),
    marginTop: rp(16, 20, 20),
    backgroundColor: colors.amber,
    borderRadius: 18,
    padding: rp(18, 20, 20),
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.amber,
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    ...(isWeb && { cursor: "pointer" as any }),
  },
  ctaIcon: {
    width: rp(48, 54, 54),
    height: rp(48, 54, 54),
    backgroundColor: "rgba(19,28,48,0.22)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: { flex: 1 },
  ctaTitle: {
    color: colors.white,
    fontSize: rp(15, 16, 16),
    fontWeight: "800",
  },
  ctaSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: rp(11, 12, 12),
    fontWeight: "500",
    marginTop: 2,
  },

  // ─── Stats Grid ─────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    padding: rp(16, 24, 24),
    gap: rp(10, 14, 14),
    backgroundColor: colors.phoneBg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rp(14, 16, 16),
    padding: rp(14, 18, 18),
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    position: "relative",
    overflow: "hidden",
    ...(isWeb && { cursor: "pointer" as any }),
  },
  statBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.amber,
  },
  statIcon: {
    width: rp(32, 38, 38),
    height: rp(32, 38, 38),
    backgroundColor: colors.amberLight,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: rp(22, 26, 28),
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: rp(10, 11, 11),
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.partnerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  statBadgeText: {
    color: colors.partner,
    fontSize: 9,
    fontWeight: "700",
  },

  // ─── Section Header ────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: rp(16, 24, 24),
    paddingVertical: 6,
    backgroundColor: colors.phoneBg,
  
  },
  sectionTitle: {
    fontSize: rp(16, 17, 17),
    fontWeight: "800",
    color: colors.text,
      paddingTop: 14,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.amberDark,
    ...(isWeb && { cursor: "pointer" as any }),
  },

  // ─── Quick Actions ─────────────────────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: rp(16, 24, 24),
    gap: rp(10, 14, 14),
    marginBottom: 16,
    backgroundColor: colors.phoneBg,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rp(14, 16, 16),
    paddingVertical: rp(14, 18, 18),
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 7,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    ...(isWeb && { cursor: "pointer" as any }),
  },
  quickIcon: {
    width: rp(36, 42, 42),
    height: rp(36, 42, 42),
    backgroundColor: colors.amberLight,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: {
    fontSize: rp(9, 10, 10),
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  // ─── Contact List ──────────────────────────────────────────────────────────
  contactList: {
    paddingHorizontal: rp(16, 24, 24),
    gap: rp(10, 12, 12),
    paddingBottom: 24,
    backgroundColor: colors.phoneBg,
    // On tablet/desktop: 2-column grid via wrapping
    ...(isLargeScreen && {
      flexDirection: "row" as any,
      flexWrap: "wrap" as any,
    }),
  },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: rp(14, 16, 16),
    padding: rp(14, 16, 16),
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    // On tablet/desktop: each card takes ~half the row
    ...(isLargeScreen && {
      width: isDesktop ? "48.5%" as any : "48%" as any,
    }),
    ...(isWeb && { cursor: "pointer" as any }),
  },
  contactAvatar: {
    width: rp(44, 48, 48),
    height: rp(44, 48, 48),
    borderRadius: rp(22, 24, 24),
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    fontSize: rp(14, 16, 16),
    fontWeight: "800",
    color: colors.white,
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: rp(14, 15, 15),
    fontWeight: "700",
    color: colors.text,
  },
  contactRole: {
    fontSize: rp(11, 12, 12),
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
  },
  contactCompany: {
    fontSize: rp(11, 12, 12),
    color: colors.amberDark,
    fontWeight: "600",
    marginTop: 1,
  },
  contactMeta: {
    alignItems: "flex-end",
    gap: 5,
  },
  contactEmailBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.amberLight,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 9,
    color: colors.textLight,
    fontWeight: "500",
  },

  // ─── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: colors.phoneBg,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  emptyStateBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: colors.amber,
    borderRadius: 12,
  },

  // ─── Kept for reference ────────────────────────────────────────────────────
  profileInfoCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  profileInfoText: {
    color: colors.white,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    opacity: 0.8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    overflow: "hidden",
  },
    desktopHero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginBottom: 24,
    borderRadius: 0,
    position: "relative",
    overflow: "hidden",
  },
  desktopHeroContent: {
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  desktopHeroGreeting: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  desktopHeroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 8,
  },
  desktopHeroName: {
    color: colors.amber,
  },
  desktopHeroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "400",
  },
  desktopHeroAvatar: {
    cursor: "pointer",
  },
  desktopAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  desktopAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
  },
   sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  
  planBadge: {
    marginTop: 4,
  },
  
  premiumText: {
    color: colors.amber,
    fontWeight: '600',
  },
  
  upgradeButton: {
    backgroundColor: colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  
  downgradeButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  
  buttonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
    // Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    gap: 16,
  },
  
  paginationButton: {
    backgroundColor: 'rgba(245, 159, 10, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 159, 10, 0.3)',
  },
  
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  
  paginationText: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '600',
  },
  
  paginationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  
  paginationInfoText: {
    color: 'rgba(83, 82, 82, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
    remainingScans: {
    fontSize: 11,

    marginTop: 4,
  },

  // In your dashboardStyles file, add these styles:

desktopHeroSmall: {
  backgroundColor: colors.navy,
  paddingHorizontal: 32,
  paddingVertical: 24,
  width: "100%",
},
desktopHeroContentSmall: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
desktopHeroGreetingSmall: {
  fontSize: 14,
  color: "rgba(255,255,255,0.8)",
  marginBottom: 4,
},
desktopHeroTitleSmall: {
  fontSize: 24,
  fontWeight: "700",
  color: colors.white,
  marginBottom: 4,
},
desktopHeroNameSmall: {
  color: colors.amber,
},
desktopHeroSubtitleSmall: {
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
},
desktopHeroAvatarSmall: {
  marginLeft: 16,
},
desktopAvatarSmall: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: "center",
  justifyContent: "center",
},
desktopAvatarTextSmall: {
  fontSize: 18,
  fontWeight: "600",
  color: colors.white,
},
// In your dashboardStyles file, add or update:
loadingContainer: {
  flex: 1,
  backgroundColor: colors.phoneBg,
  justifyContent: "center",
  alignItems: "center",
},
});