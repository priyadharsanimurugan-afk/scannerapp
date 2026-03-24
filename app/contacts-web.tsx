// app/contacts-web.tsx
import { contactsStyles } from '@/components/styles/contactStyles';
import { colors } from '@/constants/colors';
import { ContactDetail } from '@/types/contact';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Linking,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useContact } from '@/hooks/useContact';
import { router, useFocusEffect } from 'expo-router';
import { exportContactsWeb } from '@/services/contact';
import { SidebarLayout } from './sidebar';
import { useProfile } from '@/hooks/useProfile';
import { getRoles } from '@/utils/tokenStorage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
};

const getAvatarColor = (name: string) => {
  const palette = [
    '#1e3a5f', '#1a4731', '#3b1f6e', '#3d1a1a', '#1a3a3a',
    '#5f2e1e', '#2e1e5f', '#1e5f2e', '#5f1e4a', '#4a1e5f',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

// ─── Responsive Utilities ────────────────────────────────────────────────────
const getResponsiveConfig = (width: number) => {
  if (width < 640) return { columns: 1, gap: 12, paddingHorizontal: 16, cardWidth: '100%' };
  if (width < 768) return { columns: 2, gap: 12, paddingHorizontal: 16, cardWidth: 'calc(50% - 6px)' };
  if (width < 1024) return { columns: 2, gap: 14, paddingHorizontal: 24, cardWidth: 'calc(50% - 7px)' };
  if (width < 1280) return { columns: 3, gap: 14, paddingHorizontal: 24, cardWidth: 'calc(33.333% - 10px)' };
  return { columns: 3, gap: 14, paddingHorizontal: 32, cardWidth: 'calc(33.333% - 10px)' };
};

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';

const useToast = () => {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const show = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return { toast, show };
};

const Toast = ({ msg, type }: { msg: string; type: ToastType }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  
  return (
    <View style={{
      position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
      bottom: isMobile ? 20 : 28,
      left: isMobile ? 20 : undefined,
      right: isMobile ? 20 : 28,
      zIndex: 9999,
      backgroundColor: type === 'success' ? '#16a34a' : type === 'error' ? colors.error : colors.navy,
      borderRadius: 12,
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 12 : 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
      ...(isMobile && { marginHorizontal: 'auto', maxWidth: '90%' }),
    }}>
      <Icon
        name={type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle'}
        size={isMobile ? 16 : 18}
        color="#fff"
      />
      <Text style={{ color: '#fff', fontSize: isMobile ? 13 : 14, fontWeight: '600', flex: 1 }}>{msg}</Text>
    </View>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
const ConfirmDialog = ({ visible, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string;
  confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  
  if (!visible) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: isMobile ? 16 : 0 }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: isMobile ? 20 : 28,
          width: isMobile ? '100%' : 380,
          maxWidth: 400,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }}>
          <Text style={{ fontSize: isMobile ? 16 : 17, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{title}</Text>
          <Text style={{ fontSize: isMobile ? 13 : 14, color: colors.muted, lineHeight: 22, marginBottom: 24 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ paddingHorizontal: isMobile ? 16 : 20, paddingVertical: isMobile ? 8 : 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border }}
            >
              <Text style={{ fontSize: isMobile ? 12 : 13, fontWeight: '700', color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ paddingHorizontal: isMobile ? 16 : 20, paddingVertical: isMobile ? 8 : 10, borderRadius: 10, backgroundColor: danger ? colors.error : colors.amber }}
            >
              <Text style={{ fontSize: isMobile ? 12 : 13, fontWeight: '700', color: '#fff' }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildImageUri = (base64?: string, mime?: string, url?: string) => {
  if (url) return url;
  if (base64) return `data:${mime ?? 'image/jpeg'};base64,${base64}`;
  return null;
};

// ─── Image Viewer with Next/Previous Navigation ─────────────────────────────────
const ImageViewer = ({ visible, images, currentIndex, label, onClose, onNext, onPrev }: {
  visible: boolean; images: Array<{ uri: string | null; label: string }>; currentIndex: number;
  label: string; onClose: () => void; onNext: () => void; onPrev: () => void;
}) => {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, mx: 0, my: 0, ox: 0, oy: 0 });
  const { width, height } = useWindowDimensions();
  const isMobile = width < 640;
  const imageSize = isMobile ? { width: width - 40, height: height - 150 } : { width: 820, height: 520 };

  useEffect(() => {
    if (visible) { setScale(1); setRotate(0); setOffset({ x: 0, y: 0 }); }
  }, [visible, currentIndex]);

  if (!visible) return null;

  const currentImage = images[currentIndex];
  const uri = currentImage?.uri;

  const zoomIn = () => setScale((s) => Math.min(5, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.25, +(s - 0.25).toFixed(2)));
  const rotateCCW = () => setRotate((r) => r - 90);
  const rotateCW = () => setRotate((r) => r + 90);
  const reset = () => { setScale(1); setRotate(0); setOffset({ x: 0, y: 0 }); };

  const onWheel = (e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault?.();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((s) => Math.min(5, Math.max(0.25, +(s + delta).toFixed(2))));
  };

  const onMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    dragRef.current = { active: true, mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: any) => {
    if (!dragRef.current.active || Platform.OS !== 'web') return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.mx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.my),
    });
  };
  const onMouseUp = () => { dragRef.current.active = false; };

  const toolBtn = (icon: string, action: () => void, title: string) => (
    <TouchableOpacity
      key={title}
      onPress={action}
      style={{
        width: isMobile ? 32 : 36,
        height: isMobile ? 32 : 36,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.13)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Icon name={icon} size={isMobile ? 15 : 17} color="rgba(255,255,255,0.88)" />
    </TouchableOpacity>
  );

  const hasPrev = currentIndex > 0 && images[currentIndex - 1]?.uri;
  const hasNext = currentIndex < images.length - 1 && images[currentIndex + 1]?.uri;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={{ flex: 1, backgroundColor: 'rgba(5,5,10,0.97)', justifyContent: 'center', alignItems: 'center' }}
        onMouseMove={Platform.OS === 'web' ? onMouseMove : undefined}
        onMouseUp={Platform.OS === 'web' ? onMouseUp : undefined}
        onMouseLeave={Platform.OS === 'web' ? onMouseUp : undefined}
      >
        {/* Top bar */}
        <View style={{
          position: 'absolute' as any,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isMobile ? 12 : 24,
          paddingVertical: isMobile ? 10 : 14,
          backgroundColor: 'rgba(0,0,0,0.55)',
          ...(Platform.OS === 'web' && { backdropFilter: 'blur(12px)' }),
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: isMobile ? 11 : 14, fontWeight: '700', letterSpacing: 0.3 }}>
            {label} · {currentIndex + 1}/{images.length}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
            {!isMobile && (
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginRight: 6 }}>
                {Math.round(scale * 100)}% · {((rotate % 360) + 360) % 360}°
              </Text>
            )}
            {toolBtn('remove-outline', zoomOut, 'Zoom Out')}
            {toolBtn('add-outline', zoomIn, 'Zoom In')}
            {toolBtn('arrow-undo-outline', rotateCCW, 'Rotate Left')}
            {toolBtn('arrow-redo-outline', rotateCW, 'Rotate Right')}
            {!isMobile && toolBtn('scan-outline', reset, 'Reset')}
            <View style={{ width: 1, height: isMobile ? 20 : 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: isMobile ? 2 : 4 }} />
            <TouchableOpacity
              onPress={onClose}
              style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.18)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Icon name="close" size={isMobile ? 16 : 18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Previous Button */}
        {hasPrev && (
          <TouchableOpacity
            onPress={onPrev}
            style={{
              position: 'absolute' as any,
              left: isMobile ? 12 : 24,
              top: '50%',
              transform: [{ translateY: -25 }],
              width: isMobile ? 40 : 50,
              height: isMobile ? 40 : 50,
              borderRadius: isMobile ? 20 : 25,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Icon name="chevron-back" size={isMobile ? 24 : 28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Next Button */}
        {hasNext && (
          <TouchableOpacity
            onPress={onNext}
            style={{
              position: 'absolute' as any,
              right: isMobile ? 12 : 24,
              top: '50%',
              transform: [{ translateY: -25 }],
              width: isMobile ? 40 : 50,
              height: isMobile ? 40 : 50,
              borderRadius: isMobile ? 20 : 25,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Icon name="chevron-forward" size={isMobile ? 24 : 28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Image area */}
        <View
          onMouseDown={Platform.OS === 'web' ? onMouseDown : undefined}
          onWheel={Platform.OS === 'web' ? onWheel : undefined}
          style={{
            transform: [
              { translateX: offset.x },
              { translateY: offset.y },
              { scale },
              { rotate: `${rotate}deg` as any },
            ],
            ...(Platform.OS === 'web' && {
              cursor: dragRef.current.active ? 'grabbing' : 'grab',
              userSelect: 'none',
            }),
          }}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={[imageSize, { borderRadius: 6 }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[imageSize, { alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
              <Icon name="image-outline" size={isMobile ? 40 : 60} color="rgba(255,255,255,0.2)" />
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: isMobile ? 12 : 14 }}>No image available</Text>
            </View>
          )}
        </View>

        {/* Hint */}
        {!isMobile && (
          <Text style={{ position: 'absolute' as any, bottom: 18, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            Scroll to zoom · Drag to pan · Toolbar to rotate · Use arrows to navigate
          </Text>
        )}
      </View>
    </Modal>
  );
};

// ─── Edit Field ───────────────────────────────────────────────────────────────
const EditField = React.memo(({ label, value, onChange, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any;
}) => (
  <View style={contactsStyles.editField}>
    <Text style={contactsStyles.editFieldLabel}>{label}</Text>
    <TextInput
      style={[contactsStyles.editFieldInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
      value={value}
      onChangeText={onChange}
      placeholder={`Enter ${label.toLowerCase()}…`}
      placeholderTextColor={colors.inputPlaceholder}
      keyboardType={keyboardType ?? 'default'}
      autoCorrect={false}
      autoCapitalize="none"
    />
  </View>
));

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
type EditForm = {
  personName: string; designation: string; companyName: string; subCompanyName: string;
  branchName: string; phoneNumber1: string; phoneNumber2: string; phoneNumber3: string;
  email1: string; email2: string; address: string; website1: string; website2: string; servicesCsv: string;
  // NEW FIELDS
  qrCodeDetail: string;    // QR / Link
  gstNumber: string;       // GST Number
  partnership: string;     // Partnership
};

const EditDialog = ({ visible, contact, onClose, onSave, saving }: {
  visible: boolean; contact: ContactDetail | null;
  onClose: () => void; onSave: (form: EditForm) => void; saving: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  
  const blank: EditForm = {
    personName: '', designation: '', companyName: '', subCompanyName: '',
    branchName: '', phoneNumber1: '', phoneNumber2: '', phoneNumber3: '',
    email1: '', email2: '', address: '', website1: '', website2: '', servicesCsv: '',
    qrCodeDetail: '', gstNumber: '', partnership: '',
  };
  const [form, setForm] = useState<EditForm>(blank);

  useEffect(() => {
    if (contact) setForm({
      personName:     contact.personName     ?? '',
      designation:    contact.designation    ?? '',
      companyName:    contact.companyName    ?? '',
      subCompanyName: contact.subCompanyName ?? '',
      branchName:     contact.branchName     ?? '',
      phoneNumber1:   contact.phoneNumber1   ?? '',
      phoneNumber2:   contact.phoneNumber2   ?? '',
      phoneNumber3:   contact.phoneNumber3   ?? '',
      email1:         contact.email1         ?? '',
      email2:         contact.email2         ?? '',
      address:        contact.address        ?? '',
      website1:       contact.website1       ?? '',
      website2:       contact.website2       ?? '',
      servicesCsv:    contact.servicesCsv    ?? '',
      qrCodeDetail:   contact.qrCodeDetail   ?? '',   // new
      gstNumber:      contact.gstNumber      ?? '',   // new
      partnership:    contact.partnership    ?? '',   // new
    });
  }, [contact?.id]);

  const f = useCallback((key: keyof EditForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v })), []);

  const Row2 = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 14 }}>
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: isMobile ? 16 : 0 }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          width: isMobile ? '100%' : isTablet ? 540 : 620,
          maxWidth: '100%',
          maxHeight: '88vh',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 10 },
          elevation: 5,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: isMobile ? 20 : 28,
            paddingVertical: isMobile ? 16 : 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View>
              <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: '800', color: colors.text }}>Edit Contact</Text>
              <Text style={{ fontSize: isMobile ? 11 : 12, color: colors.muted, marginTop: 1 }}>{contact?.personName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, backgroundColor: colors.phoneBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Icon name="close" size={isMobile ? 15 : 17} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: isMobile ? 20 : 28, paddingTop: 20 }}>
            <Text style={contactsStyles.editSectionHeading}>Personal</Text>
            <Row2>
              <View style={{ flex: 1 }}><EditField label="Full Name"   value={form.personName}  onChange={f('personName')} /></View>
              <View style={{ flex: 1 }}><EditField label="Designation" value={form.designation} onChange={f('designation')} /></View>
            </Row2>

            <Text style={contactsStyles.editSectionHeading}>Company</Text>
            <Row2>
              <View style={{ flex: 1 }}><EditField label="Company Name" value={form.companyName}    onChange={f('companyName')} /></View>
              <View style={{ flex: 1 }}><EditField label="Sub Company"  value={form.subCompanyName} onChange={f('subCompanyName')} /></View>
            </Row2>
            <EditField label="Branch" value={form.branchName} onChange={f('branchName')} />

            <Text style={contactsStyles.editSectionHeading}>Phone Numbers</Text>
            <Row2>
              <View style={{ flex: 1 }}><EditField label="Phone 1" value={form.phoneNumber1} onChange={f('phoneNumber1')} keyboardType="phone-pad" /></View>
              <View style={{ flex: 1 }}><EditField label="Phone 2" value={form.phoneNumber2} onChange={f('phoneNumber2')} keyboardType="phone-pad" /></View>
            </Row2>
            <EditField label="Phone 3" value={form.phoneNumber3} onChange={f('phoneNumber3')} keyboardType="phone-pad" />

            <Text style={contactsStyles.editSectionHeading}>Email</Text>
            <Row2>
              <View style={{ flex: 1 }}><EditField label="Email 1" value={form.email1} onChange={f('email1')} keyboardType="email-address" /></View>
              <View style={{ flex: 1 }}><EditField label="Email 2" value={form.email2} onChange={f('email2')} keyboardType="email-address" /></View>
            </Row2>

            <Text style={contactsStyles.editSectionHeading}>Other</Text>
            <EditField label="Address" value={form.address} onChange={f('address')} />
            <Row2>
              <View style={{ flex: 1 }}><EditField label="Website 1" value={form.website1} onChange={f('website1')} keyboardType="url" /></View>
              <View style={{ flex: 1 }}><EditField label="Website 2" value={form.website2} onChange={f('website2')} keyboardType="url" /></View>
            </Row2>
            <EditField label="Services (comma separated)" value={form.servicesCsv} onChange={f('servicesCsv')} />

            {/* NEW SECTION: QR Code & Business Info */}
            <Text style={contactsStyles.editSectionHeading}>QR Code & Business</Text>
            <EditField label="QR / Link" value={form.qrCodeDetail} onChange={f('qrCodeDetail')} keyboardType="url" />
            <Row2>
              <View style={{ flex: 1 }}><EditField label="GST Number" value={form.gstNumber} onChange={f('gstNumber')} /></View>
              <View style={{ flex: 1 }}><EditField label="Partnership" value={form.partnership} onChange={f('partnership')} /></View>
            </Row2>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, paddingVertical: isMobile ? 11 : 13, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: '700', color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{
                  flex: 2, flexDirection: 'row', gap: 8, paddingVertical: isMobile ? 11 : 13, borderRadius: 11,
                  backgroundColor: colors.amber, justifyContent: 'center', alignItems: 'center',
                }, saving && { opacity: 0.65 }]}
                onPress={() => onSave(form)}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <>
                      <Icon name="checkmark-circle-outline" size={isMobile ? 15 : 17} color={colors.navy} />
                      <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: '800', color: colors.navy }}>Save Changes</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Detail Side Panel ────────────────────────────────────────────────────────
