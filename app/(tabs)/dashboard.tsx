// app/dashboard/index.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Share,
  Linking,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { dashboardStyles } from "@/components/styles/dashboardStyles";
import { colors } from "@/constants/colors";
import { useDashboard } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { getRoles } from "@/utils/tokenStorage";
import { SidebarLayout } from "../sidebar";
import { Toast } from "@/components/webalert";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
};

const getAvatarColor = (name: string) => {
  const palette = [
    "#1e3a5f", "#1a4731", "#3b1f6e", "#3d1a1a", "#1a3a3a",
    "#5f2e1e", "#2e1e5f", "#1e5f2e", "#5f1e4a", "#4a1e5f",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Contact Detail Modal ─────────────────────────────────────────────────────

const ContactDetailModal = ({
  contact,
  visible,
  onClose,
}: {
  contact: any;
  visible: boolean;
  onClose: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  if (!contact) return null;

  const personName = contact.personName || "Unknown";
  const email = contact.email || contact.email1 || "";
  const phone = contact.phoneNumber || contact.phoneNumber1 || "";
  const secondaryPhone = contact.phoneNumber2 || "";

  const handleEmail = () => { if (email) Linking.openURL(`mailto:${email}`); };
  const handlePhone = (p: string) => { if (p) Linking.openURL(`tel:${p}`); };
  const handleShare = async () => {
    const lines = [
      `👤 *${personName}*`,
      contact.designation ? `💼 ${contact.designation}` : null,
      contact.companyName ? `🏢 ${contact.companyName}` : null,
      email ? `✉️ ${email}` : null,
      phone ? `📞 ${phone}` : null,
      secondaryPhone ? `📱 ${secondaryPhone}` : null,
      contact.address ? `📍 ${contact.address}` : null,
      contact.website1 ? `🌐 ${contact.website1}` : null,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n"), title: `${personName}'s Contact` });
    } catch (e) { console.error(e); }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
    presentationStyle={isDesktop ? "formSheet" : "pageSheet"}
      transparent={isDesktop}
      onRequestClose={onClose}
    >
      {isDesktop ? (
        <View style={ms.modalOverlay}>
          <View style={ms.modalContainer}>
            <View style={ms.modalHeader}>
              <Text style={ms.modalTitle}>Contact Details</Text>
              <TouchableOpacity onPress={onClose} style={ms.modalCloseBtn}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={ms.modalScrollView}>
              <View style={ms.modalContent}>
                <View style={ms.identityRowDesktop}>
                  <View style={[ms.avatarDesktop, { backgroundColor: getAvatarColor(personName) }]}>
                    <Text style={ms.avatarTextDesktop}>{getInitials(personName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.nameDesktop}>{personName}</Text>
                    {contact.designation ? <Text style={ms.designationDesktop}>{contact.designation}</Text> : null}
                    {contact.companyName ? <Text style={ms.companyDesktop}>{contact.companyName}</Text> : null}
                  </View>
                </View>

                <View style={ms.actionRowDesktop}>
                  {phone ? (
                    <TouchableOpacity style={[ms.actionBtnDesktop, ms.actionPrimaryDesktop]} onPress={() => handlePhone(phone)}>
                      <Icon name="call" size={20} color={colors.white} />
                      <Text style={ms.actionLabelDesktop}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                  {email ? (
                    <TouchableOpacity style={[ms.actionBtnDesktop, ms.actionBlueDesktop]} onPress={handleEmail}>
                      <Icon name="mail" size={20} color={colors.white} />
                      <Text style={ms.actionLabelDesktop}>Email</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={[ms.actionBtnDesktop, ms.actionOutlineDesktop]} onPress={handleShare}>
                    <Icon name="share-social-outline" size={20} color={colors.text} />
                    <Text style={[ms.actionLabelDesktop, { color: colors.text }]}>Share</Text>
                  </TouchableOpacity>
                </View>

                <View style={ms.cardDesktop}>
                  <Text style={ms.cardTitleDesktop}>Contact Information</Text>
                  {phone ? (
                    <TouchableOpacity style={ms.rowDesktop} onPress={() => handlePhone(phone)}>
                      <View style={[ms.rowIconDesktop, { backgroundColor: "#E8F0FE" }]}>
                        <Icon name="call-outline" size={20} color="#1E88E5" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.rowLabelDesktop}>Mobile</Text>
                        <Text style={ms.rowValueDesktop}>{phone}</Text>
                      </View>
                      <Icon name="open-outline" size={18} color="#bbb" />
                    </TouchableOpacity>
                  ) : null}
                  {secondaryPhone ? (
                    <TouchableOpacity style={ms.rowDesktop} onPress={() => handlePhone(secondaryPhone)}>
                      <View style={[ms.rowIconDesktop, { backgroundColor: "#F1F3F4" }]}>
                        <Icon name="call-outline" size={20} color="#5F6368" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.rowLabelDesktop}>Work</Text>
                        <Text style={ms.rowValueDesktop}>{secondaryPhone}</Text>
                      </View>
                      <Icon name="open-outline" size={18} color="#bbb" />
                    </TouchableOpacity>
                  ) : null}
                  {email ? (
                    <TouchableOpacity style={ms.rowDesktop} onPress={handleEmail}>
                      <View style={[ms.rowIconDesktop, { backgroundColor: "#FFE8E8" }]}>
                        <Icon name="mail-outline" size={20} color="#EA4335" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.rowLabelDesktop}>Email</Text>
                        <Text style={ms.rowValueDesktop} numberOfLines={1}>{email}</Text>
                      </View>
                      <Icon name="open-outline" size={18} color="#bbb" />
                    </TouchableOpacity>
                  ) : null}
                  {contact.address ? (
                    <View style={ms.rowDesktop}>
                      <View style={[ms.rowIconDesktop, { backgroundColor: "#E6F4EA" }]}>
                        <Icon name="location-outline" size={20} color="#34A853" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.rowLabelDesktop}>Address</Text>
                        <Text style={ms.rowValueDesktop}>{contact.address}</Text>
                      </View>
                    </View>
                  ) : null}
                  {(contact.website1 || contact.website2) ? (
                    <TouchableOpacity
                      style={[ms.rowDesktop, ms.rowLastDesktop]}
                      onPress={() => Linking.openURL(contact.website1 || contact.website2)}
                    >
                      <View style={[ms.rowIconDesktop, { backgroundColor: "#FFF4E5" }]}>
                        <Icon name="globe-outline" size={20} color="#FB8C00" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.rowLabelDesktop}>Website</Text>
                        <Text style={ms.rowValueDesktop} numberOfLines={1}>{contact.website1 || contact.website2}</Text>
                      </View>
                      <Icon name="open-outline" size={18} color="#bbb" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {(contact.department || contact.notes) ? (
                  <View style={ms.cardDesktop}>
                    <Text style={ms.cardTitleDesktop}>Additional Information</Text>
                    {contact.department ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={ms.rowLabelDesktop}>Department</Text>
                        <Text style={ms.rowValueDesktop}>{contact.department}</Text>
                      </View>
                    ) : null}
                    {contact.notes ? (
                      <View>
                        <Text style={ms.rowLabelDesktop}>Notes</Text>
                        <Text style={ms.rowValueDesktop}>{contact.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {contact.createdDate ? (
                  <Text style={ms.timestampDesktop}>Added {formatDate(contact.createdDate)}</Text>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      ) : (
        <SafeAreaView style={ms.safeArea}>
          <View style={ms.topBar}>
            <TouchableOpacity onPress={onClose} style={ms.iconBtn} activeOpacity={0.7}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={ms.topBarTitle}>Contact</Text>
            <TouchableOpacity onPress={handleShare} style={ms.iconBtn} activeOpacity={0.7}>
              <Icon name="share-social-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={ms.identityRow}>
              <View style={[ms.avatar, { backgroundColor: getAvatarColor(personName) }]}>
                <Text style={ms.avatarText}>{getInitials(personName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ms.name}>{personName}</Text>
                {contact.designation ? <Text style={ms.designation}>{contact.designation}</Text> : null}
                {contact.companyName ? <Text style={ms.company}>{contact.companyName}</Text> : null}
              </View>
            </View>

            <View style={ms.actionRow}>
              {phone ? (
                <TouchableOpacity style={[ms.actionBtn, ms.actionPrimary]} onPress={() => handlePhone(phone)}>
                  <Icon name="call" size={18} color={colors.white} />
                  <Text style={[ms.actionLabel, { color: colors.white }]}>Call</Text>
                </TouchableOpacity>
              ) : null}
              {email ? (
                <TouchableOpacity style={[ms.actionBtn, ms.actionBlue]} onPress={handleEmail}>
                  <Icon name="mail" size={18} color={colors.white} />
                  <Text style={[ms.actionLabel, { color: colors.white }]}>Email</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={[ms.actionBtn, ms.actionOutline]} onPress={handleShare}>
                <Icon name="share-social-outline" size={18} color={colors.text} />
                <Text style={[ms.actionLabel, { color: colors.text }]}>Share</Text>
              </TouchableOpacity>
            </View>

            <View style={ms.card}>
              <Text style={ms.cardTitle}>Contact information</Text>
              {phone ? (
                <TouchableOpacity style={ms.row} onPress={() => handlePhone(phone)}>
                  <View style={[ms.rowIcon, { backgroundColor: "#E8F0FE" }]}>
                    <Icon name="call-outline" size={17} color="#1E88E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.rowLabel}>Mobile</Text>
                    <Text style={ms.rowValue}>{phone}</Text>
                  </View>
                  <Icon name="open-outline" size={15} color="#bbb" />
                </TouchableOpacity>
              ) : null}
              {secondaryPhone ? (
                <TouchableOpacity style={ms.row} onPress={() => handlePhone(secondaryPhone)}>
                  <View style={[ms.rowIcon, { backgroundColor: "#F1F3F4" }]}>
                    <Icon name="call-outline" size={17} color="#5F6368" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.rowLabel}>Work</Text>
                    <Text style={ms.rowValue}>{secondaryPhone}</Text>
                  </View>
                  <Icon name="open-outline" size={15} color="#bbb" />
                </TouchableOpacity>
              ) : null}
              {email ? (
                <TouchableOpacity style={ms.row} onPress={handleEmail}>
                  <View style={[ms.rowIcon, { backgroundColor: "#FFE8E8" }]}>
                    <Icon name="mail-outline" size={17} color="#EA4335" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.rowLabel}>Email</Text>
                    <Text style={ms.rowValue} numberOfLines={1}>{email}</Text>
                  </View>
                  <Icon name="open-outline" size={15} color="#bbb" />
                </TouchableOpacity>
              ) : null}
              {contact.address ? (
                <View style={ms.row}>
                  <View style={[ms.rowIcon, { backgroundColor: "#E6F4EA" }]}>
                    <Icon name="location-outline" size={17} color="#34A853" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.rowLabel}>Address</Text>
                    <Text style={ms.rowValue}>{contact.address}</Text>
                  </View>
                </View>
              ) : null}
              {(contact.website1 || contact.website2) ? (
                <TouchableOpacity
                  style={[ms.row, ms.rowLast]}
                  onPress={() => Linking.openURL(contact.website1 || contact.website2)}
                >
                  <View style={[ms.rowIcon, { backgroundColor: "#FFF4E5" }]}>
                    <Icon name="globe-outline" size={17} color="#FB8C00" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.rowLabel}>Website</Text>
                    <Text style={ms.rowValue} numberOfLines={1}>{contact.website1 || contact.website2}</Text>
                  </View>
                  <Icon name="open-outline" size={15} color="#bbb" />
                </TouchableOpacity>
              ) : null}
            </View>

            {(contact.department || contact.notes) ? (
              <View style={ms.card}>
                <Text style={ms.cardTitle}>Additional information</Text>
                {contact.department ? (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={ms.rowLabel}>Department</Text>
                    <Text style={ms.rowValue}>{contact.department}</Text>
                  </View>
                ) : null}
                {contact.notes ? (
                  <View>
                    <Text style={ms.rowLabel}>Notes</Text>
                    <Text style={ms.rowValue}>{contact.notes}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {contact.createdDate ? (
              <Text style={ms.timestamp}>Added {formatDate(contact.createdDate)}</Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
};

const ms = StyleSheet.create({
  // Mobile styles
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f2f2",
    color: colors.text,
     marginTop:60,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.white,
    backgroundColor: colors.navy,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",

  },
  topBarTitle: { fontSize: 16, fontWeight: "600", color: colors.white },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center",
  },
  identityRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: colors.white, padding: 16, marginBottom: 1,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: colors.white },
  name: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 2 },
  designation: { fontSize: 13, color: "#555", marginBottom: 1 },
  company: { fontSize: 12, color: "#888" },
  actionRow: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0", marginBottom: 12,
  },
  actionBtn: {
    flex: 1, flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, gap: 4,
  },
  actionPrimary: { backgroundColor: colors.navy },
  actionBlue: { backgroundColor: colors.amber },
  actionOutline: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#CCC",
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13, fontWeight: "700", color: colors.text,
    marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F0F0",
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 9,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  rowLabel: { fontSize: 11, color: "#999", fontWeight: "600", marginBottom: 1 },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "500" },
  timestamp: { textAlign: "center", fontSize: 11, color: "#AAA", paddingVertical: 12 },
  
  // Desktop modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: "90%",
    maxWidth: 700,
    maxHeight: "85%",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      },
      default: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
  },
  identityRowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatarDesktop: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextDesktop: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.white,
  },
  nameDesktop: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  designationDesktop: {
    fontSize: 14,
    color: "#555",
    marginBottom: 2,
  },
  companyDesktop: {
    fontSize: 13,
    color: "#888",
  },
  actionRowDesktop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionBtnDesktop: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionPrimaryDesktop: {
    backgroundColor: colors.navy,
  },
  actionBlueDesktop: {
    backgroundColor: colors.amber,
  },
  actionOutlineDesktop: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#CCC",
  },
  actionLabelDesktop: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
  },
  cardDesktop: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitleDesktop: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  rowLastDesktop: {
    borderBottomWidth: 0,
  },
  rowIconDesktop: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabelDesktop: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 2,
  },
  rowValueDesktop: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  timestampDesktop: {
    textAlign: "center",
    fontSize: 12,
    color: "#AAA",
    paddingVertical: 8,
  },
});

// ─── Contact Card ─────────────────────────────────────────────────────────────

const ContactCard = ({
  contact,
  onPress,
}: {
  contact: any;
  onPress: (contact: any) => void;
}) => {
  const personName = contact.personName || "Unknown";
  const email = contact.email || contact.email1 || "";

  return (
    <TouchableOpacity
      style={dashboardStyles.contactCard}
      activeOpacity={0.7}
      onPress={() => onPress(contact)}
    >
      <View style={[dashboardStyles.contactAvatar, { backgroundColor: getAvatarColor(personName) }]}>
        <Text style={dashboardStyles.contactAvatarText}>{getInitials(personName)}</Text>
      </View>
      <View style={dashboardStyles.contactInfo}>
        <Text style={dashboardStyles.contactName} numberOfLines={1}>{personName}</Text>
        {contact.designation
          ? <Text style={dashboardStyles.contactRole} numberOfLines={1}>{contact.designation}</Text>
          : null}
        {contact.companyName
          ? <Text style={dashboardStyles.contactCompany} numberOfLines={1}>{contact.companyName}</Text>
          : null}
      </View>
      <View style={dashboardStyles.contactMeta}>
        {email ? (
          <View style={dashboardStyles.contactEmailBadge}>
            <Icon name="mail-outline" size={10} color={colors.amberDark} />
          </View>
        ) : null}
        {contact.createdDate
          ? <Text style={dashboardStyles.dateText}>{formatDate(contact.createdDate)}</Text>
          : null}
      </View>
    </TouchableOpacity>
  );
};

// ─── Dashboard Content Component ──────────────────────────────────────────────

const DashboardContent = ({
  summary,
  recentContacts,
  loading,
  error,
  fetchDashboard,
  profile,
  isAdmin,
  onContactPress,
  onScanPress,
  onContactsPress,
  onSettingsPress,
  onUsersPress,
  onScannedPress,
  onSharePress,
}: {
  summary: any;
  recentContacts: any[];
  loading: boolean;
  error: string | null;
  fetchDashboard: () => void;
  profile: any;
  isAdmin: boolean;
  onContactPress: (contact: any) => void;
  onScanPress: () => void;
  onContactsPress: () => void;
  onSettingsPress: () => void;
  onUsersPress: () => void;
  onScannedPress: () => void;
  onSharePress: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getUserFirstName = () => profile?.userName?.split(" ")[0] || "User";
  const getUserInitials = () => profile?.userName ? getInitials(profile.userName) : "U";
  const getUserAvatarColor = () => profile?.userName ? getAvatarColor(profile.userName) : colors.amber;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

 

  // For desktop, we separate header and scrollable content
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.phoneBg }}>
        {/* Fixed Header - Desktop Only */}
        <View style={dashboardStyles.desktopHeroSmall}>
          <View style={dashboardStyles.desktopHeroContentSmall}>
            <View>
              <Text style={dashboardStyles.desktopHeroGreetingSmall}>{greeting()} 👋</Text>
              <Text style={dashboardStyles.desktopHeroTitleSmall}>
                Welcome back, <Text style={dashboardStyles.desktopHeroNameSmall}>{getUserFirstName()}</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={onSettingsPress}
              activeOpacity={0.8}
              style={dashboardStyles.desktopHeroAvatarSmall}
            >
              <View style={[dashboardStyles.desktopAvatarSmall, { backgroundColor: getUserAvatarColor() }]}>
                <Text style={dashboardStyles.desktopAvatarTextSmall}>{getUserInitials()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.phoneBg }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchDashboard}
              colors={[colors.amber]}
              tintColor={colors.amber}
            />
          }
          contentContainerStyle={{
            paddingBottom: 40,
            backgroundColor: colors.phoneBg,
            flexGrow: 1,
          }}
        >
          {/* Content Container with max-width constraint for desktop */}
          <View style={{
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
            paddingHorizontal: 24,
          }}>
            {/* ── Scan CTA ── */}
            <TouchableOpacity
              style={dashboardStyles.scanCta}
              activeOpacity={0.85}
              onPress={onScanPress}
            >
              <View style={dashboardStyles.ctaIcon}>
                <Icon name="camera" size={22} color={colors.white} />
              </View>
              <View style={dashboardStyles.ctaText}>
                <Text style={dashboardStyles.ctaTitle}>Scan Business Card</Text>
                <Text style={dashboardStyles.ctaSub}>
                  {summary?.remainingScans
                    ? `${summary.remainingScans} scans remaining`
                    : profile?.remainingScans
                    ? `${profile.remainingScans} scans remaining`
                    : "Extract contact info in seconds"}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* ── Stats Grid ── */}
            <View style={dashboardStyles.statsGrid}>
              <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8} onPress={onContactsPress}>
                <View style={dashboardStyles.statBar} />
                <View style={dashboardStyles.statIcon}>
                  <Icon name="people" size={13} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.statValue}>{summary?.totalContactsCount ?? 0}</Text>
                <Text style={dashboardStyles.statLabel}>Contacts</Text>
                <View style={dashboardStyles.statBadge}>
                  <Icon name="people-outline" size={7} color={colors.partner} />
                  <Text style={dashboardStyles.statBadgeText}>All</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8} onPress={onScannedPress}>
                <View style={dashboardStyles.statBar} />
                <View style={dashboardStyles.statIcon}>
                  <Icon name="scan" size={13} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.statValue}>
                  {summary?.totalScansUsed ?? profile?.totalScansUsed ?? 0}
                </Text>
                <Text style={dashboardStyles.statLabel}>Scanned</Text>
                <View style={dashboardStyles.statBadge}>
                  <Icon name="scan-outline" size={7} color={colors.partner} />
                  <Text style={dashboardStyles.statBadgeText}>Used</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8}>
                <View style={dashboardStyles.statBar} />
                <View style={dashboardStyles.statIcon}>
                  <Icon name="download" size={13} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.statValue}>{summary?.totalExportsCount ?? 0}</Text>
                <Text style={dashboardStyles.statLabel}>Exports</Text>
                <View style={dashboardStyles.statBadge}>
                  <Icon name="download-outline" size={7} color={colors.partner} />
                  <Text style={dashboardStyles.statBadgeText}>All</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Quick Actions ── */}
            <View style={dashboardStyles.sectionHead}>
              <Text style={dashboardStyles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={dashboardStyles.quickRow}>
              <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onScanPress} activeOpacity={0.8}>
                <View style={dashboardStyles.quickIcon}>
                  <Icon name="camera" size={14} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.quickLabel}>Scan Card</Text>
              </TouchableOpacity>

              {isAdmin ? (
                <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onUsersPress} activeOpacity={0.8}>
                  <View style={dashboardStyles.quickIcon}>
                    <Icon name="people-outline" size={14} color={colors.amberDark} />
                  </View>
                  <Text style={dashboardStyles.quickLabel}>Users</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onSharePress} activeOpacity={0.8}>
                  <View style={dashboardStyles.quickIcon}>
                    <Icon name="share-social" size={14} color={colors.amberDark} />
                  </View>
                  <Text style={dashboardStyles.quickLabel}>Share</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onContactsPress} activeOpacity={0.8}>
                <View style={dashboardStyles.quickIcon}>
                  <Icon name="call-outline" size={14} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.quickLabel}>Contacts</Text>
              </TouchableOpacity>

              <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onSettingsPress} activeOpacity={0.8}>
                <View style={dashboardStyles.quickIcon}>
                  <Icon name="cog-outline" size={14} color={colors.amberDark} />
                </View>
                <Text style={dashboardStyles.quickLabel}>Settings</Text>
              </TouchableOpacity>
            </View>

            {/* ── Recent Contacts ── */}
            <View style={dashboardStyles.sectionHead}>
              <Text style={dashboardStyles.sectionTitle}>Recent Contacts</Text>
              <TouchableOpacity onPress={onContactsPress}>
                <Text style={dashboardStyles.sectionLink}>View all →</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={dashboardStyles.emptyState}>
                <Icon name="alert-circle-outline" size={36} color={colors.error} />
                <Text style={{ color: colors.error, textAlign: "center", marginTop: 8, fontSize: 13 }}>
                  {error}
                </Text>
                <TouchableOpacity onPress={fetchDashboard} style={dashboardStyles.emptyStateBtn}>
                  <Text style={{ color: colors.white, fontWeight: "700" }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : recentContacts.length === 0 ? (
              <View style={dashboardStyles.emptyState}>
                <Icon name="people-outline" size={40} color={colors.muted} />
                <Text style={dashboardStyles.emptyStateTitle}>No contacts yet</Text>
                <Text style={dashboardStyles.emptyStateSubtitle}>
                  Scan a business card to get started
                </Text>
                <TouchableOpacity style={dashboardStyles.emptyStateBtn} onPress={onScanPress}>
                  <Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={dashboardStyles.contactList}>
                {recentContacts.map((contact, index) => (
                  <ContactCard
                    key={`contact-${index}`}
                    contact={contact}
                    onPress={onContactPress}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
if (loading && !summary) {
  return (
    <View style={dashboardStyles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.amber} />
    </View>
  );
}
  // Mobile/Tablet layout (scrolls everything)
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.phoneBg }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchDashboard}
          colors={[colors.amber]}
          tintColor={colors.amber}
        />
      }
      contentContainerStyle={[
        {
          paddingBottom: 40,
          backgroundColor: colors.phoneBg,
          flexGrow: 1,
        },
      ]}
    >
      {/* Content Container with max-width constraint for tablet */}
      <View style={[
        (isTablet) && {
          maxWidth: 768,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: 16,
        }
      ]}>
        {/* Mobile Header */}
        <View style={dashboardStyles.header}>
          <View style={dashboardStyles.headerGlow1} />
          <View style={dashboardStyles.headerGlow2} />
          <View style={dashboardStyles.headerTop}>
            <View>
              <Text style={dashboardStyles.greetText}>{greeting()} 👋</Text>
              <Text style={dashboardStyles.titleText}>
                Welcome back,{"\n"}
                <Text style={dashboardStyles.titleSpan}>{getUserFirstName()}!</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={dashboardStyles.avatarContainer}
              onPress={onSettingsPress}
              activeOpacity={0.8}
            >
              <View style={[dashboardStyles.avatar, { backgroundColor: getUserAvatarColor() }]}>
                <Text style={dashboardStyles.avatarText}>{getUserInitials()}</Text>
              </View>
              <View style={dashboardStyles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scan CTA ── */}
        <TouchableOpacity
          style={dashboardStyles.scanCta}
          activeOpacity={0.85}
          onPress={onScanPress}
        >
          <View style={dashboardStyles.ctaIcon}>
            <Icon name="camera" size={22} color={colors.white} />
          </View>
          <View style={dashboardStyles.ctaText}>
            <Text style={dashboardStyles.ctaTitle}>Scan Business Card</Text>
            <Text style={dashboardStyles.ctaSub}>
              {summary?.remainingScans
                ? `${summary.remainingScans} scans remaining`
                : profile?.remainingScans
                ? `${profile.remainingScans} scans remaining`
                : "Extract contact info in seconds"}
            </Text>
          </View>
          <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* ── Stats Grid ── */}
        <View style={dashboardStyles.statsGrid}>
          <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8} onPress={onContactsPress}>
            <View style={dashboardStyles.statBar} />
            <View style={dashboardStyles.statIcon}>
              <Icon name="people" size={13} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.statValue}>{summary?.totalContactsCount ?? 0}</Text>
            <Text style={dashboardStyles.statLabel}>Contacts</Text>
            <View style={dashboardStyles.statBadge}>
              <Icon name="people-outline" size={7} color={colors.partner} />
              <Text style={dashboardStyles.statBadgeText}>All</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8} onPress={onScannedPress}>
            <View style={dashboardStyles.statBar} />
            <View style={dashboardStyles.statIcon}>
              <Icon name="scan" size={13} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.statValue}>
              {summary?.totalScansUsed ?? profile?.totalScansUsed ?? 0}
            </Text>
            <Text style={dashboardStyles.statLabel}>Scanned</Text>
            <View style={dashboardStyles.statBadge}>
              <Icon name="scan-outline" size={7} color={colors.partner} />
              <Text style={dashboardStyles.statBadgeText}>Used</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={dashboardStyles.statCard} activeOpacity={0.8}>
            <View style={dashboardStyles.statBar} />
            <View style={dashboardStyles.statIcon}>
              <Icon name="download" size={13} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.statValue}>{summary?.totalExportsCount ?? 0}</Text>
            <Text style={dashboardStyles.statLabel}>Exports</Text>
            <View style={dashboardStyles.statBadge}>
              <Icon name="download-outline" size={7} color={colors.partner} />
              <Text style={dashboardStyles.statBadgeText}>All</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={dashboardStyles.sectionHead}>
          <Text style={dashboardStyles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={dashboardStyles.quickRow}>
          <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onScanPress} activeOpacity={0.8}>
            <View style={dashboardStyles.quickIcon}>
              <Icon name="camera" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Scan Card</Text>
          </TouchableOpacity>

          {isAdmin ? (
            <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onUsersPress} activeOpacity={0.8}>
              <View style={dashboardStyles.quickIcon}>
                <Icon name="people-outline" size={14} color={colors.amberDark} />
              </View>
              <Text style={dashboardStyles.quickLabel}>Users</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onSharePress} activeOpacity={0.8}>
              <View style={dashboardStyles.quickIcon}>
                <Icon name="share-social" size={14} color={colors.amberDark} />
              </View>
              <Text style={dashboardStyles.quickLabel}>Share</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onContactsPress} activeOpacity={0.8}>
            <View style={dashboardStyles.quickIcon}>
              <Icon name="call-outline" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={dashboardStyles.quickBtn} onPress={onSettingsPress} activeOpacity={0.8}>
            <View style={dashboardStyles.quickIcon}>
              <Icon name="cog-outline" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Contacts ── */}
        <View style={dashboardStyles.sectionHead}>
          <Text style={dashboardStyles.sectionTitle}>Recent Contacts</Text>
          <TouchableOpacity onPress={onContactsPress}>
            <Text style={dashboardStyles.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={dashboardStyles.emptyState}>
            <Icon name="alert-circle-outline" size={36} color={colors.error} />
            <Text style={{ color: colors.error, textAlign: "center", marginTop: 8, fontSize: 13 }}>
              {error}
            </Text>
            <TouchableOpacity onPress={fetchDashboard} style={dashboardStyles.emptyStateBtn}>
              <Text style={{ color: colors.white, fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : recentContacts.length === 0 ? (
          <View style={dashboardStyles.emptyState}>
            <Icon name="people-outline" size={40} color={colors.muted} />
            <Text style={dashboardStyles.emptyStateTitle}>No contacts yet</Text>
            <Text style={dashboardStyles.emptyStateSubtitle}>
              Scan a business card to get started
            </Text>
            <TouchableOpacity style={dashboardStyles.emptyStateBtn} onPress={onScanPress}>
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>Scan Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={dashboardStyles.contactList}>
            {recentContacts.map((contact, index) => (
              <ContactCard
                key={`contact-${index}`}
                contact={contact}
                onPress={onContactPress}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// ─── Main Dashboard Screen ────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { summary, recentContacts, loading, error, fetchDashboard } = useDashboard();
  const { profile, loading: profileLoading } = useProfile();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchDashboard(); }, [])
  );
 const [roles, setRoles] = useState<string[] | null>(null);

  useEffect(() => {
    const loadRoles = async () => {
      const storedRoles = await getRoles();
      setRoles(storedRoles);
    };
    loadRoles();
  }, []);
  useEffect(() => {
    const checkRole = async () => {
      const roles = await getRoles();
      if (roles?.includes("Admin")) setIsAdmin(true);
    };
    checkRole();
  }, []);

  const handleContactPress = (contact: any) => {
    setSelectedContact(contact);
    setDetailVisible(true);
  };

  const handleScanPress = () => {
    // Check if device is desktop or tablet (non-mobile)
    if (!isMobile) {
      Toast.info("Scanning is only available on mobile devices. Please open this app on your phone to use the camera.");
      return;
    }
    router.push("/scan");
  };
  
  // app/dashboard/index.tsx - Updated handleContactsPress

  // Fixed: Use the isDesktop variable already declared at component level
  const handleContactsPress = () => {
    if (isDesktop) {
      router.push("/contacts-web");
    } else {
      router.push("/contacts");
    }
  };
  const handleSettingsPress = () => router.push("/settings");
  const handleUsersPress = () => router.push("/users");
  const handleScannedPress = () => {
      if (isDesktop) {
      router.push("/contacts-web");
    } else {
      router.push("/contacts");
    }
  };
  const handleSharePress = async () => {
    const totalContacts = summary?.totalContactsCount ?? 0;
    const scansUsed = summary?.totalScansUsed ?? profile?.totalScansUsed ?? 0;
    try {
      await Share.share({
        message:
          `📇 CardScan App\n\n` +
          `I'm using CardScan to digitize business cards instantly.\n` +
          `📊 ${totalContacts} contacts saved · ${scansUsed} cards scanned\n\n` +
          `Scan, save, and export contacts in seconds!`,
        title: "CardScan — Business Card Scanner",
      });
    } catch (e) { console.error(e); }
  };


  // Get user details for sidebar
  const getUserFullName = () => profile?.userName || "User";
  const getUserInitials = () => profile?.userName ? getInitials(profile.userName) : "U";
  const getUserAvatarColor = () => profile?.userName ? getAvatarColor(profile.userName) : colors.amber;

  return (
    <SidebarLayout
      isAdmin={isAdmin}
      userInitials={getUserInitials()}
      userAvatarColor={getUserAvatarColor()}
      userName={getUserFullName()}
       userRole={roles?.[0]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      
      <DashboardContent
        summary={summary}
        recentContacts={recentContacts}
        loading={loading}
        error={error}
        fetchDashboard={fetchDashboard}
        profile={profile}
        isAdmin={isAdmin}
        onContactPress={handleContactPress}
        onScanPress={handleScanPress}
        onContactsPress={handleContactsPress}
        onSettingsPress={handleSettingsPress}
        onUsersPress={handleUsersPress}
        onScannedPress={handleScannedPress}
        onSharePress={handleSharePress}
      />

      <ContactDetailModal
        contact={selectedContact}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </SidebarLayout>
  );
}