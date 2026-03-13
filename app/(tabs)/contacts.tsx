// app/(tabs)/contacts.tsx
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
  Alert,
  Image,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useContact } from '@/hooks/useContact';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ChipType = 'All' | 'Lead' | 'Partner' | 'Client' | 'Vendor';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
};

const AVATAR_COLORS = [
  '#1e3a5f', '#1a4731', '#3b1f6e', '#3d1a1a', '#1a3a3a',
  '#5f2e1e', '#2e1e5f', '#1e5f2e', '#5f1e4a', '#4a1e5f',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

const getTagFromDesignation = (designation = ''): ChipType => {
  const d = designation.toLowerCase();
  if (d.includes('partner') || d.includes('head')) return 'Partner';
  if (d.includes('cto') || d.includes('director') || d.includes('vp')) return 'Lead';
  if (d.includes('manager') || d.includes('product')) return 'Vendor';
  return 'Client';
};

const getTagStyle = (tag: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    Lead:    { bg: colors.leadBg,    color: colors.lead },
    Partner: { bg: colors.partnerBg, color: colors.partner },
    Client:  { bg: colors.clientBg,  color: colors.client },
    Vendor:  { bg: colors.vendorBg,  color: colors.vendor },
  };
  return map[tag] ?? map.Lead;
};

const buildImageUri = (base64?: string, mime?: string, url?: string) => {
  if (url) return url;
  if (base64) return `data:${mime ?? 'image/jpeg'};base64,${base64}`;
  return null;
};

// ─── Image Fullscreen Viewer ──────────────────────────────────────────────

const ImageViewer = ({
  visible,
  uri,
  label,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  label: string;
  onClose: () => void;
}) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={contactsStyles.imgViewerOverlay}>
      <TouchableOpacity style={contactsStyles.imgViewerClose} onPress={onClose}>
        <Icon name="close-circle" size={32} color={colors.white} />
      </TouchableOpacity>
      <Text style={contactsStyles.imgViewerLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={contactsStyles.imgViewerImage} resizeMode="contain" />
      ) : (
        <View style={contactsStyles.imgViewerPlaceholder}>
          <Icon name="image-outline" size={48} color={colors.muted} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>No image available</Text>
        </View>
      )}
    </View>
  </Modal>
);

// ─── Edit Sheet ───────────────────────────────────────────────────────────

type EditForm = {
  personName: string;
  designation: string;
  companyName: string;
  subCompanyName: string;
  branchName: string;
  phoneNumber1: string;
  phoneNumber2: string;
  phoneNumber3: string;
  email1: string;
  email2: string;
  address: string;
  website1: string;
  website2: string;
  servicesCsv: string;
};

