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
  Alert,
  Linking,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { dashboardStyles } from "@/components/styles/dashboardStyles";
import { colors } from "@/constants/colors";
import { useDashboard } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { exportAndShareContacts } from "@/utils/exportcontacts";
import { LinearGradient } from 'expo-linear-gradient';
// ^^^ Import the new helper instead of using exportContacts + FileSystem directly.
//     This removes the FileSystem.EncodingType / cacheDirectory TS errors entirely.

// ─── Types ────────────────────────────────────────────────────────────────────
// If RecentContact is defined in your types/dashboard.ts, make sure `id` is there.
// Add this to your RecentContact interface if it's missing:
//   id?: number | string;
// The API may not return it on the recent-contacts endpoint, so keep it optional.

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const formatFullDate = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Contact Detail Modal ─────────────────────────────────────────────────────

// app/dashboard/index.tsx - Updated Modal Section

// ─── Contact Detail Modal (Redesigned) ─────────────────────────────────────

// app/dashboard/index.tsx - Updated Modal Section

// ─── Contact Detail Modal (Redesigned) ─────────────────────────────────────

const ContactDetailModal = ({
  contact,
  visible,
  onClose,
}: {
  contact: any;
  visible: boolean;
  onClose: () => void;
}) => {
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={ms.safeArea}>

        {/* ── Top bar ── */}
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

          {/* ── Identity row ── */}
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

          {/* ── Action buttons ── */}
          <View style={ms.actionRow}>
            {phone ? (
              <TouchableOpacity style={[ms.actionBtn, ms.actionPrimary]} onPress={() => handlePhone(phone)} activeOpacity={0.85}>
                <Icon name="call" size={18} color={colors.white} />
                <Text style={[ms.actionLabel, { color: colors.white }]}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {email ? (
              <TouchableOpacity style={[ms.actionBtn, ms.actionBlue]} onPress={handleEmail} activeOpacity={0.85}>
                <Icon name="mail" size={18} color={colors.white} />
                <Text style={[ms.actionLabel, { color: colors.white }]}>Email</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[ms.actionBtn, ms.actionOutline]} onPress={handleShare} activeOpacity={0.85}>
              <Icon name="share-social-outline" size={18} color={colors.text} />
              <Text style={[ms.actionLabel, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* ── Details card ── */}
          <View style={ms.card}>
            <Text style={ms.cardTitle}>Contact information</Text>

            {phone ? (
              <TouchableOpacity style={ms.row} onPress={() => handlePhone(phone)} activeOpacity={0.7}>
                <View style={[ms.rowIcon, { backgroundColor: '#E8F0FE' }]}>
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
              <TouchableOpacity style={ms.row} onPress={() => handlePhone(secondaryPhone)} activeOpacity={0.7}>
                <View style={[ms.rowIcon, { backgroundColor: '#F1F3F4' }]}>
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
              <TouchableOpacity style={ms.row} onPress={handleEmail} activeOpacity={0.7}>
                <View style={[ms.rowIcon, { backgroundColor: '#FFE8E8' }]}>
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
                <View style={[ms.rowIcon, { backgroundColor: '#E6F4EA' }]}>
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
                activeOpacity={0.7}
              >
                <View style={[ms.rowIcon, { backgroundColor: '#FFF4E5' }]}>
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

          {/* ── Extra info ── */}
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

          {/* ── Timestamp ── */}
          {contact.createdDate ? (
            <Text style={ms.timestamp}>Added {formatDate(contact.createdDate)}</Text>
          ) : null}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const ms = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    marginTop: StatusBar.currentHeight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  designation: {
    fontSize: 13,
    color: '#555',
    marginBottom: 1,
  },
  company: {
    fontSize: 12,
    color: '#888',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  actionPrimary: { backgroundColor: colors.navy },
  actionBlue: { backgroundColor: colors.amber },
  actionOutline: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAA',
    paddingVertical: 12,
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

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { summary, recentContacts, loading, error, fetchDashboard } = useDashboard();
  const { profile, loading: profileLoading } = useProfile();

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

 useFocusEffect(
  useCallback(() => {
    fetchDashboard();
  }, [])
);


  const onRefresh = () => fetchDashboard();

  const getUserFirstName   = () => profile?.userName?.split(" ")[0] || "User";
  const getUserInitials    = () => profile?.userName ? getInitials(profile.userName) : "U";
  const getUserAvatarColor = () => profile?.userName ? getAvatarColor(profile.userName) : colors.amber;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const goToContacts = () => router.push("/contacts");
  const goToSettings = () => router.push("/settings");
  const goToScanned  = () => router.push("/contacts?filter=scanned");
  const goToScan     = () => router.push("/scan");

  // ── Export CSV ──
  // Uses exportAndShareContacts() which casts FileSystem internals to avoid
  // the EncodingType / cacheDirectory TS errors on this expo-file-system version.


  // ── Share app ──
  const handleShare = async () => {
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

  const handleContactPress = (contact: any) => {
    setSelectedContact(contact);
    setDetailVisible(true);
  };

  if ((loading && !summary && recentContacts.length === 0) || profileLoading) {
    return (
      <View style={[dashboardStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={dashboardStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      <ScrollView
        style={dashboardStyles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
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
        {/* ── Header ── */}
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
              onPress={() => router.push("/settings")}
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
          onPress={goToScan}
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

        {/* ── Stats ── */}
        <View style={dashboardStyles.statsGrid}>
          <TouchableOpacity
            style={dashboardStyles.statCard}
            activeOpacity={0.8}
            onPress={goToContacts}
          >
            <View style={dashboardStyles.statBar} />
            <View style={dashboardStyles.statIcon}>
              <Icon name="people" size={13} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.statValue}>
              {summary?.totalContactsCount ?? 0}
            </Text>
            <Text style={dashboardStyles.statLabel}>Contacts</Text>
            <View style={dashboardStyles.statBadge}>
              <Icon name="people-outline" size={7} color={colors.partner} />
              <Text style={dashboardStyles.statBadgeText}>All</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.statCard}
            activeOpacity={0.8}
            onPress={goToScanned}
          >
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

          <TouchableOpacity
            style={dashboardStyles.statCard}
            activeOpacity={0.8}
            
          >
            <View style={dashboardStyles.statBar} />
            <View style={dashboardStyles.statIcon}>
              <Icon name="download" size={13} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.statValue}>
              {summary?.totalExportsCount ?? 0}
            </Text>
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
          <TouchableOpacity
            style={dashboardStyles.quickBtn}
            onPress={goToScan}
            activeOpacity={0.8}
          >
            <View style={dashboardStyles.quickIcon}>
              <Icon name="camera" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Scan Card</Text>
          </TouchableOpacity>
{/* 
          <TouchableOpacity
            style={dashboardStyles.quickBtn}
            onPress={handleExportCSV}
            disabled={exportLoading}
            activeOpacity={0.8}
          >
            <View style={dashboardStyles.quickIcon}>
              {exportLoading
                ? <ActivityIndicator size="small" color={colors.amberDark} />
                : <Icon name="document-text" size={14} color={colors.amberDark} />}
            </View>
            <Text style={dashboardStyles.quickLabel}>
              {exportLoading ? "..." : "Export CSV"}
            </Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={dashboardStyles.quickBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <View style={dashboardStyles.quickIcon}>
              <Icon name="share-social" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.quickBtn}
            onPress={goToContacts}
            activeOpacity={0.8}
          >
            <View style={dashboardStyles.quickIcon}>
              <Icon name="people-outline" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Contacts</Text>
          </TouchableOpacity>
            <TouchableOpacity
            style={dashboardStyles.quickBtn}
            onPress={goToSettings}
            activeOpacity={0.8}
          >
            <View style={dashboardStyles.quickIcon}>
              <Icon name="cog-outline" size={14} color={colors.amberDark} />
            </View>
            <Text style={dashboardStyles.quickLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Contacts ── */}
        <View style={dashboardStyles.sectionHead}>
          <Text style={dashboardStyles.sectionTitle}>Recent Contacts</Text>
          <TouchableOpacity onPress={goToContacts}>
            <Text style={dashboardStyles.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={dashboardStyles.emptyState}>
            <Icon name="alert-circle-outline" size={36} color={colors.error} />
            <Text style={{ color: colors.error, textAlign: "center", marginTop: 8, fontSize: 13 }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={fetchDashboard}
              style={dashboardStyles.emptyStateBtn}
            >
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
            <TouchableOpacity style={dashboardStyles.emptyStateBtn} onPress={goToScan}>
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>
                Scan Now
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={dashboardStyles.contactList}>
            {/* FIX: use index as fallback key since RecentContact.id is optional */}
            {recentContacts.map((contact, index) => (
              <ContactCard
                key={`contact-${index}`}
                contact={contact}
                onPress={handleContactPress}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ContactDetailModal
        contact={selectedContact}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}