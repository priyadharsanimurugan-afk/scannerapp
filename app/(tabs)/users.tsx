import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, useWindowDimensions,
  Modal, TextInput, Alert, Platform,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { dashboardStyles } from "@/components/styles/dashboardStyles";
import { colors } from "@/constants/colors";
import { getAllUsers, upgradeUser, downgradeUser } from "@/services/users";
import { SidebarLayout } from "../sidebar";
import { Toast } from "@/components/webalert";
import { getRoles } from "@/utils/tokenStorage";
import { useProfile } from "@/hooks/useProfile";
import { useAdminPremiumRequests, useReviewPremiumRequest } from "@/hooks/useAdminPremium";
import { Ionicons } from "@expo/vector-icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const confirm = (title: string, msg: string, onOk: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${msg}`)) onOk();
  } else {
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onOk },
    ]);
  }
};

const getItemsPerPage = (width: number) => {
  if (width >= 1440) return 12;
  if (width >= 1024) return 10;
  if (width >= 768) return 8;
  return 6;
};

const paginate = <T,>(arr: T[], page: number, perPage: number) =>
  arr.slice((page - 1) * perPage, page * perPage);

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "Invalid date";

    // Convert to IST manually (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    return istDate.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid date";
  }
};


// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon, title, message, isMobile }: {
  icon: string; title: string; message: string; isMobile: boolean;
}) => (
  <View style={[s.emptyContainer, isMobile && s.emptyContainerMobile]}>
    <Text style={[s.emptyIcon, isMobile && { fontSize: 48 }]}>{icon}</Text>
    <Text style={[s.emptyTitle, isMobile && { fontSize: 18 }]}>{title}</Text>
    <Text style={[s.emptyMessage, isMobile && { fontSize: 12, maxWidth: 250 }]}>{message}</Text>
  </View>
);

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ page, total, onChange }: {
  page: number; total: number; onChange: (p: number) => void;
}) =>
  total > 1 ? (
    <View style={s.pageRow}>
      <TouchableOpacity disabled={page === 1} onPress={() => onChange(page - 1)}
        style={[s.pageBtn, page === 1 && s.pageBtnOff]}>
        <Text style={s.pageTxt}>‹ Prev</Text>
      </TouchableOpacity>
      <Text style={s.pageInfo}>{page} / {total}</Text>
      <TouchableOpacity disabled={page === total} onPress={() => onChange(page + 1)}
        style={[s.pageBtn, page === total && s.pageBtnOff]}>
        <Text style={s.pageTxt}>Next ›</Text>
      </TouchableOpacity>
    </View>
  ) : null;

// ─── Review Modal ─────────────────────────────────────────────────────────────

const ReviewModal = ({ visible, request, loading, onClose, onSubmit }: {
  visible: boolean; request: any; loading: boolean;
  onClose: () => void; onSubmit: (approve: boolean, remark: string) => void;
}) => {
  const [remark, setRemark] = useState("");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const rows: [string, string][] = request ? [
    ["User", request.userName],
    ["Email", request.email],
    ["Phone", request.phoneNumber],
    ["Plan", request.accountType],
    ...(request.message ? [["Message", request.message] as [string, string]] : []),
    ...(request.paymentReference ? [["Payment Ref", request.paymentReference] as [string, string]] : []),
  ] : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={[s.card, isMobile && s.cardMobile]}>
                <Text style={s.modalTitle}>Review Premium Request</Text>

                <ScrollView
                  style={{ maxHeight: isMobile ? 380 : 500 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  {rows.map(([label, value]) => (
                    <View key={label} style={s.infoRow}>
                      <Text style={s.infoLabel}>{label}</Text>
                      <Text style={[s.infoValue, isMobile && { maxWidth: "55%", fontSize: 12 }]}
                        numberOfLines={2}>{value}</Text>
                    </View>
                  ))}

                  <Text style={s.remarkLabel}>Admin Remark</Text>
                  <TextInput
                    style={[s.input, isMobile && s.inputMobile]}
                    value={remark}
                    onChangeText={setRemark}
                    placeholder="Enter remarks..."
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    multiline
                    numberOfLines={isMobile ? 3 : 4}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </ScrollView>

                <View style={[s.btnRow, isMobile && { gap: 8 }]}>
                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: "#ef4444" }, isMobile && s.btnMobile]}
                    onPress={() => onSubmit(false, remark)} disabled={loading}>
                    <Text style={s.btnTxt}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: "#10b981" }, isMobile && s.btnMobile]}
                    onPress={() => onSubmit(true, remark)} disabled={loading}>
                    <Text style={s.btnTxt}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: "rgba(0,0,0,0.1)" }, isMobile && s.btnMobile]}
                    onPress={onClose} disabled={loading}>
                    <Text style={s.btnTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.amber} />}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Card Components ──────────────────────────────────────────────────────────

