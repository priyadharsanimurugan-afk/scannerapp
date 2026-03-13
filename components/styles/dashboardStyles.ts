// components/styles/dashboardStyles.ts
import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

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

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    position: "relative",
    overflow: "hidden",
  },
  headerGlow1: {
    position: "absolute",
    top: -34,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.amber,
    opacity: 0.12,
  },
  headerGlow2: {
    position: "absolute",
    bottom: -50,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
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
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 3,
  },
  titleText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 29,
  },
  titleSpan: {
    color: colors.amber,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: 16,
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
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.amber,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.amber,
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(19,28,48,0.22)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  ctaSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },

  // ─── Stats Grid ────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: colors.phoneBg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    position: "relative",
    overflow: "hidden",
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
    width: 32,
    height: 32,
    backgroundColor: colors.amberLight,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.phoneBg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.amberDark,
  },

  // ─── Quick Actions ─────────────────────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
    backgroundColor: colors.phoneBg,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 7,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  quickIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.amberLight,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  // ─── Contact List ──────────────────────────────────────────────────────────
  contactList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 24,
    backgroundColor: colors.phoneBg,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  contactRole: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
  },
  contactCompany: {
    fontSize: 11,
    color: colors.amberDark,
    fontWeight: "600",
    marginTop: 1,
  },
  contactMeta: {
    alignItems: "flex-end",
    gap: 5,
  },
  // Small mail icon badge shown on cards that have an email
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

  // ─── (kept for reference, currently unused) ────────────────────────────────
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
  // tag kept in case other screens still import it
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    overflow: "hidden",
  },
});