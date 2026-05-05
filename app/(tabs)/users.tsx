import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  useWindowDimensions, Modal, TextInput, Alert, Platform,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Image
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
import { useAdminContacts } from "@/hooks/useAdminContacts";
import { useContact } from "@/hooks/useContact";
import { Ionicons } from "@expo/vector-icons";

const C = { navy:"#131C30", amber:"#F59F0A", amberDark:"#D97706", green:"#10b981", red:"#ef4444" };

const ITEMS_PER_PAGE = 10;

const confirmAction = (title: string, msg: string, onOk: () => void) => {
  if (Platform.OS === "web") { if (window.confirm(`${title}\n${msg}`)) onOk(); }
  else Alert.alert(title, msg, [{ text:"Cancel", style:"cancel" }, { text:"OK", onPress:onOk }]);
};

const paginate = <T,>(arr: T[], p: number, pp: number) => arr.slice((p-1)*pp, p*pp);

const formatDate = (d: string) => {
  if (!d) return "N/A";
  try {
    const dt = new Date(new Date(d).getTime() + 5.5*3600000);
    return dt.toLocaleString("en-IN", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:true });
  } catch { return "Invalid date"; }
};

const EmptyState = ({ icon, title, msg, isMobile }: any) => (
  <View style={[s.emptyBox, isMobile && { paddingVertical:32 }]}>
    <View style={s.emptyIcon}><Ionicons name={icon} size={isMobile?32:42} color={C.navy} /></View>
    <Text style={[s.emptyTitle, isMobile && { fontSize:16 }]}>{title}</Text>
    <Text style={[s.emptyMsg, isMobile && { fontSize:12 }]}>{msg}</Text>
  </View>
);

const Pager = ({ page, total, onChange }: { page:number; total:number; onChange:(p:number)=>void }) =>
  total > 1 ? (
    <View style={s.pageRow}>
      <TouchableOpacity disabled={page===1} onPress={() => onChange(page-1)} style={[s.pageBtn, page===1 && s.pageDim]}>
        <Ionicons name="chevron-back" size={13} color={page===1?"rgba(0,0,0,0.3)":C.navy} />
        <Text style={[s.pageTxt, page===1 && { color:"rgba(0,0,0,0.3)" }]}>Prev</Text>
      </TouchableOpacity>
      <Text style={s.pageInfo}>{page} / {total}</Text>
      <TouchableOpacity disabled={page===total} onPress={() => onChange(page+1)} style={[s.pageBtn, page===total && s.pageDim]}>
        <Text style={[s.pageTxt, page===total && { color:"rgba(0,0,0,0.3)" }]}>Next</Text>
        <Ionicons name="chevron-forward" size={13} color={page===total?"rgba(0,0,0,0.3)":C.navy} />
      </TouchableOpacity>
    </View>
  ) : null;

// ── Image Full View ──
const ImageViewModal = ({ uri, onClose }: { uri:string|null; onClose:()=>void }) => (
  <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={s.imgViewOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={s.imgViewWrap}>
        <TouchableOpacity style={s.imgViewClose} onPress={onClose}>
          <Ionicons name="close-circle" size={32} color="#fff" />
        </TouchableOpacity>
        {uri && <Image source={{ uri }} style={s.imgViewFull} resizeMode="contain" />}
        <Text style={{ color:"rgba(255,255,255,0.4)", fontSize:11, textAlign:"center", marginTop:8 }}>Tap anywhere to close</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

// ── Review Modal ──
const ReviewModal = ({ visible, request, loading, onClose, onSubmit }: any) => {
  const [remark, setRemark] = useState("");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const rows: [string,string][] = request ? [
    ["User", request.userName], ["Email", request.email],
    ["Phone", request.phoneNumber], ["Plan", request.accountType],
    ...(request.message ? [["Message", request.message] as [string,string]] : []),
    ...(request.paymentReference ? [["Payment Ref", request.paymentReference] as [string,string]] : []),
  ] : [];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==="ios"?"padding":"height"}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={[s.reviewCard, isMobile && s.reviewCardMob]}>
                <View style={{ flexDirection:"row", alignItems:"center", gap:8, justifyContent:"center", marginBottom:16 }}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={C.amber} />
                  <Text style={s.modalTitle}>Review Premium Request</Text>
                </View>
                <ScrollView style={{ maxHeight:isMobile?340:460 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {rows.map(([l,v]) => (
                    <View key={l} style={s.infoRow}>
                      <Text style={s.infoLabel}>{l}</Text>
                      <Text style={[s.infoValue, isMobile && { maxWidth:"55%", fontSize:12 }]} numberOfLines={2}>{v}</Text>
                    </View>
                  ))}
                  <Text style={s.remarkLabel}>Admin Remark</Text>
                  <TextInput style={[s.input, isMobile && { minHeight:60, fontSize:13 }]}
                    value={remark} onChangeText={setRemark} placeholder="Enter remarks..."
                    placeholderTextColor="rgba(0,0,0,0.3)" multiline numberOfLines={3}
                    textAlignVertical="top" returnKeyType="done" blurOnSubmit />
                </ScrollView>
                <View style={[s.btnRow, isMobile && { gap:7 }]}>
                  <TouchableOpacity style={[s.btn, { backgroundColor:C.red }]} onPress={() => onSubmit(false, remark)} disabled={loading}>
                    <Ionicons name="close-circle-outline" size={13} color="#fff" /><Text style={s.btnTxt}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor:C.green }]} onPress={() => onSubmit(true, remark)} disabled={loading}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#fff" /><Text style={s.btnTxt}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor:"rgba(0,0,0,0.1)" }]} onPress={onClose} disabled={loading}>
                    <Text style={[s.btnTxt, { color:"#333" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                {loading && <ActivityIndicator style={{ marginTop:10 }} color={C.amber} />}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};



type ConfirmModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title = "",
  message = "",
  onConfirm = () => {},
  onCancel = () => {},
}) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={s.overlay}>
      <View style={s.confirmCard}>
        
        {/* Header */}
        <View style={s.confirmIconWrap}>
          <Ionicons name="diamond" size={38} color={C.amber} />
        </View>

        {/* Title */}
        <Text style={s.confirmTitle}>{title}</Text>

        {/* Message */}
        <Text style={s.confirmMsg}>{message}</Text>

        {/* Buttons */}
        <View style={s.confirmBtnRow}>
          <TouchableOpacity style={s.confirmCancelBtn} onPress={onCancel}>
            <Text style={s.confirmCancelTxt}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.confirmOkBtn} onPress={onConfirm}>
            <Text style={s.confirmOkTxt}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