const EditSheet = ({
  visible,
  contact,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  contact: ContactDetail | null;
  onClose: () => void;
  onSave: (form: EditForm) => void;
  saving: boolean;
}) => {
  const [form, setForm] = useState<EditForm>({
    personName: '',
    designation: '',
    companyName: '',
    subCompanyName: '',
    branchName: '',
    phoneNumber1: '',
    phoneNumber2: '',
    phoneNumber3: '',
    email1: '',
    email2: '',
    address: '',
    website1: '',
    website2: '',
    servicesCsv: '',
  });

  useEffect(() => {
    if (contact) {
      setForm({
        personName:    contact.personName    ?? '',
        designation:   contact.designation   ?? '',
        companyName:   contact.companyName   ?? '',
        subCompanyName:contact.subCompanyName ?? '',
        branchName:    contact.branchName    ?? '',
        phoneNumber1:  contact.phoneNumber1  ?? '',
        phoneNumber2:  contact.phoneNumber2  ?? '',
        phoneNumber3:  contact.phoneNumber3  ?? '',
        email1:        contact.email1        ?? '',
        email2:        contact.email2        ?? '',
        address:       contact.address       ?? '',
        website1:      contact.website1      ?? '',
        website2:      contact.website2      ?? '',
        servicesCsv:   contact.servicesCsv   ?? '',
      });
    }
  }, [contact]);

  const set = (key: keyof EditForm) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const Field = ({
    label,
    field,
    placeholder,
    keyboardType,
  }: {
    label: string;
    field: keyof EditForm;
    placeholder?: string;
    keyboardType?: any;
  }) => (
    <View style={contactsStyles.editField}>
      <Text style={contactsStyles.editFieldLabel}>{label}</Text>
      <TextInput
        style={contactsStyles.editFieldInput}
        value={form[field]}
        onChangeText={set(field)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        placeholderTextColor={colors.inputPlaceholder}
        keyboardType={keyboardType}
        returnKeyType="next"
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={contactsStyles.editOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={contactsStyles.editSheet}>
            {/* Handle */}
            <View style={contactsStyles.editHandle} />

            {/* Header */}
            <View style={contactsStyles.editHeader}>
              <Text style={contactsStyles.editTitle}>Edit Contact</Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <Text style={contactsStyles.editSectionHeading}>Personal</Text>
              <Field label="Full Name"   field="personName" />
              <Field label="Designation" field="designation" />

              <Text style={contactsStyles.editSectionHeading}>Company</Text>
              <Field label="Company Name"  field="companyName" />
              <Field label="Sub Company"   field="subCompanyName" />
              <Field label="Branch"        field="branchName" />

              <Text style={contactsStyles.editSectionHeading}>Phone Numbers</Text>
              <Field label="Phone 1" field="phoneNumber1" keyboardType="phone-pad" />
              <Field label="Phone 2" field="phoneNumber2" keyboardType="phone-pad" />
              <Field label="Phone 3" field="phoneNumber3" keyboardType="phone-pad" />

              <Text style={contactsStyles.editSectionHeading}>Email</Text>
              <Field label="Email 1" field="email1" keyboardType="email-address" />
              <Field label="Email 2" field="email2" keyboardType="email-address" />

              <Text style={contactsStyles.editSectionHeading}>Other</Text>
              <Field label="Address"  field="address" />
              <Field label="Website 1" field="website1" keyboardType="url" />
              <Field label="Website 2" field="website2" keyboardType="url" />
              <Field label="Services (comma separated)" field="servicesCsv" />

              <TouchableOpacity
                style={[contactsStyles.editSaveBtn, saving && { opacity: 0.7 }]}
                onPress={() => onSave(form)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.navy} />
                ) : (
                  <>
                    <Icon name="checkmark-circle-outline" size={18} color={colors.navy} />
                    <Text style={contactsStyles.editSaveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Contact Detail Modal ─────────────────────────────────────────────────

const ContactDetailModal = ({
  visible,
  contact,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  contact: ContactDetail | null;
  onClose: () => void;
  onEdit: (contact: ContactDetail) => void;
  onDelete: (id: string | number) => void;
}) => {
  const [viewingImage, setViewingImage] = useState<{ uri: string | null; label: string } | null>(null);

  if (!contact) return null;
const frontImage = contact.frontImageAsString;
const backImage  = contact.backImageAsString;
  const personName = contact.personName ?? 'Unknown';
  const initials = getInitials(personName);
  const avatarBg = getAvatarColor(personName);
  const tag = getTagFromDesignation(contact.designation);
  const tagStyle = getTagStyle(tag);

  const frontUri = buildImageUri(contact.frontImage, contact.frontImageMimeType);
  const backUri  = buildImageUri(contact.backImage,  contact.backImageMimeType);

  // Collect non-empty values
  const phones   = [contact.phoneNumber1, contact.phoneNumber2, contact.phoneNumber3].filter(Boolean) as string[];
  const emails   = [contact.email1, contact.email2].filter(Boolean) as string[];
  const websites = [contact.website1, contact.website2].filter(Boolean) as string[];
  const services = contact.servicesCsv ? contact.servicesCsv.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const handleDelete = () => {
    Alert.alert('Delete Contact', `Are you sure you want to delete ${personName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(contact.id); onClose(); } },
    ]);
  };

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={contactsStyles.detailRow}>
      <View style={contactsStyles.detailIconWrap}>
        <Icon name={icon} size={15} color={colors.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={contactsStyles.detailRowLabel}>{label}</Text>
        <Text style={contactsStyles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={contactsStyles.detailSection}>
      <Text style={contactsStyles.detailSectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={contactsStyles.detailOverlay}>
        <View style={contactsStyles.detailSheet}>

          {/* Drag handle */}
          <View style={contactsStyles.detailHandle} />

          {/* Top bar */}
          <View style={contactsStyles.detailTopBar}>
            <TouchableOpacity onPress={onClose} style={contactsStyles.detailCloseBtn}>
              <Icon name="chevron-down" size={22} color={colors.muted} />
            </TouchableOpacity>
            <Text style={contactsStyles.detailTopTitle}>Contact Details</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={contactsStyles.detailActionBtn} onPress={() => onEdit(contact)}>
                <Icon name="create-outline" size={18} color={colors.amber} />
              </TouchableOpacity>
              <TouchableOpacity style={[contactsStyles.detailActionBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }]} onPress={handleDelete}>
                <Icon name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Hero Header */}
            <View style={contactsStyles.detailHero}>
              <View style={contactsStyles.detailHeroGlow} />
              <View style={[contactsStyles.detailAvatar, { backgroundColor: avatarBg }]}>
                <Text style={contactsStyles.detailAvatarText}>{initials}</Text>
              </View>
              <Text style={contactsStyles.detailName}>{personName}</Text>
              <Text style={contactsStyles.detailDesignation}>{contact.designation ?? 'No designation'}</Text>
              {contact.companyName ? (
                <Text style={contactsStyles.detailCompany}>{contact.companyName}</Text>
              ) : null}
              <View style={[contactsStyles.detailTag, { backgroundColor: tagStyle.bg }]}>
                <Text style={[contactsStyles.detailTagText, { color: tagStyle.color }]}>{tag}</Text>
              </View>
            </View>

            {/* Business Card Images */}
            <View style={contactsStyles.detailCardsRow}>
              {/* Front */}
              <TouchableOpacity
                style={contactsStyles.detailCardBox}
                onPress={() => setViewingImage({ uri: frontUri, label: 'Front Side' })}
                activeOpacity={0.85}
              >
                {frontUri ? (
                  <Image source={{ uri: frontUri }} style={contactsStyles.detailCardImage} resizeMode="cover" />
                ) : (
                  <View style={contactsStyles.detailCardPlaceholder}>
                    <Icon name="card-outline" size={28} color="rgba(255,255,255,0.35)" />
                    <Text style={contactsStyles.detailCardPlaceholderText}>Front</Text>
                  </View>
                )}
                <View style={contactsStyles.detailCardBadge}>
                  <Icon name="eye-outline" size={10} color={colors.amberDark} />
                  <Text style={contactsStyles.detailCardBadgeText}>Front</Text>
                </View>
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                style={contactsStyles.detailCardBox}
                onPress={() => setViewingImage({ uri: backUri, label: 'Back Side' })}
                activeOpacity={0.85}
              >
                {backUri ? (
                  <Image source={{ uri: backUri }} style={contactsStyles.detailCardImage} resizeMode="cover" />
                ) : (
                  <View style={contactsStyles.detailCardPlaceholder}>
                    <Icon name="card-outline" size={28} color="rgba(255,255,255,0.35)" />
                    <Text style={contactsStyles.detailCardPlaceholderText}>Back</Text>
                  </View>
                )}
                <View style={contactsStyles.detailCardBadge}>
                  <Icon name="eye-outline" size={10} color={colors.amberDark} />
                  <Text style={contactsStyles.detailCardBadgeText}>Back</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={contactsStyles.detailBody}>

              {/* Phones */}
              {phones.length > 0 && (
                <SectionCard title="Phone Numbers">
                  {phones.map((p, i) => (
                    <InfoRow key={i} icon="call-outline" label={i === 0 ? 'Primary' : i === 1 ? 'Office' : 'Mobile 2'} value={p} />
                  ))}
                </SectionCard>
              )}

              {/* Emails */}
              {emails.length > 0 && (
                <SectionCard title="Email Addresses">
                  {emails.map((e, i) => (
                    <InfoRow key={i} icon="mail-outline" label={`Email ${i + 1}`} value={e} />
                  ))}
                </SectionCard>
              )}

              {/* Company */}
              {(contact.companyName || contact.subCompanyName || contact.branchName) && (
                <SectionCard title="Company">
                  {contact.companyName    && <InfoRow icon="business-outline"  label="Company"     value={contact.companyName} />}
                  {contact.subCompanyName && <InfoRow icon="git-branch-outline" label="Sub Company" value={contact.subCompanyName} />}
                  {contact.branchName     && <InfoRow icon="location-outline"  label="Branch"      value={contact.branchName} />}
                </SectionCard>
              )}

              {/* Address */}
              {contact.address && (
                <SectionCard title="Address">
                  <InfoRow icon="map-outline" label="Office Address" value={contact.address} />
                </SectionCard>
              )}

              {/* Websites */}
              {websites.length > 0 && (
                <SectionCard title="Websites">
                  {websites.map((w, i) => (
                    <InfoRow key={i} icon="globe-outline" label={`Website ${i + 1}`} value={w} />
                  ))}
                </SectionCard>
              )}

              {/* Services */}
              {services.length > 0 && (
                <SectionCard title="Services">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                    {services.map((s, i) => (
                      <View key={i} style={contactsStyles.detailServiceTag}>
                        <Text style={contactsStyles.detailServiceText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </SectionCard>
              )}

              {/* Meta */}
              <SectionCard title="Meta">
                <InfoRow icon="calendar-outline" label="Added On" value={new Date(contact.createdAtUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <InfoRow icon="finger-print-outline" label="Contact ID" value={String(contact.id)} />
              </SectionCard>

              {/* Edit Button */}
              <TouchableOpacity style={contactsStyles.detailEditBtn} onPress={() => onEdit(contact)}>
                <Icon name="create-outline" size={18} color={colors.navy} />
                <Text style={contactsStyles.detailEditBtnText}>Edit Contact</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </View>

      {/* Fullscreen image viewer */}
      <ImageViewer
        visible={!!viewingImage}
        uri={viewingImage?.uri ?? null}
        label={viewingImage?.label ?? ''}
        onClose={() => setViewingImage(null)}
      />
    </Modal>
  );
};

// ─── Contact Card ─────────────────────────────────────────────────────────

const ContactCard = ({
  contact,
  onPress,
  onDelete,
}: {
  contact: ContactDetail;
  onPress: (c: ContactDetail) => void;
  onDelete: (id: string | number) => void;
}) => {
  const personName = contact.personName ?? 'Unknown';
  const initials   = getInitials(personName);
  const avatarBg   = getAvatarColor(personName);
  const tag        = getTagFromDesignation(contact.designation);
  const tagStyle   = getTagStyle(tag);
  const phone      = contact.phoneNumber1 ?? contact.phoneNumber2 ?? contact.phoneNumber3 ?? 'No phone';
  const email      = contact.email1 ?? contact.email2 ?? 'No email';
  const formattedDate = formatDate(contact.createdAtUtc);

  const frontUri = buildImageUri(contact.frontImage, contact.frontImageMimeType);

  return (
    <TouchableOpacity style={contactsStyles.contactCard} activeOpacity={0.75} onPress={() => onPress(contact)}>
      {frontUri ? (
        <Image source={{ uri: frontUri }} style={contactsStyles.contactAvatar} />
      ) : (
        <View style={[contactsStyles.contactAvatar, { backgroundColor: avatarBg }]}>
          <Text style={contactsStyles.contactAvatarText}>{initials}</Text>
        </View>
      )}

      <View style={contactsStyles.contactBody}>
        <Text style={contactsStyles.contactName} numberOfLines={1}>{personName}</Text>
        <Text style={contactsStyles.contactRole}    numberOfLines={1}>{contact.designation ?? 'No designation'}</Text>
        <Text style={contactsStyles.contactCompany} numberOfLines={1}>{contact.companyName ?? 'No company'}</Text>

        <View style={contactsStyles.contactDetails}>
          <View style={contactsStyles.contactRow}>
            <Icon name="mail-outline"  size={10} color={colors.amberDark} />
            <Text style={contactsStyles.contactRowText} numberOfLines={1}>{email}</Text>
          </View>
          <View style={contactsStyles.contactRow}>
            <Icon name="call-outline" size={10} color={colors.amberDark} />
            <Text style={contactsStyles.contactRowText} numberOfLines={1}>{phone}</Text>
          </View>
        </View>

        <View style={contactsStyles.contactTags}>
          <Text style={[contactsStyles.tag, { backgroundColor: tagStyle.bg, color: tagStyle.color }]}>{tag}</Text>
        </View>
      </View>

      <View style={contactsStyles.contactRight}>
        <Text style={contactsStyles.contactDate}>{formattedDate}</Text>
        <TouchableOpacity
          style={contactsStyles.contactMore}
          onPress={() => {
            Alert.alert('Delete Contact', `Delete ${personName}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(contact.id) },
            ]);
          }}
        >
          <Icon name="trash-outline" size={12} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const [activeChip, setActiveChip]     = useState<ChipType>('All');
  const [searchQuery, setSearchQuery]   = useState('');
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [detailVisible, setDetailVisible]     = useState(false);
  const [editVisible, setEditVisible]         = useState(false);
  const [editContact, setEditContact]         = useState<ContactDetail | null>(null);
  const [saving, setSaving]             = useState(false);

  const { contacts, loading, error, fetchContacts, removeContact, editContact: updateContactHook, loadMore, total } = useContact(1, 50);

 useFocusEffect(
  useCallback(() => {
    fetchContacts(); // your API reload function
  }, [])
);


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContacts(1);
    setRefreshing(false);
  };

  const handleDelete = async (id: string | number) => {
  try {
    await removeContact(id);

    setDetailVisible(false);
    setSelectedContact(null);

    Alert.alert("Success", "Contact deleted");
  } catch {
    Alert.alert("Error", "Failed to delete contact");
  }
};


  const handleContactPress = (contact: ContactDetail) => {
    setSelectedContact(contact);
    setDetailVisible(true);
  };

  const handleEdit = (contact: ContactDetail) => {
    setDetailVisible(false);
    setTimeout(() => {
      setEditContact(contact);
      setEditVisible(true);
    }, 300);
  };

  const handleSave = async (form: any) => {
    if (!editContact) return;
    setSaving(true);
    try {
      await updateContactHook(editContact.id, form);
      await fetchContacts(); // refresh list
      setEditVisible(false);
      Alert.alert('Success', 'Contact updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };


  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      searchQuery === '' ||
      c.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email2?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchChip =
      activeChip === 'All' || getTagFromDesignation(c.designation) === activeChip;

    return matchSearch && matchChip;
  });

  if (loading && !refreshing && contacts.length === 0) {
    return (
      <View style={[contactsStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={contactsStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      <ScrollView
        style={contactsStyles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.amber]} tintColor={colors.amber} />
        }
        onScrollEndDrag={({ nativeEvent }) => {
          const close = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 20;
          if (close && contacts.length < total) loadMore();
        }}
        scrollEventThrottle={400}
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: colors.phoneBg, flexGrow: 1 }}
      >
        {/* Header */}
        <View style={contactsStyles.header}>
          <View style={contactsStyles.headerGlow} />
          <View style={contactsStyles.headerTop}>
            <View>
              <Text style={contactsStyles.greetText}>Your network</Text>
              <Text style={contactsStyles.titleText}>Contacts</Text>
            </View>
            <View style={contactsStyles.headerActions}>
              <TouchableOpacity style={contactsStyles.headerBtn}>
                <Icon name="document-text-outline" size={14} color={colors.amber} />
              </TouchableOpacity>
              <TouchableOpacity style={contactsStyles.headerBtn}>
                <Icon name="add-outline" size={14} color={colors.amber} />
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Search */}
        <View style={contactsStyles.searchWrap}>
          <Icon name="search-outline" size={14} color={colors.muted} style={contactsStyles.searchIcon} />
          <TextInput
            style={contactsStyles.searchInput}
            placeholder="Search by name, company, email..."
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={contactsStyles.searchFilter}>
            <Icon name="options-outline" size={12} color={colors.amber} />
          </TouchableOpacity>
        </View>

        {/* Count */}
        <View style={contactsStyles.countBar}>
          <Text style={contactsStyles.countText}>
            Showing <Text style={contactsStyles.countStrong}>{filteredContacts.length}</Text> of {total} contacts
          </Text>
          <TouchableOpacity style={contactsStyles.sortBtn}>
            <Icon name="swap-vertical-outline" size={11} color={colors.amberDark} />
            <Text style={contactsStyles.sortText}>Newest</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 10 }}>{error}</Text>
            <TouchableOpacity onPress={() => fetchContacts(1)} style={{ padding: 8, backgroundColor: colors.amber, borderRadius: 8 }}>
              <Text style={{ color: colors.white }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!error && filteredContacts.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center', flex: 1 }}>
            <Icon name="people-outline" size={48} color={colors.muted} />
            <Text style={{ marginTop: 12, color: colors.muted, textAlign: 'center' }}>
              {searchQuery ? 'No contacts match your search' : 'No contacts yet. Add your first one!'}
            </Text>
          </View>
        )}

        {/* List */}
        {!error && filteredContacts.length > 0 && (
          <View style={contactsStyles.contactList}>
            {filteredContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} onPress={handleContactPress} onDelete={handleDelete} />
            ))}
            {loading && contacts.length < total && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.amber} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <ContactDetailModal
        visible={detailVisible}
        contact={selectedContact}
        onClose={() => setDetailVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Edit Sheet */}
      <EditSheet
        visible={editVisible}
        contact={editContact}
        onClose={() => setEditVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </View>
  );
}