const Avatar = ({ letter, bg, isMobile }: { letter: string; bg: string; isMobile: boolean }) => (
  <View style={[
    dashboardStyles.contactAvatar,
    { backgroundColor: bg, alignSelf: "flex-start", marginTop: 2 },
    isMobile && { width: 40, height: 40, borderRadius: 20 },
  ]}>
    <Text style={[dashboardStyles.contactAvatarText, isMobile && { fontSize: 18 }]}>
      {letter?.toUpperCase() || "U"}
    </Text>
  </View>
);

const CardRow = ({ label, value, isMobile, numberOfLines = 1 }: {
  label?: string; value: string; isMobile: boolean; numberOfLines?: number;
}) => (
  <Text style={[dashboardStyles.contactRole, isMobile && s.mobileMetaText]} numberOfLines={numberOfLines}>
    {label ? <Text style={s.metaLabel}>{label}: </Text> : null}{value}
  </Text>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "approved" | "rejected" | "requests">("users");
  const [userPage, setUserPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [roles, setRoles] = useState<string[] | null>(null);

  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const { profile } = useProfile();
  const { data: requests, loading: reqLoading, fetchRequests } = useAdminPremiumRequests();
  const { review, loading: reviewLoading } = useReviewPremiumRequest();

  const itemsPerPage = getItemsPerPage(width);
  const approvedRequests = requests.filter(r => r.status === "Approved");
  const rejectedRequests = requests.filter(r => r.status === "Rejected");
  const pendingRequests  = requests.filter(r => r.status === "Pending");

  useEffect(() => { getRoles().then(setRoles); }, []);
  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => Toast.error("Failed to fetch users"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = (name: string, id: string) =>
    confirm("Upgrade User", `Upgrade ${name} to Premium?`, async () => {
      try {
        await upgradeUser(id);
        setUsers(u => u.map(x => x.id === id ? { ...x, accountType: "Premium" } : x));
        Toast.success(`${name} upgraded!`);
      } catch { Toast.error("Upgrade failed."); }
    });

  const handleDowngrade = (name: string, id: string) =>
    confirm("Downgrade User", `Downgrade ${name} to Free?`, async () => {
      try {
        await downgradeUser(id);
        setUsers(u => u.map(x => x.id === id ? { ...x, accountType: "Free" } : x));
        Toast.success(`${name} downgraded!`);
      } catch { Toast.error("Downgrade failed."); }
    });

  const handleReview = async (approve: boolean, remark: string) => {
    if (!selectedReq) return;
    try {
      await review(selectedReq.id, approve, remark);
      if (approve) {
        setUsers(prev => prev.map(u =>
          u.id === selectedReq.userId ? { ...u, accountType: "Premium" } : u
        ));
      }
      Toast.success(`Request ${approve ? "approved" : "rejected"}!`);
      setSelectedReq(null);
      fetchRequests();
    } catch { Toast.error("Failed to process request."); }
  };

  const isLoading = loading || (tab === "requests" && reqLoading);

  // ─── Card Renders ────────────────────────────────────────────────────────────

  const renderUserCard = (user: any) => (
    <View key={user.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard]}>
      <Avatar letter={user.userName?.[0]} bg={colors.navy} isMobile={isMobile} />
      <View style={s.cardBody}>
        <Text style={[dashboardStyles.contactName, isMobile && s.mobileCardName]} numberOfLines={1}>
          {user.userName || "Unnamed"}
        </Text>
    
        <View style={s.badgeRow}>
          <View style={[s.planBadge, user.accountType === "Premium" && s.planBadgePremium]}>
            <Text style={[s.planBadgeTxt, user.accountType === "Premium" && s.planBadgeTxtPremium]}>
              {user.accountType || "Free"}
            </Text>
          </View>
          <Text style={[dashboardStyles.remainingScans, isMobile && s.mobileMetaText]}>
            {user.remainingScans || 0} scans left
          </Text>
            <CardRow value={user.email || "No email"} isMobile={isMobile} numberOfLines={1} />
        </View>
      </View>
      <View style={s.cardAction}>
        {user.accountType === "Premium" ? (
          <TouchableOpacity style={[dashboardStyles.downgradeButton, isMobile && s.mobileActionBtn]}
            onPress={() => handleDowngrade(user.userName, user.id)}>
            <Text style={[dashboardStyles.buttonText, isMobile && s.mobileActionTxt]}>Downgrade</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[dashboardStyles.upgradeButton, isMobile && s.mobileActionBtn]}
            onPress={() => handleUpgrade(user.userName, user.id)}>
            <Text style={[dashboardStyles.buttonText, isMobile && s.mobileActionTxt]}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

 const renderApprovedCard = (req: any) => (
  <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard, s.approvedCard]}>
    <Avatar letter={req.userName?.[0]} bg="#10b981" isMobile={isMobile} />
    <View style={s.cardBody}>
      <View style={s.nameRowWithBadge}>
        <Text style={[dashboardStyles.contactName, isMobile && s.mobileCardName, { flex: 1 }]} numberOfLines={1}>
          {req.userName || "Unnamed"}
        </Text>
        <View style={s.approvedBadge}><Text style={s.approvedBadgeTxt}>✓ Approved</Text></View>
      </View>
      <CardRow value={req.email || "No email"} isMobile={isMobile} />
      {req.phoneNumber && <CardRow label="Phone" value={req.phoneNumber} isMobile={isMobile} />}
      <CardRow label="Upgraded to" value={req.accountType === "Premium" ? "Premium Plan" : "Free Plan"} isMobile={isMobile} />
      {req.message && <CardRow label="Message" value={req.message} isMobile={isMobile} numberOfLines={2} />}
      {req.paymentReference && <CardRow label="Payment Ref" value={req.paymentReference} isMobile={isMobile} />}
      {req.adminRemark && <CardRow label="Admin Remark" value={req.adminRemark} isMobile={isMobile} numberOfLines={2} />}
      <CardRow label="Reviewed On" value={formatDate(req.reviewedAtUtc)} isMobile={isMobile} />
    </View>
  </View>
);

const renderRejectedCard = (req: any) => (
  <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard, s.rejectedCard]}>
    <Avatar letter={req.userName?.[0]} bg="#ef4444" isMobile={isMobile} />
    <View style={s.cardBody}>
      <View style={s.nameRowWithBadge}>
        <Text style={[dashboardStyles.contactName, isMobile && s.mobileCardName, { flex: 1 }]} numberOfLines={1}>
          {req.userName || "Unnamed"}
        </Text>
        <View style={s.rejectedBadge}><Text style={s.rejectedBadgeTxt}>✗ Rejected</Text></View>
      </View>
      <CardRow value={req.email || "No email"} isMobile={isMobile} />
      {req.phoneNumber && <CardRow label="Phone" value={req.phoneNumber} isMobile={isMobile} />}
      <CardRow label="Requested" value={req.accountType === "Premium" ? "Premium Plan" : "Free Plan"} isMobile={isMobile} />
      {req.message && <CardRow label="Message" value={req.message} isMobile={isMobile} numberOfLines={2} />}
      {req.paymentReference && <CardRow label="Payment Ref" value={req.paymentReference} isMobile={isMobile} />}
      {req.adminRemark && <CardRow label="Rejection Reason" value={req.adminRemark} isMobile={isMobile} numberOfLines={2} />}
      <CardRow label="Reviewed On" value={formatDate(req.reviewedAtUtc)} isMobile={isMobile} />
    </View>
  </View>
);

  const renderRequestCard = (req: any) => (
    <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard]}>
      <Avatar letter={req.userName?.[0]} bg={colors.navy} isMobile={isMobile} />
      <View style={s.cardBody}>
        <Text style={[dashboardStyles.contactName, isMobile && s.mobileCardName]} numberOfLines={1}>
          {req.userName || "Unnamed"}
        </Text>
        <CardRow value={req.email} isMobile={isMobile} />
        <CardRow label="Requesting" value={req.accountType === "Premium" ? "Premium Plan" : "Free Plan"} isMobile={isMobile} />
        {req.message && <CardRow label="Msg" value={req.message} isMobile={isMobile} numberOfLines={2} />}
        {req.paymentReference && <CardRow label="Ref" value={req.paymentReference} isMobile={isMobile} />}
        <CardRow label="Date" value={formatDate(req.createdAtUtc)} isMobile={isMobile}   numberOfLines={2}/>
      </View>
      <View style={s.cardAction}>
        <TouchableOpacity
          style={[dashboardStyles.upgradeButton, { backgroundColor: colors.amber }, isMobile && s.mobileActionBtn]}
          onPress={() => setSelectedReq(req)}>
          <Text style={[dashboardStyles.buttonText, isMobile && s.mobileActionTxt]}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Tab Helper ──────────────────────────────────────────────────────────────

  const Section = ({ title, count, children, page, total, onPage }: {
    title: string; count: number; children: React.ReactNode;
    page: number; total: number; onPage: (p: number) => void;
  }) => (
    <>
      <View style={[dashboardStyles.sectionHead, isMobile && { marginBottom: 16, paddingHorizontal: 8 }]}>
        <Text style={[dashboardStyles.sectionTitle, isMobile && { fontSize: 20 }]}>{title}</Text>
        <Text style={[dashboardStyles.sectionSubtitle, isMobile && { fontSize: 13 }]}>Total: {count}</Text>
      </View>
      <View style={[dashboardStyles.contactList, isMobile && { gap: 10 }]}>{children}</View>
      <Pagination page={page} total={total} onChange={onPage} />
    </>
  );

  // ─── Content ─────────────────────────────────────────────────────────────────

  const content = (
    <View style={[dashboardStyles.container, isDesktop && { backgroundColor: colors.phoneBg }]}>
      {/* Header */}
      <View style={dashboardStyles.header}>
        <View style={dashboardStyles.headerGlow1} />
        <View style={dashboardStyles.headerGlow2} />
        <View style={dashboardStyles.headerTop}>
          <View>
            <Text style={[dashboardStyles.greetText, isMobile && { fontSize: 13 }]}>Admin Panel</Text>
            <Text style={[dashboardStyles.titleText, isMobile && { fontSize: 24 }]}>
              Manage <Text style={dashboardStyles.titleSpan}>Users</Text>
            </Text>
            {!isDesktop && (
              <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.amber, fontSize: isMobile ? 12 : 14 }}>← Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[s.tabsWrapper, isMobile && { marginTop: -10, marginBottom: 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsScrollContainer}>
          {([
            { key: "users",    label: `Users (${users.length})`,             active: s.tabActive },
            { key: "requests", label: `Pending (${pendingRequests.length})`, active: s.tabActiveRequests },
            { key: "approved", label: `Approved (${approvedRequests.length})`, active: s.tabActiveApproved },
            { key: "rejected", label: `Rejected (${rejectedRequests.length})`, active: s.tabActiveRejected },
          ] as const).map(({ key, label, active }) => (
            <TouchableOpacity key={key}
              style={[s.tab, tab === key && active, isMobile && s.tabMobile]}
              onPress={() => { setTab(key); }}>
              <Text style={[s.tabTxt, tab === key && s.tabTxtActive, isMobile && { fontSize: 12 }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <ActivityIndicator size="large" color={colors.amber} />
        </View>
      ) : (
        <ScrollView
          style={[dashboardStyles.body, isDesktop && { maxWidth: 1200, alignSelf: "center", width: "100%" }]}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: isMobile ? 12 : 16 }}>

          {tab === "users" && (
            <Section title="All Users" count={users.length}
              page={userPage} total={Math.ceil(users.length / itemsPerPage)} onPage={setUserPage}>
              {users.length > 0
                ? paginate(users, userPage, itemsPerPage).map(renderUserCard)
                : <EmptyState icon="👥" title="No Users Found"
                    message="There are no users registered in the system yet." isMobile={isMobile} />}
            </Section>
          )}

          {tab === "requests" && (
            <Section title="Pending Requests" count={pendingRequests.length}
              page={reqPage} total={Math.ceil(pendingRequests.length / itemsPerPage)} onPage={setReqPage}>
              {pendingRequests.length > 0
                ? paginate(pendingRequests, reqPage, itemsPerPage).map(renderRequestCard)
                : <EmptyState icon="⏳" title="No Pending Requests"
                    message="No pending premium upgrade requests at the moment." isMobile={isMobile} />}
            </Section>
          )}

          {tab === "approved" && (
            <Section title="Approved Requests" count={approvedRequests.length}
              page={approvedPage} total={Math.ceil(approvedRequests.length / itemsPerPage)} onPage={setApprovedPage}>
              {approvedRequests.length > 0
                ? paginate(approvedRequests, approvedPage, itemsPerPage).map(renderApprovedCard)
                : <EmptyState icon="✅" title="No Approved Requests"
                    message="No premium upgrade requests have been approved yet." isMobile={isMobile} />}
            </Section>
          )}

          {tab === "rejected" && (
            <Section title="Rejected Requests" count={rejectedRequests.length}
              page={rejectedPage} total={Math.ceil(rejectedRequests.length / itemsPerPage)} onPage={setRejectedPage}>
              {rejectedRequests.length > 0
                ? paginate(rejectedRequests, rejectedPage, itemsPerPage).map(renderRejectedCard)
                : <EmptyState icon="❌" title="No Rejected Requests"
                    message="No premium upgrade requests have been rejected yet." isMobile={isMobile} />}
            </Section>
          )}
        </ScrollView>
      )}

      <ReviewModal
        visible={!!selectedReq}
        request={selectedReq}
        loading={reviewLoading}
        onClose={() => setSelectedReq(null)}
        onSubmit={handleReview}
      />
    </View>
  );

  return isDesktop ? (
    <SidebarLayout isAdmin userInitials="A" userAvatarColor={colors.amber}
      userName={profile?.userName || "Admin"} userRole={roles?.[0]}>
      {content}
    </SidebarLayout>
  ) : content;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: any = {
  // Tabs
  tabsWrapper: { width: "100%", marginTop: 16, marginBottom: 16 },
  tabsScrollContainer: { paddingHorizontal: 16, gap: 12 },
  tab: {
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.85)", minWidth: 100, alignItems: "center",
  },
  tabMobile: { paddingVertical: 8, paddingHorizontal: 16, minWidth: 90 },
  tabActive:         { backgroundColor: "#f59f0a" },
  tabActiveApproved: { backgroundColor: "#10b981" },
  tabActiveRequests: { backgroundColor: "#3b82f6" },
  tabActiveRejected: { backgroundColor: "#ef4444" },
  tabTxt: { color: "rgba(0,0,0,0.7)", fontSize: 14, fontWeight: "600" },
  tabTxtActive: { color: "#fff" },

  // Mobile card layout — row with avatar top-aligned at start
  mobileCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardAction: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 2,
  },
  mobileCardName: {
    fontSize: 15,
    marginBottom: 2,
  },
  mobileMetaText: {
    fontSize: 12,
  },
  metaLabel: {
    color: "rgba(0,0,0,0.55)",
    fontWeight: "600",
  },
  mobileActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 84,
  },
  mobileActionTxt: {
    fontSize: 12,
  },

  // Badge row inside user card
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  planBadge: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  planBadgePremium: {
    backgroundColor: "rgba(245,159,10,0.15)",
  },
  planBadgeTxt: {
    color: "rgba(0,0,0,0.65)",
    fontSize: 11,
    fontWeight: "600",
  },
  planBadgeTxtPremium: {
    color: "#f59f0a",
  },

  // Status badges
  nameRowWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  approvedBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  approvedBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "600" },
  rejectedBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rejectedBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "600" },

  // Card accent borders
  approvedCard: { borderLeftWidth: 3, borderLeftColor: "#10b981" },
  rejectedCard:  { borderLeftWidth: 3, borderLeftColor: "#ef4444" },

  rejectedIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center", alignItems: "center",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 60, paddingHorizontal: 20,
  },
  emptyContainerMobile: { paddingVertical: 40 },
  emptyIcon:    { fontSize: 64, marginBottom: 16, opacity: 0.7 },
  emptyTitle:   { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 8, textAlign: "center" },
  emptyMessage: { fontSize: 14, color: "rgba(0,0,0,0.5)", textAlign: "center", maxWidth: 300 },

  // Pagination
  pageRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 16, marginTop: 16, flexWrap: "wrap", paddingHorizontal: 16,
  },
  pageBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#f59f0a", minWidth: 80, alignItems: "center",
  },
  pageBtnOff: { backgroundColor: "rgba(0,0,0,0.08)", opacity: 0.5 },
  pageTxt:    { color: "#4b4a4a", fontWeight: "600", fontSize: 14 },
  pageInfo:   { color: "#333", fontSize: 13 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center", padding: 16,
  },
  card: {
    backgroundColor: "#fff", borderRadius: 24, padding: 24,
    width: "90%", maxWidth: 480,
    borderWidth: 1, borderColor: "rgba(245,159,10,0.2)",
  },
  cardMobile: { padding: 16, width: "95%", maxHeight: "92%" },
  modalTitle: {
    fontSize: 20, fontWeight: "700", color: "#f59f0a",
    textAlign: "center", marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    flexWrap: "wrap", gap: 8,
  },
  infoLabel: { color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: "600" },
  infoValue: {
    color: "#333", fontSize: 13, fontWeight: "500",
    maxWidth: "60%", textAlign: "right", flex: 1,
  },
  remarkLabel: {
    color: "#333", fontSize: 13, fontWeight: "600",
    marginTop: 16, marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 12, padding: 12,
    color: "#333", fontSize: 14, minHeight: 80, textAlignVertical: "top",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.15)",
  },
  inputMobile: { minHeight: 70, fontSize: 13 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20, flexWrap: "wrap" },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", minWidth: 90 },
  btnMobile: { paddingVertical: 10 },
  btnTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },
};