// ── Contact Detail Modal ──
const DETAIL_ROWS = [
  { key:"companyName", icon:"business-outline", label:"Company" },
  { key:"subCompanyName", icon:"git-branch-outline", label:"Sub-Company" },
  { key:"branchName", icon:"location-outline", label:"Branch" },
  { key:"designation", icon:"briefcase-outline", label:"Designation" },
  { key:"phoneNumber1", icon:"call-outline", label:"Phone 1" },
  { key:"phoneNumber2", icon:"call-outline", label:"Phone 2" },
  { key:"phoneNumber3", icon:"call-outline", label:"Phone 3" },
  { key:"email1", icon:"mail-outline", label:"Email 1" },
  { key:"email2", icon:"mail-outline", label:"Email 2" },
  { key:"address", icon:"map-outline", label:"Address" },
  { key:"website1", icon:"globe-outline", label:"Website 1" },
  { key:"website2", icon:"globe-outline", label:"Website 2" },
  { key:"qrCodeDetail", icon:"qr-code-outline", label:"QR Code" },
  { key:"gstNumber", icon:"document-text-outline", label:"GST" },
  { key:"partnership", icon:"people-outline", label:"Partnership" },
  { key:"servicesCsv", icon:"list-outline", label:"Services" },
];

const ContactDetailModal = ({ visible, contactId, onClose }: { visible:boolean; contactId:number|null; onClose:()=>void }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { fetchContact } = useContact();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [activeImg, setActiveImg] = useState<"front"|"back">("front");
  const [fullViewUri, setFullViewUri] = useState<string|null>(null);
  const [confirmData, setConfirmData] = useState<any>(null);

  useEffect(() => {
    if (!visible || !contactId) return;
    setDetail(null); setError(null); setActiveImg("front"); setLoading(true);
    fetchContact(contactId).then(setDetail).catch(() => setError("Failed to load details.")).finally(() => setLoading(false));
  }, [visible, contactId]);

  const hasFront = detail?.frontImage && detail?.frontImageMimeType;
  const hasBack  = detail?.backImage  && detail?.backImageMimeType;
  const getUri   = (side: "front"|"back") => side==="front"
    ? (hasFront ? `data:${detail.frontImageMimeType};base64,${detail.frontImage}` : null)
    : (hasBack  ? `data:${detail.backImageMimeType};base64,${detail.backImage}`   : null);
  const currentUri = getUri(activeImg);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={[s.detailCard, isMobile && s.detailCardMob]}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <View style={{ flexDirection:"row", alignItems:"center", gap:9 }}>
                <View style={s.detailHeaderIcon}><Ionicons name="id-card" size={16} color={C.amber} /></View>
                <View>
                  <Text style={s.detailTitle}>Contact Details</Text>
                  {detail && <Text style={{ fontSize:11, color:"rgba(0,0,0,0.4)", marginTop:1 }} numberOfLines={1}>{detail.personName||detail.companyName||"—"}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}><Ionicons name="close" size={16} color={C.navy} /></TouchableOpacity>
            </View>
            <View style={s.divider} />

            {loading ? (
              <View style={s.loader}><ActivityIndicator size="large" color={C.amber} /><Text style={s.loaderTxt}>Loading...</Text></View>
            ) : error ? (
              <View style={s.loader}><Ionicons name="warning-outline" size={36} color={C.red} /><Text style={[s.loaderTxt, { color:C.red }]}>{error}</Text></View>
            ) : detail ? (
              <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:8 }}>
                {/* Identity */}
                <View style={s.identity}>
                  <View style={s.identityAvatar}>
                    <Text style={s.identityAvatarTxt}>{(detail.personName||detail.companyName||"?")[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={s.identityName}>{detail.personName||"Unnamed"}</Text>
                    {detail.designation ? <Text style={s.identityDesig}>{detail.designation}</Text> : null}
                    <Text style={s.identityDate}>Scanned {formatDate(detail.createdAtUtc)}</Text>
                  </View>
                </View>

                {/* Images */}
                {(hasFront || hasBack) && (
                  <View style={{ marginBottom:14 }}>
                    <Text style={s.sectionLabel}>BUSINESS CARD</Text>
                    {hasFront && hasBack && (
                      <View style={{ flexDirection:"row", gap:8, marginBottom:9 }}>
                        {(["front","back"] as const).map(side => (
                          <TouchableOpacity key={side} style={[s.imgTab, activeImg===side && s.imgTabActive]} onPress={() => setActiveImg(side)}>
                            <Ionicons name="card-outline" size={11} color={activeImg===side?"#fff":C.navy} />
                            <Text style={[s.imgTabTxt, activeImg===side && { color:"#fff" }]}>{side.charAt(0).toUpperCase()+side.slice(1)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity activeOpacity={currentUri?0.85:1} style={s.imgBox} onPress={() => currentUri && setFullViewUri(currentUri)}>
                      {currentUri
                        ? <>
                            <Image source={{ uri:currentUri }} style={s.cardImg} resizeMode="contain" />
                            <View style={s.imgExpandHint}>
                              <Ionicons name="expand-outline" size={13} color="#fff" />
                              <Text style={{ color:"#fff", fontSize:10, fontWeight:"600" }}>Tap to expand</Text>
                            </View>
                          </>
                        : <View style={{ alignItems:"center", gap:5 }}>
                            <Ionicons name="image-outline" size={26} color="rgba(0,0,0,0.2)" />
                            <Text style={{ fontSize:11, color:"rgba(0,0,0,0.3)" }}>No image</Text>
                          </View>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                {/* Fields */}
                <View style={{ marginBottom:11 }}>
                  {DETAIL_ROWS.map(({ key, icon, label }) => {
                    const v = detail[key]; if (!v) return null;
                    return (
                      <View key={key} style={s.fieldRow}>
                        <View style={s.fieldIcon}><Ionicons name={icon as any} size={12} color={C.amber} /></View>
                        <View style={{ flex:1 }}>
                          <Text style={s.fieldLabel}>{label}</Text>
                          <Text style={s.fieldValue}>{v}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {detail.rawExtractedText ? (
                  <View style={s.rawBox}>
                    <View style={{ flexDirection:"row", alignItems:"center", gap:5, marginBottom:6 }}>
                      <Ionicons name="text-outline" size={11} color="rgba(0,0,0,0.4)" />
                      <Text style={s.sectionLabel}>RAW TEXT</Text>
                    </View>
                    <Text style={s.rawText}>{detail.rawExtractedText}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <View style={s.divider} />
            <TouchableOpacity style={[s.footerBtn, { backgroundColor:"rgba(19,28,48,0.08)" }]} onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={13} color={C.navy} />
              <Text style={[s.btnTxt, { color:C.navy }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ImageViewModal uri={fullViewUri} onClose={() => setFullViewUri(null)} />
    </>
  );
};

// ── Scanned Contacts Modal ──
const SCAN_FIELDS: any[] = [
  { key:"companyName", icon:"business-outline", label:"Company" },
  { key:"phoneNumber1", icon:"call-outline", label:"Phone", multi:["phoneNumber1","phoneNumber2","phoneNumber3"] },
  { key:"email1", icon:"mail-outline", label:"Email" },
  { key:"address", icon:"location-outline", label:"Address" },
  { key:"website1", icon:"globe-outline", label:"Web", multi:["website1","website2"] },
  { key:"qrCodeDetail", icon:"qr-code-outline", label:"QR" },
  { key:"gstNumber", icon:"document-text-outline", label:"GST" },
];

const ScannedContactsModal = ({ visible, user, onClose }: { visible:boolean; user:any; onClose:()=>void }) => {
  const { width, height } = useWindowDimensions(); // Add height here
  const isMobile = width < 768;
  const [selId, setSelId] = useState<number|null>(null);
  const [cPage, setCPage] = useState(1);
  const CPP = 5;

  const { contacts, total, loading, error, fetchContacts } = useAdminContacts(user?.id ?? 0);

  useEffect(() => {
    if (visible && user?.id) { setCPage(1); fetchContacts(1, false); }
  }, [visible, user?.id]);

  const totalPages = Math.ceil(total / CPP);
  const handlePage = (p: number) => { setCPage(p); fetchContacts(p, false); };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={s.overlay}>
            <View style={[
              s.scannedCard, 
              isMobile && s.scannedCardMob,
              isMobile && { maxHeight: height * 0.85 } // Ensure it fits on mobile screen
            ]}>
              {/* Header */}
              <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexShrink: 0 }}>
                <View style={{ flexDirection:"row", alignItems:"center", gap:9, flex: 1 }}>
                  <View style={[s.detailHeaderIcon, { backgroundColor:C.navy }]}>
                    <Ionicons name="id-card-outline" size={17} color={C.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailTitle}>Scanned Contacts</Text>
                    <Text style={{ fontSize:11, color:"rgba(0,0,0,0.4)", marginTop:1 }}>
                      {user?.userName||"User"} · <Text style={{ color:C.amber, fontWeight:"700" }}>{total}</Text> contact{total!==1?"s":""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Ionicons name="close" size={16} color={C.navy} />
                </TouchableOpacity>
              </View>
              
              <View style={[s.divider, { flexShrink: 0 }]} />

              {/* Content - Make sure this area is scrollable */}
              <View style={{ flex: 1, minHeight: 0 }}>
                {loading ? (
                  <View style={s.loader}>
                    <ActivityIndicator size="large" color={C.amber} />
                    <Text style={s.loaderTxt}>Fetching contacts...</Text>
                  </View>
                ) : error ? (
                  <View style={s.loader}>
                    <Ionicons name="warning-outline" size={34} color={C.red} />
                    <Text style={[s.loaderTxt, { color:C.red }]}>{error}</Text>
                    <TouchableOpacity style={[s.footerBtn, { backgroundColor:C.amber, marginTop:12 }]} onPress={() => fetchContacts(1, false)}>
                      <Ionicons name="refresh-outline" size={13} color="#fff" />
                      <Text style={s.btnTxt}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : contacts.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <EmptyState 
                      icon="albums-outline" 
                      title="No Contacts Scanned" 
                      msg={`${user?.userName||"User"} hasn't scanned any contacts yet.`} 
                      isMobile={isMobile} 
                    />
                  </View>
                ) : (
                  <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 4, gap: 10 }} 
                    showsVerticalScrollIndicator={true}
                    bounces={false}
                  >
                    {contacts.map((contact: any) => (
                      <View key={contact.id} style={s.scanCard}>
                        <View style={s.scanCardHeader}>
                          <View style={s.scanAvatar}>
                            <Text style={s.scanAvatarTxt}>{(contact.personName||contact.companyName||"?")[0]?.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex:1 }}>
                            <Text style={s.scanName} numberOfLines={1}>{contact.personName||"Unnamed"}</Text>
                            {contact.designation ? <Text style={s.scanDesig} numberOfLines={1}>{contact.designation}</Text> : null}
                          </View>
                          <View style={{ flexDirection:"row", alignItems:"center", gap:3 }}>
                            <Ionicons name="time-outline" size={9} color="rgba(255,255,255,0.45)" />
                            <Text style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>{formatDate(contact.createdAtUtc)}</Text>
                          </View>
                        </View>
                        <View style={s.scanCardBody}>
                          {SCAN_FIELDS.map(({ key, icon, label, multi }: any) => {
                            const val = multi ? multi.map((k:string) => contact[k]).filter(Boolean).join(" · ") : contact[key];
                            if (!val) return null;
                            return (
                              <View key={key} style={{ flexDirection:"row", alignItems:"flex-start", gap:7 }}>
                                <View style={{ width:20, alignItems:"center", paddingTop:1 }}>
                                  <Ionicons name={icon} size={12} color={C.amber} />
                                </View>
                                <Text style={{ fontSize:10, color:"rgba(0,0,0,0.4)", width:44, flexShrink:0, paddingTop:1 }}>{label}</Text>
                                <Text style={{ fontSize:12, color:"#1e293b", flex:1, fontWeight:"500" }} numberOfLines={key==="address"?2:1}>{val}</Text>
                              </View>
                            );
                          })}
                          <TouchableOpacity style={s.viewDetailBtn} onPress={() => setSelId(contact.id)}>
                            <Ionicons name="expand-outline" size={11} color={C.amberDark} />
                            <Text style={s.viewDetailTxt}>View Full Details</Text>
                            <Ionicons name="chevron-forward" size={10} color={C.amberDark} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <Pager page={cPage} total={totalPages} onChange={handlePage} />
                  </ScrollView>
                )}
              </View>

              {/* Footer */}
              <View style={[s.divider, { flexShrink: 0 }]} />
              <TouchableOpacity 
                style={[s.footerBtn, { backgroundColor:"rgba(19,28,48,0.08)", flexShrink: 0 }]} 
                onPress={onClose}
              >
                <Ionicons name="arrow-back-outline" size={13} color={C.navy} />
                <Text style={[s.btnTxt, { color:C.navy }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ContactDetailModal visible={selId!==null} contactId={selId} onClose={() => setSelId(null)} />
    </>
  );
};

// ── Shared ──
const Avatar = ({ letter, bg, isMobile }: any) => (
  <View style={[dashboardStyles.contactAvatar, { backgroundColor:bg, alignSelf:"flex-start", marginTop:2 }, isMobile && { width:38, height:38, borderRadius:19 }]}>
    <Text style={[dashboardStyles.contactAvatarText, isMobile && { fontSize:16 }]}>{letter?.toUpperCase()||"U"}</Text>
  </View>
);
const Row = ({ label, value, isMobile, lines=1 }: any) => (
  <Text style={[dashboardStyles.contactRole, isMobile && { fontSize:11 }]} numberOfLines={lines}>
    {label ? <Text style={{ color:"rgba(0,0,0,0.55)", fontWeight:"600" }}>{label}: </Text> : null}{value}
  </Text>
);

// ── Main Screen ──
export default function UsersScreen() {
  const [users, setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users"|"approved"|"rejected"|"requests">("users");
  const [pages, setPages] = useState({ users:1, approved:1, rejected:1, requests:1 });
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roles, setRoles] = useState<string[]|null>(null);
  const [confirmData, setConfirmData] = useState<any>(null);

  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width >= 1024, isMobile = width < 768;
  const { profile } = useProfile();
  const { data: requests, loading: reqLoading, fetchRequests } = useAdminPremiumRequests();
  const { review, loading: reviewLoading } = useReviewPremiumRequest();
  
  const approved = requests.filter(r => r.status==="Approved");
  const rejected = requests.filter(r => r.status==="Rejected");
  const pending  = requests.filter(r => r.status==="Pending");
  const setPage  = (k: string, p: number) => setPages(prev => ({ ...prev, [k]:p }));

  useEffect(() => { getRoles().then(setRoles); }, []);
  useEffect(() => {
    getAllUsers().then(setUsers).catch(() => Toast.error("Failed to fetch users")).finally(() => setLoading(false));
  }, []);

const handleUpgrade = (name: string, id: string) => {
  setConfirmData({
    title: "Upgrade User",
    message: `Upgrade ${name} to Premium?`,
    onConfirm: async () => {
      try {
        await upgradeUser(id);
        setUsers(u => u.map(x => x.id===id ? {...x,accountType:"Premium"} : x));
        Toast.success(`${name} upgraded!`);
      } catch {
        Toast.error("Upgrade failed.");
      }
      setConfirmData(null);
    }
  });
};

const handleDowngrade = (name: string, id: string) => {
  setConfirmData({
    title: "Downgrade User",
    message: `Downgrade ${name} to Free?`,
    onConfirm: async () => {
      try {
        await downgradeUser(id);
        setUsers(u => u.map(x => x.id===id ? {...x, accountType:"Free"} : x));
        Toast.success(`${name} downgraded!`);
      } catch {
        Toast.error("Downgrade failed.");
      }
      setConfirmData(null);
    }
  });
};

  const handleReview = async (approve:boolean, remark:string) => {
    if (!selectedReq) return;
    try {
      await review(selectedReq.id, approve, remark);
      if (approve) setUsers(prev => prev.map(u => u.id===selectedReq.userId?{...u,accountType:"Premium"}:u));
      Toast.success(`Request ${approve?"approved":"rejected"}!`);
      setSelectedReq(null); fetchRequests();
    } catch { Toast.error("Failed to process request."); }
  };

  const getCurrentData = () => {
    switch(tab) {
      case "users": return users;
      case "approved": return approved;
      case "rejected": return rejected;
      case "requests": return pending;
      default: return [];
    }
  };

  const getCurrentCount = () => {
    const data = getCurrentData();
    return data.length;
  };

  const getCurrentPage = () => {
    return (pages as any)[tab] || 1;
  };

  const getTotalPages = () => {
    return Math.ceil(getCurrentCount() / ITEMS_PER_PAGE);
  };

  const getPaginatedData = () => {
    return paginate(getCurrentData(), getCurrentPage(), ITEMS_PER_PAGE);
  };

  const handlePageChange = (newPage: number) => {
    setPage(tab, newPage);
  };

  const renderUserCard = (user: any) => (
    <View key={user.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard]}>
      <View style={{ flexDirection: "row", flex: 1 }}>
        <Avatar letter={user.userName?.[0]} bg={C.navy} isMobile={isMobile} />
        <View style={[s.cardBody, { marginLeft: 12 }]}>
          <Text style={[dashboardStyles.contactName, isMobile && { fontSize:14 }]} numberOfLines={1}>{user.userName||"Unnamed"}</Text>
          <View style={{ flexDirection:"row", gap:6, marginTop:3, flexWrap:"wrap" }}>
            <View style={[s.badge, user.accountType==="Premium" && s.badgePremium]}>
              <Ionicons name={user.accountType==="Premium"?"star":"person-outline"} size={9} color={user.accountType==="Premium"?C.amber:"rgba(0,0,0,0.5)"} />
              <Text style={[s.badgeTxt, user.accountType==="Premium" && { color:C.amberDark }]}>{user.accountType||"Free"}</Text>
            </View>
            <View style={s.badge}>
              <Ionicons name="scan-outline" size={9} color={C.navy} />
              <Text style={s.badgeTxt}>{user.remainingScans||0} scans</Text>
            </View>
          </View>
          <Row value={user.email||"No email"} isMobile={isMobile} />
        </View>
      </View>
      
      {/* Buttons at top right */}
      <View style={s.cardTopRightBtns}>
        {user.accountType==="Premium"
          ? <TouchableOpacity style={[dashboardStyles.downgradeButton, s.actionBtnSmall]} onPress={() => handleDowngrade(user.userName, user.id)}>
              <Ionicons name="arrow-down-circle-outline" size={12} color="#fff" />
              <Text style={[dashboardStyles.buttonText, { fontSize: 10 }]}>Downgrade</Text>
            </TouchableOpacity>
          : <TouchableOpacity style={[dashboardStyles.upgradeButton, s.actionBtnSmall]} onPress={() => handleUpgrade(user.userName, user.id)}>
              <Ionicons name="arrow-up-circle-outline" size={12} color="#fff" />
              <Text style={[dashboardStyles.buttonText, { fontSize: 10 }]}>Upgrade</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity style={[s.contactsBtnSmall]} onPress={() => setSelectedUser(user)}>
          <Ionicons name="id-card-outline" size={12} color={"#fff"} />
          <Text style={s.contactsBtnTxtSmall}>View </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApprovedCard = (req: any) => (
    <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard, { borderLeftWidth:3, borderLeftColor:C.green }]}>
      <Avatar letter={req.userName?.[0]} bg={C.green} isMobile={isMobile} />
      <View style={s.cardBody}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <Text style={[dashboardStyles.contactName, isMobile && { fontSize:14 }, { flex:1 }]} numberOfLines={1}>{req.userName||"Unnamed"}</Text>
          <View style={[s.badge, { backgroundColor:C.green }]}><Ionicons name="checkmark-circle" size={9} color="#fff" /><Text style={[s.badgeTxt,{color:"#fff"}]}>Approved</Text></View>
        </View>
        <Row value={req.email||"No email"} isMobile={isMobile} />
        {req.phoneNumber && <Row label="Phone" value={req.phoneNumber} isMobile={isMobile} />}
        <Row label="Upgraded to" value={req.accountType==="Premium"?"Premium Plan":"Free Plan"} isMobile={isMobile} />
        {req.adminRemark && <Row label="Remark" value={req.adminRemark} isMobile={isMobile} lines={2} />}
        <Row label="Reviewed On" value={formatDate(req.reviewedAtUtc)} isMobile={isMobile} />
      </View>
    </View>
  );

  const renderRejectedCard = (req: any) => (
    <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard, { borderLeftWidth:3, borderLeftColor:C.red }]}>
      <Avatar letter={req.userName?.[0]} bg={C.red} isMobile={isMobile} />
      <View style={s.cardBody}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <Text style={[dashboardStyles.contactName, isMobile && { fontSize:14 }, { flex:1 }]} numberOfLines={1}>{req.userName||"Unnamed"}</Text>
          <View style={[s.badge, { backgroundColor:C.red }]}><Ionicons name="close-circle" size={9} color="#fff" /><Text style={[s.badgeTxt,{color:"#fff"}]}>Rejected</Text></View>
        </View>
        <Row value={req.email||"No email"} isMobile={isMobile} />
        {req.phoneNumber && <Row label="Phone" value={req.phoneNumber} isMobile={isMobile} />}
        <Row label="Requested" value={req.accountType==="Premium"?"Premium Plan":"Free Plan"} isMobile={isMobile} />
        {req.adminRemark && <Row label="Reason" value={req.adminRemark} isMobile={isMobile} lines={2} />}
        <Row label="Reviewed On" value={formatDate(req.reviewedAtUtc)} isMobile={isMobile} />
      </View>
    </View>
  );

  const renderRequestCard = (req: any) => (
    <View key={req.id} style={[dashboardStyles.contactCard, isMobile && s.mobileCard]}>
      <Avatar letter={req.userName?.[0]} bg={C.navy} isMobile={isMobile} />
      <View style={s.cardBody}>
        <Text style={[dashboardStyles.contactName, isMobile && { fontSize:14 }]} numberOfLines={1}>{req.userName||"Unnamed"}</Text>
        <Row value={req.email} isMobile={isMobile} />
        <Row label="Requesting" value={req.accountType==="Premium"?"Premium Plan":"Free Plan"} isMobile={isMobile} />
        {req.message && <Row label="Msg" value={req.message} isMobile={isMobile} lines={2} />}
        <Row label="Date" value={formatDate(req.createdAtUtc)} isMobile={isMobile} lines={2} />
        <View style={{ marginTop:8 }}>
          <TouchableOpacity style={[dashboardStyles.upgradeButton, s.cardBtn, { backgroundColor:C.amber }, isMobile && s.cardBtnMob]} onPress={() => setSelectedReq(req)}>
            <Ionicons name="clipboard-outline" size={12} color="#fff" />
            <Text style={[dashboardStyles.buttonText, isMobile && { fontSize:10 }]}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCard = (item: any) => {
    switch(tab) {
      case "users": return renderUserCard(item);
      case "approved": return renderApprovedCard(item);
      case "rejected": return renderRejectedCard(item);
      case "requests": return renderRequestCard(item);
      default: return null;
    }
  };

  const TABS = [
    { key:"users",    label:"Users",    count:users.length,    icon:"people-outline",           active:s.tabActive },
    { key:"requests", label:"Pending",  count:pending.length,  icon:"time-outline",             active:s.tabAmber  },
    { key:"approved", label:"Approved", count:approved.length, icon:"checkmark-circle-outline", active:s.tabGreen  },
    { key:"rejected", label:"Rejected", count:rejected.length, icon:"close-circle-outline",     active:s.tabRed    },
  ] as const;

  const isLoading = loading || (tab==="requests" && reqLoading);

  const content = (
    <View style={[dashboardStyles.container, isDesktop && { backgroundColor:colors.phoneBg }]}>
      <View style={dashboardStyles.header}>
        <View style={dashboardStyles.headerGlow1} /><View style={dashboardStyles.headerGlow2} />
        <View style={dashboardStyles.headerTop}>
          <View>
            <Text style={[dashboardStyles.greetText, isMobile && { fontSize:12 }]}>Admin Panel</Text>
            <Text style={[dashboardStyles.titleText, isMobile && { fontSize:22 }]}>
              Manage <Text style={dashboardStyles.titleSpan}>Users</Text>
            </Text>
            {!isDesktop && (
              <TouchableOpacity onPress={() => router.back()} style={{ marginTop:8, flexDirection:"row", alignItems:"center", gap:4 }}>
                <Ionicons name="arrow-back-outline" size={13} color={C.amber} />
                <Text style={{ color:C.amber, fontSize:isMobile?11:13 }}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={{ width:"100%", marginTop:14, marginBottom:12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
          {TABS.map(({ key, label, count, icon, active }) => (
            <TouchableOpacity key={key} style={[s.tab, tab===key && active, isMobile && s.tabMob]} onPress={() => { 
              setTab(key); 
              setPage(key, 1); // Reset to page 1 when switching tabs
            }}>
              <Ionicons name={icon as any} size={13} color={tab===key?"#fff":"rgba(0,0,0,0.6)"} />
              <Text style={[s.tabTxt, tab===key && { color:"#fff" }, isMobile && { fontSize:11 }]}>{label}</Text>
              <View style={[s.tabCount, tab===key && { backgroundColor:"rgba(255,255,255,0.25)" }]}>
                <Text style={[s.tabCountTxt, tab===key && { color:"#fff" }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex:1, justifyContent:"center", alignItems:"center", minHeight:280 }}>
          <ActivityIndicator size="large" color={C.amber} />
        </View>
      ) : (
        <ScrollView style={[dashboardStyles.body, isDesktop && { maxWidth:1200, alignSelf:"center", width:"100%" }]}
          contentContainerStyle={{ paddingBottom:40, paddingHorizontal:isMobile?10:16 }}>
          <View style={[dashboardStyles.sectionHead, isMobile && { marginBottom:12 }]}>
            <Text style={[dashboardStyles.sectionTitle, isMobile && { fontSize:19 }]}>
              {tab === "users" ? "All Users" : tab === "requests" ? "Pending Requests" : tab === "approved" ? "Approved Requests" : "Rejected Requests"}
            </Text>
            <Text style={[dashboardStyles.sectionSubtitle, isMobile && { fontSize:12 }]}>
              Total: {getCurrentCount()} · Page {getCurrentPage()} of {getTotalPages()}
            </Text>
          </View>
         <View style={[dashboardStyles.contactList, { flex:1 }, isMobile && { gap:10 }]}>
  {getPaginatedData().length > 0 ? (
    getPaginatedData().map(renderCard)
  ) : (
    <EmptyState icon="search-outline" title="Nothing here" msg="No records found." isMobile={isMobile} />
  )}
</View>
          <Pager page={getCurrentPage()} total={getTotalPages()} onChange={handlePageChange} />
        </ScrollView>
      )}

      <ReviewModal visible={!!selectedReq} request={selectedReq} loading={reviewLoading} onClose={() => setSelectedReq(null)} onSubmit={handleReview} />
      
      <ConfirmModal
  visible={!!confirmData}
  title={confirmData?.title}
  message={confirmData?.message}
  onConfirm={confirmData?.onConfirm}
  onCancel={() => setConfirmData(null)}
/>
      <ScannedContactsModal visible={!!selectedUser} user={selectedUser} onClose={() => setSelectedUser(null)} />
    </View>
  );

  return isDesktop ? (
    <SidebarLayout isAdmin userInitials="A" userAvatarColor={C.amber} userName={profile?.userName||"Admin"} userRole={roles?.[0]}>
      {content}
    </SidebarLayout>
  ) : content;
}

// ── Styles ──
const s: any = {
  // Tabs
  tab:        { flexDirection:"row", alignItems:"center", gap:5, paddingVertical:8, paddingHorizontal:14, borderRadius:28, backgroundColor:"rgba(255,255,255,0.85)", minWidth:88 },
  tabMob:     { paddingVertical:6, paddingHorizontal:10, minWidth:76 },
  tabActive:  { backgroundColor:C.navy },
  tabAmber:   { backgroundColor:C.amber },
  tabGreen:   { backgroundColor:C.green },
  tabRed:     { backgroundColor:C.red },
  tabTxt:     { color:"rgba(0,0,0,0.65)", fontSize:12, fontWeight:"600" },
  tabCount:   { backgroundColor:"rgba(0,0,0,0.1)", borderRadius:9, paddingHorizontal:5, paddingVertical:1, minWidth:18, alignItems:"center" },
  tabCountTxt:{ fontSize:9, color:"rgba(0,0,0,0.6)", fontWeight:"700" },

  // Cards
  mobileCard: { flexDirection:"column", padding:12 },
  cardBody:   { flex:1, gap:3 },
  cardTopRightBtns: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
    zIndex: 10,
  },
  actionBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  contactsBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.navy,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  contactsBtnTxtSmall: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  cardBtn:    { flexDirection:"row", alignItems:"center", gap:4 },
  cardBtnMob: { paddingVertical:5, paddingHorizontal:9 },
  badge:      { flexDirection:"row", alignItems:"center", gap:3, backgroundColor:"rgba(0,0,0,0.07)", paddingHorizontal:7, paddingVertical:3, borderRadius:9 },
  badgePremium:{ backgroundColor:"rgba(245,159,10,0.13)" },
  badgeTxt:   { color:"rgba(0,0,0,0.6)", fontSize:10, fontWeight:"600" },
  contactsBtn:{ flexDirection:"row", alignItems:"center", gap:4, backgroundColor:C.navy, borderWidth:1, borderColor:"rgba(25, 7, 92, 0.25)", paddingVertical:6, paddingHorizontal:10, borderRadius:9 },
  contactsBtnTxt:{ color:"#fff", fontSize:11, fontWeight:"600" },

  // Modal shared
  overlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.75)", justifyContent:"center", alignItems:"center", padding:14 },
  closeBtn:   { width:29, height:29, borderRadius:15, backgroundColor:"rgba(19,28,48,0.08)", justifyContent:"center", alignItems:"center" },
  divider:    { height:1, backgroundColor:"rgba(19,28,48,0.08)", marginVertical:10 },
  loader:     { alignItems:"center", justifyContent:"center", paddingVertical:42 },
  loaderTxt:  { color:"rgba(0,0,0,0.45)", marginTop:10, fontSize:13, textAlign:"center" },
  footerBtn:  { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, paddingVertical:10, paddingHorizontal:16, borderRadius:11 },
  btnTxt:     { color:"#fff", fontSize:13, fontWeight:"600" },

  // Scanned modal
  scannedCard:    { backgroundColor:"#fff", borderRadius:22, padding:16, width:"92%", maxWidth:520, maxHeight:"88%", borderWidth:1, borderColor:"rgba(19,28,48,0.1)" },
 scannedCardMob: { 
  padding: 12, 
  width: "96%", 
  maxHeight: "92%",
  minHeight: 650, // Minimum height for mobile
},
  scanCard:       { borderRadius:13, borderWidth:1, borderColor:"rgba(19,28,48,0.1)", overflow:"hidden" },
  scanCardHeader: { flexDirection:"row", alignItems:"center", gap:9, padding:11, backgroundColor:C.navy },
  scanAvatar:     { width:33, height:33, borderRadius:17, backgroundColor:C.amber, justifyContent:"center", alignItems:"center" },
  scanAvatarTxt:  { color:C.navy, fontSize:14, fontWeight:"700" },
  scanName:       { fontSize:13, fontWeight:"700", color:"#fff" },
  scanDesig:      { fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:1 },
  scanCardBody:   { padding:11, gap:6, backgroundColor:"rgba(19,28,48,0.02)" },
  viewDetailBtn:  { flexDirection:"row", alignItems:"center", gap:5, marginTop:8, paddingVertical:6, paddingHorizontal:10, backgroundColor:"rgba(245,159,10,0.08)", borderWidth:1, borderColor:"rgba(217,119,6,0.2)", borderRadius:9, alignSelf:"flex-start" },
  viewDetailTxt:  { color:C.amberDark, fontSize:11, fontWeight:"600" },

  // Detail modal
  detailCard:      { backgroundColor:"#fff",  minHeight: 650, borderRadius:22, padding:16, width:"92%", maxWidth:540, maxHeight:"90%", borderWidth:1, borderColor:"rgba(19,28,48,0.1)" },
  detailCardMob:   { padding:12, width:"96%", maxHeight:"94%" },
  detailHeaderIcon:{ width:34, height:34, borderRadius:17, backgroundColor:C.navy, justifyContent:"center", alignItems:"center" },
  detailTitle:     { fontSize:15, fontWeight:"700", color:C.navy },
  identity:        { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:C.navy, borderRadius:14, padding:13, marginBottom:13 },
  identityAvatar:  { width:46, height:46, borderRadius:23, backgroundColor:C.amber, justifyContent:"center", alignItems:"center", flexShrink:0 },
  identityAvatarTxt:{ fontSize:20, fontWeight:"700", color:C.navy },
  identityName:    { fontSize:15, fontWeight:"700", color:"#fff" },
  identityDesig:   { fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:2 },
  identityDate:    { fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:3 },

  // Images
  sectionLabel:    { fontSize:10, fontWeight:"700", color:"rgba(0,0,0,0.4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 },
  imgTab:          { flexDirection:"row", alignItems:"center", gap:4, paddingVertical:5, paddingHorizontal:12, borderRadius:18, backgroundColor:"rgba(19,28,48,0.07)", borderWidth:1, borderColor:"rgba(19,28,48,0.1)" },
  imgTabActive:    { backgroundColor:C.navy, borderColor:C.navy },
  imgTabTxt:       { fontSize:11, fontWeight:"600", color:C.navy },
  imgBox:          { borderRadius:12, overflow:"hidden", backgroundColor:"rgba(19,28,48,0.04)", borderWidth:1, borderColor:"rgba(19,28,48,0.08)", minHeight:165, justifyContent:"center", alignItems:"center" },
  cardImg:         { width:"100%", height:205 },
  imgExpandHint:   { position:"absolute", bottom:7, right:7, flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(0,0,0,0.55)", borderRadius:8, paddingHorizontal:8, paddingVertical:4 },

  // Fields
  fieldRow:        { flexDirection:"row", alignItems:"flex-start", gap:9, paddingVertical:8, borderBottomWidth:1, borderBottomColor:"rgba(19,28,48,0.06)" },
  fieldIcon:       { width:25, height:25, borderRadius:7, backgroundColor:"rgba(245,159,10,0.1)", justifyContent:"center", alignItems:"center", flexShrink:0, marginTop:1 },
  fieldLabel:      { fontSize:9, color:"rgba(0,0,0,0.4)", fontWeight:"600", textTransform:"uppercase", letterSpacing:0.3, marginBottom:1 },
  fieldValue:      { fontSize:12, color:"#1e293b", fontWeight:"500" },
  rawBox:          { backgroundColor:"rgba(19,28,48,0.04)", borderRadius:11, padding:11, borderWidth:1, borderColor:"rgba(19,28,48,0.07)" },
  rawText:         { fontSize:10, color:"rgba(0,0,0,0.55)", lineHeight:16, fontFamily:Platform.OS==="ios"?"Menlo":"monospace" },

  //confirmmodal
  confirmCard: {
  width: "85%",
  maxWidth: 340,
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 22,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 20,
  elevation: 10,
},

confirmIconWrap: {
  width: 70,
  height: 70,
  borderRadius: 35,
  backgroundColor: "rgba(245,159,10,0.12)",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 14,
},

confirmTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#111",
  textAlign: "center",
},

confirmMsg: {
  fontSize: 13,
  color: "rgba(0,0,0,0.55)",
  textAlign: "center",
  marginTop: 8,
  lineHeight: 18,
},

confirmBtnRow: {
  flexDirection: "row",
  marginTop: 20,
  gap: 10,
},

confirmCancelBtn: {
  flex: 1,
  paddingVertical: 10,
  paddingHorizontal: 10,
  borderRadius: 10,
  backgroundColor: "rgba(0,0,0,0.08)",
  alignItems: "center",
},

confirmOkBtn: {
  flex: 1,
  paddingVertical: 10,
    paddingHorizontal: 10,
  borderRadius: 10,
  backgroundColor: C.amberDark,
  alignItems: "center",
},

confirmCancelTxt: {
  fontSize: 13,
  fontWeight: "600",
  color: "#333",
},

confirmOkTxt: {
  fontSize: 13,
  fontWeight: "700",
  color: "#fff",
},


  // Image full view
  imgViewOverlay:  { flex:1, backgroundColor:"rgba(0,0,0,0.93)", justifyContent:"center", alignItems:"center" },
  imgViewWrap:     { width:"95%", maxWidth:620 },
  imgViewClose:    { alignSelf:"flex-end", marginBottom:10 },
  imgViewFull:     { width:"100%", height:undefined, aspectRatio:1.6, borderRadius:12 },

  // Empty state
  emptyBox: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 48,
  paddingHorizontal: 20,
},
  emptyIcon:       { width:62, height:62, borderRadius:31, backgroundColor:"rgba(19,28,48,0.07)", justifyContent:"center", alignItems:"center", marginBottom:12 },
  emptyTitle:      { fontSize:17, fontWeight:"600", color:"#333", marginBottom:6, textAlign:"center" },
  emptyMsg:        { fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", maxWidth:270 },

  // Pagination
  pageRow:         { flexDirection:"row", justifyContent:"center", alignItems:"center", gap:14, marginTop:14, flexWrap:"wrap" },
  pageBtn:         { flexDirection:"row", alignItems:"center", gap:3, paddingHorizontal:15, paddingVertical:7, borderRadius:9, backgroundColor:"rgba(19,28,48,0.08)", minWidth:70, justifyContent:"center" },
  pageDim:         { opacity:0.35 },
  pageTxt:         { color:C.navy, fontWeight:"600", fontSize:12 },
  pageInfo:        { color:"#333", fontSize:12, fontWeight:"600" },

  // Review modal
  reviewCard:      { backgroundColor:"#fff", borderRadius:22, padding:20, width:"90%", maxWidth:450, borderWidth:1, borderColor:"rgba(245,159,10,0.2)" },
  reviewCardMob:   { padding:14, width:"95%", maxHeight:"90%" },
  modalTitle:      { fontSize:17, fontWeight:"700", color:C.amber },
  infoRow:         { flexDirection:"row", justifyContent:"space-between", paddingVertical:7, borderBottomWidth:1, borderBottomColor:"rgba(0,0,0,0.07)", flexWrap:"wrap", gap:6 },
  infoLabel:       { color:"rgba(0,0,0,0.6)", fontSize:12, fontWeight:"600" },
  infoValue:       { color:"#333", fontSize:12, fontWeight:"500", maxWidth:"60%", textAlign:"right", flex:1 },
  remarkLabel:     { color:"#333", fontSize:12, fontWeight:"600", marginTop:14, marginBottom:6 },
  input:           { backgroundColor:"rgba(0,0,0,0.05)", borderRadius:11, padding:11, color:"#333", fontSize:13, minHeight:70, textAlignVertical:"top", borderWidth:1, borderColor:"rgba(0,0,0,0.12)" },
  btnRow:          { flexDirection:"row", gap:9, marginTop:16, flexWrap:"wrap" },
  btn:             { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, paddingVertical:11, borderRadius:11, minWidth:80 },
};