const DetailPanel = ({ visible, contact, loading: loadingDetail, onClose, onEdit, onDeleteRequest }: {
  visible: boolean; contact: ContactDetail | null; loading: boolean;
  onClose: () => void; onEdit: (c: ContactDetail) => void;
  onDeleteRequest: (id: string | number, name: string) => void;
}) => {
  const [viewingImage, setViewingImage] = useState<{ images: Array<{ uri: string | null; label: string }>; currentIndex: number } | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  
  const panelWidth = isMobile ? width : isTablet ? 380 : 400;

  const InfoRow = ({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) => (
    <View style={contactsStyles.detailRow}>
      <View style={contactsStyles.detailIconWrap}>
        <Icon name={icon} size={14} color={colors.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={contactsStyles.detailRowLabel}>{label}</Text>
        {href
          ? <TouchableOpacity onPress={() => Linking.openURL(href)}>
              <Text style={[contactsStyles.detailRowValue, { color: colors.navy, textDecorationLine: 'underline' }]}>{value}</Text>
            </TouchableOpacity>
          : <Text style={contactsStyles.detailRowValue}>{value}</Text>
        }
      </View>
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={contactsStyles.detailSection}>
      <Text style={contactsStyles.detailSectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const panelStyle: any = {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: panelWidth,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    zIndex: 100,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: -4, height: 0 },
    elevation: 5,
    transform: [{ translateX: visible ? 0 : panelWidth }],
    transition: Platform.OS === 'web' ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : undefined,
  };

  if (!visible) return null;

  if (loadingDetail || !contact) {
    return (
      <View style={panelStyle}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={{ color: colors.muted, marginTop: 14, fontSize: 14 }}>Loading…</Text>
        </View>
      </View>
    );
  }

  const personName = contact.personName ?? 'Unknown';
  const avatarBg   = getAvatarColor(personName);

  const frontUri   = buildImageUri(contact.frontImage, contact.frontImageMimeType);
  const backUri    = buildImageUri(contact.backImage,  contact.backImageMimeType);
  const cardImages = [
    { uri: frontUri, label: 'Front' },
    { uri: backUri, label: 'Back' },
  ].filter(img => img.uri !== null);

  const phones     = [contact.phoneNumber1, contact.phoneNumber2, contact.phoneNumber3].filter(Boolean) as string[];
  const emails     = [contact.email1, contact.email2].filter(Boolean) as string[];
  const websites   = [contact.website1, contact.website2].filter(Boolean) as string[];
  const services   = contact.servicesCsv ? contact.servicesCsv.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const handleImageClick = (index: number) => {
    setViewingImage({ images: cardImages, currentIndex: index });
  };

  return (
    <View style={panelStyle}>
      {/* Top bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isMobile ? 14 : 18,
        paddingVertical: isMobile ? 12 : 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: '#fff',
        flexShrink: 0,
      }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8, backgroundColor: colors.phoneBg, justifyContent: 'center', alignItems: 'center' }}
        >
          <Icon name="close" size={isMobile ? 15 : 17} color={colors.muted} />
        </TouchableOpacity>
        <Text style={{ fontSize: isMobile ? 12 : 13, fontWeight: '700', color: colors.text }}>Contact Details</Text>
        <View style={{ flexDirection: 'row', gap: isMobile ? 5 : 7 }}>
          <TouchableOpacity
            onPress={() => onEdit(contact)}
            style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,159,10,0.3)', backgroundColor: 'rgba(245,159,10,0.08)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Icon name="create-outline" size={isMobile ? 13 : 15} color={colors.amber} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDeleteRequest(contact.id, personName)}
            style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Icon name="trash-outline" size={isMobile ? 13 : 15} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={[contactsStyles.detailHero, { paddingVertical: isMobile ? 18 : 22 }]}>
          <View style={contactsStyles.detailHeroGlow} />
          <View style={[contactsStyles.detailAvatar, { backgroundColor: avatarBg, width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius: isMobile ? 40 : 50 }]}>
            <Text style={[contactsStyles.detailAvatarText, { fontSize: isMobile ? 28 : 36 }]}>{getInitials(personName)}</Text>
          </View>
          <Text style={[contactsStyles.detailName, { fontSize: isMobile ? 20 : 24 }]}>{personName}</Text>
          <Text style={[contactsStyles.detailDesignation, { fontSize: isMobile ? 13 : 14 }]}>{contact.designation ?? '—'}</Text>
          {contact.companyName && <Text style={[contactsStyles.detailCompany, { fontSize: isMobile ? 13 : 14 }]}>{contact.companyName}</Text>}
        </View>

        {/* Card images */}
        {cardImages.length > 0 && (
          <View style={[contactsStyles.detailCardsRow, { paddingHorizontal: isMobile ? 12 : 14, gap: isMobile ? 8 : 10 }]}>
            {cardImages.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                style={[contactsStyles.detailCardBox, { width: isMobile ? '48%' : 'auto', cursor: Platform.OS === 'web' ? 'zoom-in' : undefined }]}
                onPress={() => handleImageClick(idx)}
                activeOpacity={0.85}
              >
                {img.uri
                  ? <Image source={{ uri: img.uri }} style={[contactsStyles.detailCardImage, { height: isMobile ? 100 : 120 }]} resizeMode="cover" />
                  : <View style={[contactsStyles.detailCardPlaceholder, { height: isMobile ? 100 : 120 }]}>
                      <Icon name="card-outline" size={isMobile ? 18 : 22} color="rgba(255,255,255,0.3)" />
                      <Text style={[contactsStyles.detailCardPlaceholderText, { fontSize: isMobile ? 10 : 12 }]}>{img.label}</Text>
                    </View>
                }
                <View style={contactsStyles.detailCardBadge}>
                  <Icon name="eye-outline" size={isMobile ? 8 : 9} color={colors.amberDark} />
                  <Text style={[contactsStyles.detailCardBadgeText, { fontSize: isMobile ? 9 : 10 }]}>{img.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sections */}
        <View style={[contactsStyles.detailBody, { paddingHorizontal: isMobile ? 12 : 14 }]}>
          {phones.length > 0 && (
            <Section title="Phone Numbers">
              {phones.map((p, i) => (
                <InfoRow key={i} icon="call-outline" label={['Primary', 'Office', 'Mobile'][i] ?? 'Phone'} value={p} href={`tel:${p}`} />
              ))}
            </Section>
          )}
          {emails.length > 0 && (
            <Section title="Email Addresses">
              {emails.map((e, i) => (
                <InfoRow key={i} icon="mail-outline" label={`Email ${i + 1}`} value={e} href={`mailto:${e}`} />
              ))}
            </Section>
          )}
          {(contact.companyName || contact.subCompanyName || contact.branchName) && (
            <Section title="Company">
              {contact.companyName    && <InfoRow icon="business-outline"   label="Company"     value={contact.companyName} />}
              {contact.subCompanyName && <InfoRow icon="git-branch-outline" label="Sub Company" value={contact.subCompanyName} />}
              {contact.branchName     && <InfoRow icon="location-outline"   label="Branch"      value={contact.branchName} />}
            </Section>
          )}
          {contact.address && (
            <Section title="Address">
              <InfoRow icon="map-outline" label="Office Address" value={contact.address} />
            </Section>
          )}
          {websites.length > 0 && (
            <Section title="Websites">
              {websites.map((w, i) => (
                <InfoRow key={i} icon="globe-outline" label={`Website ${i + 1}`} value={w} href={w.startsWith('http') ? w : `https://${w}`} />
              ))}
            </Section>
          )}
          {services.length > 0 && (
            <Section title="Services">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isMobile ? 6 : 7, paddingTop: 4 }}>
                {services.map((s, i) => (
                  <View key={i} style={[contactsStyles.detailServiceTag, { paddingHorizontal: isMobile ? 10 : 12, paddingVertical: isMobile ? 4 : 6 }]}>
                    <Text style={[contactsStyles.detailServiceText, { fontSize: isMobile ? 11 : 12 }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
          {/* QR Code and Business Info sections */}
          {contact.qrCodeDetail ? (
            <Section title="QR Code">
              <InfoRow icon="qr-code-outline" label="QR / Link" value={contact.qrCodeDetail} href={contact.qrCodeDetail} />
            </Section>
          ) : null}
          {(contact.gstNumber || contact.partnership) ? (
            <Section title="Business Info">
              {contact.gstNumber   && <InfoRow icon="receipt-outline"       label="GST Number"  value={contact.gstNumber} />}
              {contact.partnership && <InfoRow icon="people-circle-outline" label="Partnership" value={contact.partnership} />}
            </Section>
          ) : null}
          <Section title="Meta">
            <InfoRow icon="calendar-outline"     label="Added On"   value={new Date(contact.createdAtUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
            <InfoRow icon="finger-print-outline" label="Contact ID" value={String(contact.id)} />
          </Section>

          <TouchableOpacity
            style={[contactsStyles.detailEditBtn, { cursor: Platform.OS === 'web' ? 'pointer' : undefined, marginBottom: isMobile ? 20 : 0 }]}
            onPress={() => onEdit(contact)}
          >
            <Icon name="create-outline" size={16} color={colors.navy} />
            <Text style={contactsStyles.detailEditBtnText}>Edit Contact</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ImageViewer
        visible={!!viewingImage}
        images={viewingImage?.images || []}
        currentIndex={viewingImage?.currentIndex || 0}
        label={`${personName} - ${viewingImage?.images[viewingImage?.currentIndex]?.label || 'Card'}`}
        onClose={() => setViewingImage(null)}
        onNext={() => viewingImage && setViewingImage({ ...viewingImage, currentIndex: viewingImage.currentIndex + 1 })}
        onPrev={() => viewingImage && setViewingImage({ ...viewingImage, currentIndex: viewingImage.currentIndex - 1 })}
      />
    </View>
  );
};

// ─── Contact Card ─────────────────────────────────────────────────────────────
const ContactCard = ({ contact, onPress, onDeleteRequest, selected }: {
  contact: ContactDetail; onPress: (c: ContactDetail) => void;
  onDeleteRequest: (id: string | number, name: string) => void; selected?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const personName = contact.personName ?? 'Unknown';

  return (
    <TouchableOpacity
      style={[
        contactsStyles.contactCard,
        Platform.OS === 'web' && { cursor: 'pointer' },
        selected && { borderWidth: 2, borderColor: colors.amber, backgroundColor: 'rgba(245,159,10,0.03)' },
        isMobile && { flexDirection: 'column', alignItems: 'center', textAlign: 'center' as any },
      ]}
      activeOpacity={0.78}
      onPress={() => onPress(contact)}
    >
      <View style={[
        contactsStyles.contactAvatar,
        { backgroundColor: getAvatarColor(personName) },
        isMobile && { marginBottom: 12 }
      ]}>
        <Text style={contactsStyles.contactAvatarText}>{getInitials(personName)}</Text>
      </View>

      <View style={[contactsStyles.contactBody, isMobile && { alignItems: 'center', paddingHorizontal: 8 }]}>
        <Text style={[contactsStyles.contactName, { textAlign: isMobile ? 'center' : 'left' }]} numberOfLines={1}>{personName}</Text>
        <Text style={[contactsStyles.contactRole, { textAlign: isMobile ? 'center' : 'left' }]} numberOfLines={1}>{contact.designation ?? '—'}</Text>
        <Text style={[contactsStyles.contactCompany, { textAlign: isMobile ? 'center' : 'left' }]} numberOfLines={1}>{contact.companyName ?? '—'}</Text>
        {!isMobile && (
          <View style={contactsStyles.contactDetails}>
            <View style={contactsStyles.contactRow}>
              <Icon name="mail-outline" size={10} color={colors.amberDark} />
              <Text style={contactsStyles.contactRowText} numberOfLines={1}>{contact.email1 ?? contact.email2 ?? 'No email'}</Text>
            </View>
            <View style={contactsStyles.contactRow}>
              <Icon name="call-outline" size={10} color={colors.amberDark} />
              <Text style={contactsStyles.contactRowText} numberOfLines={1}>{contact.phoneNumber1 ?? contact.phoneNumber2 ?? 'No phone'}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[contactsStyles.contactRight, isMobile && { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, width: '100%' }]}>
        <Text style={contactsStyles.contactDate}>{formatDate(contact.createdAtUtc)}</Text>
        <TouchableOpacity
          style={[contactsStyles.contactMore, Platform.OS === 'web' && { cursor: 'pointer' }]}
          onPress={(e) => { e.stopPropagation?.(); onDeleteRequest(contact.id, personName); }}
        >
          <Icon name="trash-outline" size={12} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Search Input Component ─────────────────────────────────────────────────
const SearchInput = React.memo(({ value, onChange }: { value: string; onChange: (text: string) => void }) => {
  const inputRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  
  useEffect(() => {
    if (inputRef.current && typeof inputRef.current.focus === 'function' && Platform.OS === 'web') {
      inputRef.current.focus();
    }
  }, []);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Icon name="search-outline" size={isMobile ? 14 : 15} color={colors.muted}
        style={{ position: 'absolute', left: isMobile ? 12 : 14, top: isMobile ? 9 : 11, zIndex: 1 }} />
      <TextInput
        ref={inputRef}
        style={[contactsStyles.searchInput, { 
          paddingLeft: isMobile ? 38 : 44, 
          paddingVertical: isMobile ? 8 : 10, 
          fontSize: isMobile ? 13 : 14,
          ...(Platform.OS === 'web' && { outlineStyle: 'none' })
        }]}
        placeholder="Search name, company, email…"
        placeholderTextColor={colors.inputPlaceholder}
        value={value}
        onChangeText={onChange}
        autoFocus={Platform.OS === 'web'}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChange('')}
          style={{ position: 'absolute', right: isMobile ? 10 : 12, top: isMobile ? 8 : 10 }}
        >
          <Icon name="close-circle" size={isMobile ? 15 : 17} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ContactsScreen() {
  const { profile, loading: profileLoading } = useProfile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedId, setSelectedId]   = useState<string | number | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [loadingDetail, setLoadingDetail]     = useState(false);
  const [detailVisible, setDetailVisible]     = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editContact, setEditContact] = useState<ContactDetail | null>(null);
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | number; name: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast, show: showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const { contacts, loading, error, fetchContacts, fetchContact, removeContact, editContact: updateContactHook, total } = useContact(1, 50);

  // Responsive columns
  const { columns, gap, paddingHorizontal, cardWidth } = getResponsiveConfig(screenWidth);
  const CONTACTS_PER_PAGE = columns * 3; // 3 rows per page

  // Check admin role
  useEffect(() => {
    const checkRole = async () => {
      const roles = await getRoles();
      if (roles?.includes("Admin")) setIsAdmin(true);
    };
    checkRole();
  }, []);

  useFocusEffect(useCallback(() => { fetchContacts(); setCurrentPage(1); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchContacts(1); setRefreshing(false); setCurrentPage(1); };

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (!q || c.personName?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q) ||
             c.email1?.toLowerCase().includes(q) || c.email2?.toLowerCase().includes(q)) 
    );
  });

  // Pagination logic
  const indexOfLastContact = currentPage * CONTACTS_PER_PAGE;
  const indexOfFirstContact = indexOfLastContact - CONTACTS_PER_PAGE;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleContactPress = async (c: ContactDetail) => {
    setSelectedId(c.id);
    setDetailVisible(true);
    setSelectedContact(null);
    setLoadingDetail(true);
    try {
      setSelectedContact(await fetchContact(c.id));
    } catch {
      showToast('Failed to load contact', 'error');
      setDetailVisible(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteRequest = (id: string | number, name: string) =>
    setConfirmDelete({ id, name });

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await removeContact(confirmDelete.id);
      if (selectedId === confirmDelete.id) {
        setDetailVisible(false); setSelectedContact(null); setSelectedId(null);
      }
      showToast('Contact deleted', 'success');
      await fetchContacts();
      if (currentContacts.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch {
      showToast('Failed to delete contact', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEdit = (c: ContactDetail) => {
    setDetailVisible(false);
    setEditContact(c);
    setEditVisible(true);
  };

  const handleSave = async (form: any) => {
    if (!editContact) return;
    setSaving(true);
    try {
      // The updateContactHook expects the form data that includes the new fields
      await updateContactHook(editContact.id, form);
      await fetchContacts();
      setEditVisible(false);
      showToast('Contact updated', 'success');
    } catch {
      showToast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportContactsWeb();
      showToast('Export completed successfully', 'success');
    } catch (error) {
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const [roles, setRoles] = useState<string[] | null>(null);

  useEffect(() => {
    const loadRoles = async () => {
      const storedRoles = await getRoles();
      setRoles(storedRoles);
    };
    loadRoles();
  }, []);
  
  // Get user details for sidebar
  const getUserFullName = () => profile?.userName || "User";
  const getUserInitials = () => profile?.userName ? getInitials(profile.userName) : "U";
  const getUserAvatarColor = () => profile?.userName ? getAvatarColor(profile.userName) : colors.amber;

  const isMobile = screenWidth < 640;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;

  const ContactsContent = () => {
    if (profileLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.amber} />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, flexDirection: 'column', backgroundColor: colors.phoneBg }}>
        <StatusBar barStyle="light-content" />

        {/* ── Fixed Header Section ── */}
        <View style={{ flexShrink: 0 }}>
          {/* Page header */}
          <View style={{
            backgroundColor: colors.navy,
            paddingHorizontal: isMobile ? 20 : isTablet ? 24 : 32,
            paddingTop: isMobile ? 20 : 26,
            paddingBottom: isMobile ? 16 : 22,
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 12 : 0,
          }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 9 : 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Your network
              </Text>
              <Text style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: '800', marginTop: 3, letterSpacing: -0.5 }}>Contacts</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                backgroundColor: 'rgba(245,159,10,0.12)',
                borderRadius: 20,
                paddingHorizontal: isMobile ? 10 : 14,
                paddingVertical: isMobile ? 5 : 7,
                borderWidth: 1,
                borderColor: 'rgba(245,159,10,0.2)',
              }}>
                <Text style={{ color: colors.amber, fontSize: isMobile ? 11 : 12, fontWeight: '700' }}>{total} total</Text>
              </View>
              <TouchableOpacity
                onPress={handleExport}
                disabled={isExporting}
                style={[contactsStyles.headerBtn, { opacity: isExporting ? 0.6 : 1, padding: isMobile ? 8 : 10 }]}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.amber} />
                ) : (
                  <Icon name="download-outline" size={isMobile ? 14 : 16} color={colors.amber} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Toolbar */}
          <View style={{ width: '100%', alignItems: 'center', backgroundColor: '#fff' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              maxWidth: 1200,
              paddingHorizontal: isMobile ? 16 : paddingHorizontal,
              paddingVertical: isMobile ? 12 : 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
            </View>
          </View>

          {/* Count row */}
          <View style={{ width: '100%', alignItems: 'center', backgroundColor: colors.phoneBg }}>
            <View style={{ width: '100%', maxWidth: 1200, paddingHorizontal: isMobile ? 16 : paddingHorizontal }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: isMobile ? 8 : 10 }}>
                <Text style={[contactsStyles.countText, { fontSize: isMobile ? 12 : 13 }]}>
                  <Text style={contactsStyles.countStrong}>{filteredContacts.length}</Text> of {total} contacts
                  {searchQuery ? <Text style={{ color: colors.amberDark }}> · "{searchQuery}"</Text> : null}
                </Text>
                <TouchableOpacity style={[contactsStyles.sortBtn, { paddingHorizontal: isMobile ? 8 : 12, paddingVertical: isMobile ? 5 : 6 }]}>
                  <Icon name="swap-vertical-outline" size={isMobile ? 10 : 11} color={colors.amberDark} />
                  <Text style={[contactsStyles.sortText, { fontSize: isMobile ? 11 : 12 }]}>Newest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.amber]} tintColor={colors.amber} />}
          scrollEventThrottle={400}
        >
          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 1200, paddingHorizontal: isMobile ? 16 : paddingHorizontal, paddingTop: 4, paddingBottom: isMobile ? 30 : 40 }}>
              {loading && !refreshing && contacts.length === 0 && (
                <View style={{ padding: isMobile ? 40 : 60, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.amber} />
                  <Text style={{ color: colors.muted, marginTop: 14 }}>Loading contacts…</Text>
                </View>
              )}

              {error && (
                <View style={{ padding: isMobile ? 30 : 40, alignItems: 'center' }}>
                  <Icon name="warning-outline" size={isMobile ? 28 : 36} color={colors.error} />
                  <Text style={{ color: colors.error, marginTop: 10, marginBottom: 14 }}>{error}</Text>
                  <TouchableOpacity onPress={() => fetchContacts(1)} style={{ paddingHorizontal: isMobile ? 16 : 20, paddingVertical: isMobile ? 8 : 10, backgroundColor: colors.amber, borderRadius: 10 }}>
                    <Text style={{ color: colors.navy, fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!error && !loading && filteredContacts.length === 0 && (
                <View style={{ padding: isMobile ? 40 : 60, alignItems: 'center' }}>
                  <Icon name="people-outline" size={isMobile ? 44 : 52} color={colors.muted} />
                  <Text style={{ marginTop: 14, color: colors.muted, fontSize: isMobile ? 14 : 15 }}>
                    {searchQuery ? `No results for "${searchQuery}"` : 'No contacts yet.'}
                  </Text>
                  {searchQuery && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginTop: 12, paddingHorizontal: isMobile ? 14 : 18, paddingVertical: isMobile ? 7 : 9, backgroundColor: colors.amber, borderRadius: 9 }}>
                      <Text style={{ color: colors.navy, fontWeight: '700', fontSize: isMobile ? 12 : 13 }}>Clear search</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!error && currentContacts.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap }}>
                  {currentContacts.map((c) => (
                    <View key={c.id} style={{ width: cardWidth, marginBottom: gap }}>
                      <ContactCard
                        contact={c}
                        onPress={handleContactPress}
                        onDeleteRequest={handleDeleteRequest}
                        selected={selectedId === c.id && detailVisible}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: isMobile ? 12 : 16,
                  marginTop: isMobile ? 20 : 24,
                  marginBottom: isMobile ? 12 : 16,
                  paddingVertical: isMobile ? 12 : 16,
                  flexWrap: 'wrap',
                }}>
                  <TouchableOpacity
                    onPress={prevPage}
                    disabled={currentPage === 1}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: isMobile ? 6 : 8,
                        paddingHorizontal: isMobile ? 12 : 16,
                        paddingVertical: isMobile ? 6 : 8,
                        borderRadius: 10,
                        backgroundColor: currentPage === 1 ? colors.border : colors.amber,
                        opacity: currentPage === 1 ? 0.5 : 1,
                      },
                      currentPage === 1 && { cursor: Platform.OS === 'web' ? 'default' : undefined },
                    ]}
                  >
                    <Icon name="chevron-back-outline" size={isMobile ? 14 : 16} color={currentPage === 1 ? colors.muted : colors.navy} />
                    <Text style={{
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: '600',
                      color: currentPage === 1 ? colors.muted : colors.navy,
                    }}>Previous</Text>
                  </TouchableOpacity>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.phoneBg,
                    paddingHorizontal: isMobile ? 12 : 16,
                    paddingVertical: isMobile ? 5 : 6,
                    borderRadius: 20,
                  }}>
                    <Icon name="grid-outline" size={isMobile ? 12 : 14} color={colors.amber} />
                    <Text style={{
                      fontSize: isMobile ? 12 : 13,
                      color: colors.text,
                      fontWeight: '500',
                    }}>
                      Page {currentPage} of {totalPages}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={nextPage}
                    disabled={currentPage === totalPages}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: isMobile ? 6 : 8,
                        paddingHorizontal: isMobile ? 12 : 16,
                        paddingVertical: isMobile ? 6 : 8,
                        borderRadius: 10,
                        backgroundColor: currentPage === totalPages ? colors.border : colors.amber,
                        opacity: currentPage === totalPages ? 0.5 : 1,
                      },
                      currentPage === totalPages && { cursor: Platform.OS === 'web' ? 'default' : undefined },
                    ]}
                  >
                    <Text style={{
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: '600',
                      color: currentPage === totalPages ? colors.muted : colors.navy,
                    }}>Next</Text>
                    <Icon name="chevron-forward-outline" size={isMobile ? 14 : 16} color={currentPage === totalPages ? colors.muted : colors.navy} />
                  </TouchableOpacity>
                </View>
              )}

              {loading && contacts.length < total && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.amber} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* ── Right: detail panel ── */}
        <DetailPanel
          visible={detailVisible}
          contact={selectedContact}
          loading={loadingDetail}
          onClose={() => { setDetailVisible(false); setSelectedContact(null); setSelectedId(null); }}
          onEdit={handleEdit}
          onDeleteRequest={handleDeleteRequest}
        />
      </View>
    );
  };

  return (
    <SidebarLayout
      isAdmin={isAdmin}
      userInitials={getUserInitials()}
      userAvatarColor={getUserAvatarColor()}
      userName={getUserFullName()}
      userRole={roles?.[0]}
    >
      <ContactsContent />
      <EditDialog
        visible={editVisible}
        contact={editContact}
        onClose={() => setEditVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
      <ConfirmDialog
        visible={!!confirmDelete}
        title="Delete Contact"
        message={`Permanently delete ${confirmDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </SidebarLayout>
  );
}