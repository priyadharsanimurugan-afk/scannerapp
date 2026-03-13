// app/(tabs)/scan.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  Text, View, StyleSheet, Alert, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import MlkitOcr from 'react-native-mlkit-ocr';
import { Ionicons } from '@expo/vector-icons';

import { useCards, ScannedCard, OCRData } from '@/components/store/useCardStore';
import { useContact } from '@/hooks/useContact';
import { colors } from '@/constants/colors';
import { CameraStyles, scanStyles } from '@/components/styles/scanStyles';
import { router } from 'expo-router';

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface FieldItem {
  id: string;
  type: string;
  value: string;
  order: number;
}

interface ExtendedScannedCard extends ScannedCard {
  fields?: FieldItem[];
  backUri?: string;
  hasBothSides?: boolean;
}

// ─────────────────────────────────────────────────────
// INTELLIGENT FIELD CLASSIFIER
// ─────────────────────────────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}$/;
const URL_RE = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/;
const PINCODE_RE = /^\d{6}$/;
const NAME_RE = /^[A-Za-z\s.'\-]+$/;

const DESIG_KEYWORDS = ['manager', 'director', 'engineer', 'developer', 'designer',
  'officer', 'president', 'head', 'lead', 'specialist', 'analyst', 'consultant',
  'associate', 'founder', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'executive',
  'proprietor', 'partner', 'chairman', 'md', 'gm', 'sr.', 'jr.', 'senior', 'junior'];

const COMPANY_INDICATORS = ['pvt', 'ltd', 'limited', 'llc', 'inc', 'corp', '& co',
  'company', 'industries', 'enterprises', 'solutions', 'technologies',
  'systems', 'group', 'associates', 'partners'];

const SERVICE_KEYWORDS = ['services', 'solutions', 'consulting', 'training', 'development',
  'design', 'manufacturing', 'trading', 'retail', 'wholesale', 'distribution',
  'import', 'export', 'agency', 'consultancy', 'software', 'hardware'];

const ADDR_KEYWORDS = ['road', 'rd', 'street', 'st', 'nagar', 'colony', 'sector', 'building',
  'near', 'opp', 'phase', 'block', 'avenue', 'lane', 'bypass', 'highway', 'floor',
  'plot', 'flat', 'door', 'house', 'office', 'shop', 'suite'];

export function smartClassify(value: string): string {
  const v = value.trim();
  const lower = v.toLowerCase();
  const scores: Record<string, number> = {
    email: 0, phone: 0, website: 0, pincode: 0,
    name: 0, designation: 0, company: 0, service: 0, address: 0, subcompany: 0, other: 0,
  };

  if (EMAIL_RE.test(v)) scores.email += 100;
  if (PINCODE_RE.test(v)) scores.pincode += 90;
  const digits = v.replace(/\D/g, '');
  if (PHONE_RE.test(v) && digits.length >= 7 && digits.length <= 15) scores.phone += 90;
  if (URL_RE.test(v) && !EMAIL_RE.test(v)) scores.website += 85;

  const desigMatches = DESIG_KEYWORDS.filter(k => lower.includes(k)).length;
  scores.designation += desigMatches * 30;

  const companyMatches = COMPANY_INDICATORS.filter(k => lower.includes(k)).length;
  scores.company += companyMatches * 28;

  const serviceMatches = SERVICE_KEYWORDS.filter(k => lower.includes(k)).length;
  scores.service += serviceMatches * 20;

  const addrMatches = ADDR_KEYWORDS.filter(k => lower.split(/\s+/).includes(k)).length;
  scores.address += addrMatches * 25;
  if (digits.length === 6 && /[1-9]/.test(v[0])) scores.address += 15;
  if (v.length > 40) scores.address += 10;

  if (NAME_RE.test(v) && v.split(' ').length >= 2 && v.split(' ').length <= 4
    && v.length < 30 && desigMatches === 0 && companyMatches === 0) {
    scores.name += 40;
    if (/^(mr|ms|mrs|dr|prof|er)[\s.]/i.test(v)) scores.name += 30;
    if (v === v.toUpperCase() && v.split(' ').length === 1) scores.name -= 20;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 10) scores.other += 5;

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

function reClassifyFields(fields: FieldItem[]): FieldItem[] {
  return fields.map(field => {
    const smartType = smartClassify(field.value);
    const hardTypes = ['email', 'phone', 'website', 'pincode'];
    if (hardTypes.includes(smartType) && field.type !== smartType) return { ...field, type: smartType };
    if (field.type === 'other' && smartType !== 'other') return { ...field, type: smartType };
    return field;
  });
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const cleanLine = (l: string) =>
  l.replace(/[|\\]/g, '').replace(/\s{2,}/g, ' ').trim();

const normalizeAddress = (a: string) =>
  a.replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim();

const extractAllFields = (rawText: string): FieldItem[] => {
  const lines = rawText.split('\n').map(cleanLine).filter(l => l.length > 2);
  const fullText = lines.join(' ');
  const fields: FieldItem[] = [];
  let idCounter = 0;

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set([...fullText.matchAll(emailRegex)].map(m => m[0].toLowerCase()))];
  emails.forEach(email => fields.push({ id: `email-${idCounter++}`, type: 'email', value: email, order: fields.length }));

  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;
  const phones = [...new Set([...fullText.matchAll(phoneRegex)].map(m => m[0].trim()))];
  phones.forEach(phone => {
    const d = phone.replace(/\D/g, '');
    if (d.length >= 7 && d.length <= 15) fields.push({ id: `phone-${idCounter++}`, type: 'phone', value: phone, order: fields.length });
  });

  const urlRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s,;)\]"']*)?/g;
  const urls = [...new Set([...fullText.matchAll(urlRegex)].map(m => m[0]))];
  urls.forEach(url => {
    if (!emails.some(e => url.includes(e))) fields.push({ id: `web-${idCounter++}`, type: 'website', value: url, order: fields.length });
  });

  const pincodeRegex = /\b[1-9][0-9]{5}\b/g;
  const pincodes = [...new Set([...fullText.matchAll(pincodeRegex)].map(m => m[0]))];
  pincodes.forEach(pin => fields.push({ id: `pin-${idCounter++}`, type: 'pincode', value: pin, order: fields.length }));

  const nameIndicators = ['mr', 'ms', 'mrs', 'dr', 'prof', 'er'];
  lines.forEach(line => {
    if (line.length > 3 && line.length < 30 && /^[A-Za-z\s.'-]+$/.test(line) && !line.includes('@') && line.split(' ').length <= 3) {
      const words = line.split(' ');
      if (words.length >= 2 || nameIndicators.some(ind => line.toLowerCase().includes(ind)))
        fields.push({ id: `name-${idCounter++}`, type: 'name', value: line.trim(), order: fields.length });
    }
  });

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (DESIG_KEYWORDS.some(k => lower.includes(k)) && line.length < 50)
      fields.push({ id: `desig-${idCounter++}`, type: 'designation', value: line.trim(), order: fields.length });
  });

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (COMPANY_INDICATORS.some(ind => lower.includes(ind)) && line.length < 60)
      fields.push({ id: `company-${idCounter++}`, type: 'company', value: line.trim(), order: fields.length });
  });

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (SERVICE_KEYWORDS.some(k => lower.includes(k)) && line.length < 50)
      fields.push({ id: `service-${idCounter++}`, type: 'service', value: line.trim(), order: fields.length });
  });

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (ADDR_KEYWORDS.some(k => lower.includes(k)) || pincodes.some(p => line.includes(p)))
      fields.push({ id: `addr-${idCounter++}`, type: 'address', value: normalizeAddress(line.trim()), order: fields.length });
  });

  lines.forEach(line => {
    if (line.length > 3 && line.length < 40 && !fields.some(f => f.value === line) && !/[^\w\s\-.,&@]/.test(line))
      fields.push({ id: `other-${idCounter++}`, type: 'other', value: line.trim(), order: fields.length });
  });

  const seen = new Set();
  const deduped = fields.filter(f => {
    const lower = f.value.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  return reClassifyFields(deduped);
};

async function uriToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

// ─────────────────────────────────────────────────────
// IMAGE CROPPER
// ─────────────────────────────────────────────────────
function ImageCropper({ uri, onCrop, onCancel }: { uri: string; onCrop: (uri: string) => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const cropImage = async () => {
    setLoading(true);
    try {
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      onCrop(result.uri);
    } catch { Alert.alert('Error', 'Failed to process image'); onCancel(); }
    finally { setLoading(false); }
  };
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="contain" />
      <View style={[CameraStyles.overlayTop, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      <View style={[CameraStyles.overlayBottom, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      <View style={[CameraStyles.overlayLeft, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      <View style={[CameraStyles.overlayRight, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      <View style={[CameraStyles.cardFrame, { borderColor: colors.amber, borderWidth: 2 }]} />
      <View style={CameraStyles.controls}>
        <TouchableOpacity style={CameraStyles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={18} color="#fff" /><Text style={CameraStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[CameraStyles.captureBtn, { backgroundColor: colors.amber }]} onPress={cropImage} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.navy} /> : <><Ionicons name="save" size={20} color={colors.navy} /><Text style={CameraStyles.captureText}>Use</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// CAMERA SCANNER
// ─────────────────────────────────────────────────────
type ScanMode = 'single' | 'front' | 'back';

function CameraScanner({ onCapture, onClose, mode = 'single', onFrontCaptured }: {
  onCapture: (uri: string) => void; onClose: () => void;
  mode?: ScanMode; onFrontCaptured?: (uri: string) => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCrop, setShowCrop] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color={colors.amber} />;
  if (!permission.granted) {
    return (
      <View style={[CameraStyles.center, { backgroundColor: colors.phoneBg }]}>
        <Ionicons name="camera-outline" size={52} color={colors.amber} />
        <Text style={[CameraStyles.permText, { color: colors.text }]}>Camera permission required</Text>
        <TouchableOpacity style={[CameraStyles.permBtn, { backgroundColor: colors.amber }]} onPress={requestPermission}>
          <Text style={{ color: colors.navy, fontWeight: '700', fontSize: 15 }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.95, skipProcessing: false });
      if (photo?.uri) { setCapturedUri(photo.uri); setShowCrop(true); }
    } catch (e: any) { Alert.alert('Capture Failed', e.message ?? 'Unknown error'); }
  };

  const handleCropComplete = (croppedUri: string) => {
    if (mode === 'front' && onFrontCaptured) onFrontCaptured(croppedUri);
    else onCapture(croppedUri);
    setShowCrop(false);
  };

  if (showCrop && capturedUri)
    return <ImageCropper uri={capturedUri} onCrop={handleCropComplete} onCancel={() => setShowCrop(false)} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={CameraStyles.overlayTop} /><View style={CameraStyles.overlayBottom} />
      <View style={CameraStyles.overlayLeft} /><View style={CameraStyles.overlayRight} />
      <View style={[CameraStyles.cardFrame, { borderColor: colors.amber }]} />
      <View style={[CameraStyles.modeIndicator, { backgroundColor: mode === 'front' ? colors.amber : colors.navy }]}>
        <Ionicons name={mode === 'front' ? 'arrow-forward' : mode === 'back' ? 'arrow-back' : 'card-outline'} size={14} color="#fff" />
        <Text style={CameraStyles.modeText}>{mode === 'front' ? 'FRONT SIDE' : mode === 'back' ? 'BACK SIDE' : 'SINGLE CARD'}</Text>
      </View>
      <View style={CameraStyles.hint}>
        <Ionicons name="card-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
        <Text style={CameraStyles.hintText}>{mode === 'front' ? '📸 Scan FRONT side' : mode === 'back' ? '📸 Scan BACK side' : 'Align card inside frame'}</Text>
      </View>
      <View style={CameraStyles.controls}>
        <TouchableOpacity style={CameraStyles.cancelBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color="#fff" /><Text style={CameraStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[CameraStyles.captureBtn, { backgroundColor: colors.amber }]} onPress={handleCapture}>
          <Ionicons name="camera" size={20} color={colors.navy} /><Text style={CameraStyles.captureText}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// FIELD TYPE META
// ─────────────────────────────────────────────────────
const FieldTypeColors: Record<string, string> = {
  name: colors.amberDark,
  designation: colors.lead,
  company: colors.partner,
  subcompany: '#7c3aed',
  phone: colors.success,
  email: colors.startup,
  website: colors.enterprise,
  address: '#64748b',
  service: colors.vendor,
  pincode: colors.muted,
  other: '#888',
};

const FieldTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  name: 'person-outline',
  designation: 'briefcase-outline',
  company: 'business-outline',
  subcompany: 'git-branch-outline',
  phone: 'call-outline',
  email: 'mail-outline',
  website: 'globe-outline',
  address: 'map-outline',
  service: 'construct-outline',
  pincode: 'location-outline',
  other: 'document-text-outline',
};

const ALL_FIELD_TYPES = ['name', 'designation', 'company', 'subcompany', 'phone', 'email', 'website', 'address', 'service', 'pincode', 'other'];

const fieldLabel = (type: string) => type === 'subcompany' ? 'Sub Company' : type.charAt(0).toUpperCase() + type.slice(1);

// ─────────────────────────────────────────────────────
// TYPE PICKER MODAL  (bottom sheet style)
// ─────────────────────────────────────────────────────
function TypePickerModal({ visible, currentType, onSelect, onClose }: {
  visible: boolean; currentType: string; onSelect: (t: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={S.typePickerBox}>
          <View style={S.handle} />
          <Text style={S.typePickerTitle}>Change Field Type</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_FIELD_TYPES.map(t => {
              const color = FieldTypeColors[t] || '#888';
              const icon = FieldTypeIcons[t] || 'ellipse-outline';
              const isSelected = t === currentType;
              return (
                <TouchableOpacity key={t} style={[S.typeRow, isSelected && { backgroundColor: color + '18' }]}
                  onPress={() => { onSelect(t); onClose(); }}>
                  <View style={[S.typeIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <Text style={[S.typeLabel, { color: isSelected ? color : colors.text }]}>{fieldLabel(t)}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={color} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
// INLINE FIELD ROW
// ─────────────────────────────────────────────────────
function InlineFieldRow({ field, isEditMode, onUpdate, onDelete, onChangeType, onCopy }: {
  field: FieldItem; isEditMode: boolean;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  onChangeType: (id: string, newType: string) => void;
  onCopy: (value: string, type: string) => void;
}) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const color = FieldTypeColors[field.type] || '#888';
  const icon = FieldTypeIcons[field.type] || 'ellipse-outline';

  if (isEditMode) {
    return (
      <>
        <View style={S.editRow}>
          <TouchableOpacity style={[S.typeBadge, { backgroundColor: color + '18', borderColor: color + '55' }]}
            onPress={() => setShowTypePicker(true)}>
            <Ionicons name={icon} size={10} color={color} />
            <Text style={[S.typeBadgeText, { color }]} numberOfLines={1}>{fieldLabel(field.type)}</Text>
            <Ionicons name="chevron-down" size={9} color={color} />
          </TouchableOpacity>
          <TextInput
            style={S.editInput}
            value={field.value}
            onChangeText={val => onUpdate(field.id, val)}
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity style={S.delBtn} onPress={() => onDelete(field.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <TypePickerModal visible={showTypePicker} currentType={field.type}
          onSelect={newType => onChangeType(field.id, newType)} onClose={() => setShowTypePicker(false)} />
      </>
    );
  }

  return (
    <TouchableOpacity style={scanStyles.draggableItem} onPress={() => onCopy(field.value, field.type)} activeOpacity={0.65}>
      <View style={[scanStyles.fieldIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={scanStyles.fieldContent}>
        <Text style={[scanStyles.fieldType, { color }]}>{field.type === 'subcompany' ? 'SUB COMPANY' : field.type.toUpperCase()}</Text>
        <Text style={[scanStyles.fieldValue, { color: colors.text }]} numberOfLines={2}>{field.value}</Text>
      </View>
      <Ionicons name="copy-outline" size={14} color={colors.muted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────
// ADD FIELD ROW
// ─────────────────────────────────────────────────────
function AddFieldRow({ onAdd }: { onAdd: (type: string, value: string) => void }) {
  const [newType, setNewType] = useState('name');
  const [newValue, setNewValue] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const color = FieldTypeColors[newType] || '#888';
  const icon = FieldTypeIcons[newType] || 'ellipse-outline';

  const handleAdd = () => {
    if (!newValue.trim()) return;
    onAdd(newType, newValue.trim());
    setNewValue('');
  };

  return (
    <>
      <View style={S.addRow}>
        <TouchableOpacity style={[S.typeBadge, { backgroundColor: color + '18', borderColor: color + '55' }]}
          onPress={() => setShowTypePicker(true)}>
          <Ionicons name={icon} size={10} color={color} />
          <Text style={[S.typeBadgeText, { color }]} numberOfLines={1}>{fieldLabel(newType)}</Text>
          <Ionicons name="chevron-down" size={9} color={color} />
        </TouchableOpacity>
        <TextInput
          style={S.addInput}
          value={newValue}
          onChangeText={setNewValue}
          placeholder={`Add ${fieldLabel(newType)}...`}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          autoCorrect={false}
        />
        <TouchableOpacity style={[S.addBtn, { backgroundColor: newValue.trim() ? colors.amber : '#e2e8f0' }]}
          onPress={handleAdd} disabled={!newValue.trim()}>
          <Ionicons name="add" size={20} color={newValue.trim() ? colors.navy : '#94a3b8'} />
        </TouchableOpacity>
      </View>
      <TypePickerModal visible={showTypePicker} currentType={newType} onSelect={setNewType} onClose={() => setShowTypePicker(false)} />
    </>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Edit row
  editRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 6, borderWidth: 1.5, borderColor: colors.amber + '55',
    gap: 6, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, width: 82, flexShrink: 0,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2, flex: 1 },
  editInput: {
    flex: 1, fontSize: 13, color: colors.text,
    paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: '#f8fafc', borderRadius: 7,
    minHeight: 34,
  },
  delBtn: { width: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Add row
  addRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amber,
    gap: 6,
  },
  addInput: {
    flex: 1, fontSize: 13, color: colors.text,
    paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: '#f8fafc', borderRadius: 7, minHeight: 34,
  },
  addBtn: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Modal (bottom sheet)
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  typePickerBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, paddingBottom: 40, maxHeight: '72%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  typePickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, gap: 12, marginBottom: 2 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  // Action bar — BELOW image, full width, navy background, always visible
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.navy, gap: 6,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)', minHeight: 38,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  // Re-classify banner
  reclassifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.amber + '15', borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 9,
    marginBottom: 10, borderWidth: 1, borderColor: colors.amber + '35',
  },
  reclassifyText: { fontSize: 11, color: colors.amberDark, flex: 1, lineHeight: 15 },
  // Bottom sticky save/cancel bar
  stickyBar: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 2 },
  stickyCancel: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 11,
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
  },
  stickyCancelText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  stickySave: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: colors.amber,
  },
  stickySaveText: { fontSize: 13, fontWeight: '700', color: colors.navy },
});

// ─────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────
export default function ScanScreen() {
  const { cards, addCard, deleteCard, updateCard } = useCards();
  const { addContact, loading: savingContact } = useContact();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingCount, setProcessingCount] = useState({ done: 0, total: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<FieldItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'single' | 'front' | 'back'>('single');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'single' | 'dual' | 'multi'>('single');

  // ── OCR ──
  const runOCR = async (uri: string): Promise<string> => {
    try {
      const result = await MlkitOcr.detectFromUri(uri);
      if (!result?.length) return '';
      return result.map((block: any) => {
        if (block.lines) return block.lines.map((line: any) =>
          line.elements ? line.elements.map((el: any) => el.text || '').join(' ') : (line.text || '')
        ).join('\n');
        return block.text || '';
      }).join('\n');
    } catch { return ''; }
  };

  const processSingle = async (uri: string, idx: number, total: number): Promise<ExtendedScannedCard | null> => {
    setProcessingStatus(`Processing ${idx + 1} of ${total}...`);
    setProcessingCount({ done: idx, total });
    try {
      const processed = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      const text = await runOCR(processed.uri);
      if (!text.trim()) return null;
      return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2) + idx,
        uri: processed.uri, data: { fullText: text } as OCRData,
        fields: extractAllFields(text), tags: [], createdAt: new Date().toISOString(), exported: false,
      };
    } catch { return null; }
  };

  const processDualSide = async (frontUri: string, backUri: string): Promise<ExtendedScannedCard | null> => {
    setProcessingStatus('Processing front and back...');
    try {
      const [pFront, pBack] = await Promise.all([
        ImageManipulator.manipulateAsync(frontUri, [{ resize: { width: 1200 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }),
        ImageManipulator.manipulateAsync(backUri, [{ resize: { width: 1200 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }),
      ]);
      const [frontText, backText] = await Promise.all([runOCR(pFront.uri), runOCR(pBack.uri)]);
      if (!frontText.trim() && !backText.trim()) return null;
      const frontFields = extractAllFields(frontText);
      const backFields = extractAllFields(backText);
      const merged = [...frontFields];
      const seen = new Set(frontFields.map(f => f.value.toLowerCase()));
      backFields.forEach(f => { if (!seen.has(f.value.toLowerCase())) { merged.push(f); seen.add(f.value.toLowerCase()); } });
      merged.forEach((f, i) => { f.order = i; });
      return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        uri: pFront.uri, backUri: pBack.uri,
        data: { fullText: `${frontText}\n\n--- BACK ---\n\n${backText}` } as OCRData,
        fields: merged, tags: [], createdAt: new Date().toISOString(), exported: false, hasBothSides: true,
      };
    } catch { return null; }
  };

  const handleSingleCamera = () => { setScanType('single'); setCameraMode('single'); setShowCamera(true); };
  const handleDualCamera = () => { setScanType('dual'); setCameraMode('front'); setFrontImage(null); setShowCamera(true); };
  const handleMultiCamera = () => { scanMultiple(); };
  const handleFrontCaptured = (uri: string) => { setFrontImage(uri); setCameraMode('back'); };

  const handleBackCaptured = async (uri: string) => {
    setShowCamera(false); setIsProcessing(true);
    try {
      if (frontImage) {
        const card = await processDualSide(frontImage, uri);
        if (!card) { Alert.alert('No Text Detected', 'Could not read text from images'); return; }
        addCard(card); setExpandedId(card.id);
      }
    } catch (e: any) { Alert.alert('Failed', e.message ?? 'Unknown error'); }
    finally { setIsProcessing(false); setProcessingStatus(''); setProcessingCount({ done: 0, total: 0 }); setFrontImage(null); }
  };

  const handleSingleCaptured = async (uri: string) => {
    setShowCamera(false); setIsProcessing(true);
    try {
      const card = await processSingle(uri, 0, 1);
      if (!card) { Alert.alert('No Text Detected', 'Could not read text from image'); return; }
      addCard(card); setExpandedId(card.id);
    } catch (e: any) { Alert.alert('Failed', e.message ?? 'Unknown error'); }
    finally { setIsProcessing(false); setProcessingStatus(''); setProcessingCount({ done: 0, total: 0 }); }
  };

  const scanMultiple = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission Required', 'Media library access needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, allowsMultipleSelection: true, selectionLimit: 15 });
    if (result.canceled || !result.assets?.length) return;
    const total = result.assets.length;
    setIsProcessing(true);
    let successCount = 0, firstNewId: string | null = null;
    for (let i = 0; i < total; i++) {
      const card = await processSingle(result.assets[i].uri, i, total);
      if (card) { addCard(card); if (!firstNewId) firstNewId = card.id; successCount++; }
    }
    setIsProcessing(false); setProcessingStatus(''); setProcessingCount({ done: 0, total: 0 });
    if (successCount === 0) Alert.alert('No Cards Extracted', 'Could not read text from any images.');
    else { if (firstNewId) setExpandedId(firstNewId); Alert.alert('Done', `Scanned ${successCount} of ${total} card${total > 1 ? 's' : ''}.`); }
  };

  // ── INLINE EDIT ──
  const startEditing = useCallback((card: ExtendedScannedCard) => {
    setLocalFields((card.fields || []).map(f => ({ ...f })));
    setEditingCardId(card.id);
    setExpandedId(card.id);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCardId(null);
    setLocalFields([]);
  }, []);

  /**
   * saveEditing — two steps:
   * 1. updateCard: persist fields to local store (cast through unknown to bypass type mismatch)
   * 2. addContact API call with updated field values + subCompanyName
   */
  const saveEditing = useCallback(async (cardId: string) => {
    const card = (cards as ExtendedScannedCard[]).find(c => c.id === cardId);
    if (!card) return;

    const reordered = localFields.map((f, i) => ({ ...f, order: i }));

    // Step 1 — persist to store
    // Use unknown cast to avoid TypeScript rejecting the fields property
    const updatedCard = { ...card, fields: reordered } as unknown as ScannedCard;
    updateCard(cardId, updatedCard);

    // Step 2 — call API
    setIsSavingEdit(true);
    try {
      const get = (type: string, idx = 0) => reordered.filter(f => f.type === type)[idx]?.value || '';

      // Single image → front only; dual side → front + back
      const frontImageAsString = await uriToBase64(card.uri);
      const backImageAsString  = card.hasBothSides && card.backUri
        ? await uriToBase64(card.backUri)
        : '';

      await addContact({
        companyName:        get('company'),
        subCompanyName:     get('subcompany'),
        branchName:         '',
        personName:         get('name'),
        designation:        get('designation'),
        phoneNumber1:       get('phone', 0),
        phoneNumber2:       get('phone', 1),
        phoneNumber3:       get('phone', 2),
        email1:             get('email', 0),
        email2:             get('email', 1),
        address:            get('address'),
        servicesCsv:        reordered.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1:           get('website', 0),
        website2:           get('website', 1),
        rawExtractedText:   (card.data as any)?.fullText || '',
        frontImageAsString,
        frontImageMimeType: 'image/jpeg',
        backImageAsString,
        backImageMimeType:  'image/jpeg',
      });

     Alert.alert('✅ Saved!', 'Card updated and contact synced.', [
  {
    text: 'OK',
    onPress: () => router.replace('/(tabs)/contacts')
  }
]);

    } catch (e: any) {
      // Store save succeeded; warn about API failure only
      Alert.alert('Saved Locally', `Fields saved. Contact sync error: ${e?.message || 'Unknown'}`);
    } finally {
      setIsSavingEdit(false);
      setEditingCardId(null);
      setLocalFields([]);
    }
  }, [cards, localFields, updateCard, addContact]);

  const updateLocalField   = useCallback((id: string, value: string)   => setLocalFields(prev => prev.map(f => f.id === id ? { ...f, value } : f)), []);
  const deleteLocalField   = useCallback((id: string)                   => setLocalFields(prev => prev.filter(f => f.id !== id)), []);
  const changeLocalFieldType = useCallback((id: string, newType: string) => setLocalFields(prev => prev.map(f => f.id === id ? { ...f, type: newType } : f)), []);
  const addLocalField      = useCallback((type: string, value: string)  => setLocalFields(prev => [...prev, { id: `${type}-${Date.now()}`, type, value, order: prev.length }]), []);

  const handleSmartReclassify = useCallback(() => {
    const reclassified = reClassifyFields(localFields);
    const changedCount = reclassified.filter((f, i) => f.type !== localFields[i]?.type).length;
    setLocalFields(reclassified);
    if (changedCount > 0) Alert.alert('Re-classified ✨', `${changedCount} field${changedCount > 1 ? 's were' : ' was'} auto-fixed.`);
    else Alert.alert('All Good!', 'All field types look correct.');
  }, [localFields]);

  const handleSaveContact = async (card: ExtendedScannedCard) => {
    const fields = card.fields || [];
    const get = (type: string, idx = 0) => fields.filter(f => f.type === type)[idx]?.value || '';
    try {
      // Single image → front only; dual side → front + back
      const frontImageAsString = await uriToBase64(card.uri);
      const backImageAsString  = card.hasBothSides && card.backUri
        ? await uriToBase64(card.backUri)
        : '';

      await addContact({
        companyName:        get('company'),
        subCompanyName:     get('subcompany'),
        branchName:         '',
        personName:         get('name'),
        designation:        get('designation'),
        phoneNumber1:       get('phone', 0),
        phoneNumber2:       get('phone', 1),
        phoneNumber3:       get('phone', 2),
        email1:             get('email', 0),
        email2:             get('email', 1),
        address:            get('address'),
        servicesCsv:        fields.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1:           get('website', 0),
        website2:           get('website', 1),
        rawExtractedText:   (card.data as any)?.fullText || '',
        frontImageAsString,
        frontImageMimeType: 'image/jpeg',
        backImageAsString,
        backImageMimeType:  'image/jpeg',
      });
   Alert.alert('Saved!', 'Contact saved successfully.', [
  { text: 'OK', onPress: () => router.replace('/(tabs)/contacts') },
]);
    } catch (e: any) { Alert.alert('Save Failed', e?.message || 'Could not save contact.'); }
  };

  const copyAll = async (card: ExtendedScannedCard) => {
    const text = (card.fields || []).map(f => `${f.type.toUpperCase()}: ${f.value}`).join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'All fields copied to clipboard');
  };

  const handleCopyField = async (value: string, type: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${type} copied`);
  };

  // ── Render card ──
  const renderCard = ({ item }: { item: ExtendedScannedCard }) => {
    const isExpanded = expandedId === item.id;
    const isEditing  = editingCardId === item.id;
    const displayFields = isEditing
      ? [...localFields].sort((a, b) => a.order - b.order)
      : (item.fields || []).sort((a, b) => a.order - b.order);
    const cardName = item.fields?.find(f => f.type === 'name')?.value || 'Business Card';

    return (
      <View style={[scanStyles.card, { backgroundColor: colors.white }]}>
        {/* Image */}
        {item.hasBothSides ? (
          <View style={scanStyles.dualImageContainer}>
            <Image source={{ uri: item.uri }} style={scanStyles.dualImage} contentFit="cover" />
            <View style={scanStyles.imageDivider} />
            <Image source={{ uri: item.backUri }} style={scanStyles.dualImage} contentFit="cover" />
            <View style={[scanStyles.dualBadge, { backgroundColor: colors.amber }]}>
              <Ionicons name="swap-horizontal" size={12} color={colors.navy} />
              <Text style={scanStyles.dualBadgeText}>Front & Back</Text>
            </View>
          </View>
        ) : (
          <Image source={{ uri: item.uri }} style={scanStyles.cardImage} contentFit="cover" />
        )}

        {/* Delete card button */}
        <TouchableOpacity style={scanStyles.deleteBtn}
          onPress={() => Alert.alert('Delete Card', 'Remove this card?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { if (editingCardId === item.id) cancelEditing(); deleteCard(item.id); } },
          ])}>
          <Ionicons name="trash-outline" size={16} color={colors.white} />
        </TouchableOpacity>

        {/* ── ACTION BAR — sits below image, full width, solid background ── */}
        <View style={S.actionBar}>
          {/* Copy All */}
          <TouchableOpacity style={S.actionBtn} onPress={() => copyAll(item)}>
            <Ionicons name="copy-outline" size={13} color="#fff" />
            <Text style={S.actionBtnText}>Copy All</Text>
          </TouchableOpacity>

          {isEditing ? (
            <>
              {/* Cancel */}
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#ef4444cc' }]}
                onPress={cancelEditing} disabled={isSavingEdit}>
                <Ionicons name="close" size={13} color="#fff" />
                <Text style={S.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              {/* Save */}
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber, flex: 1.5 }]}
                onPress={() => saveEditing(item.id)} disabled={isSavingEdit}>
                {isSavingEdit
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <><Ionicons name="checkmark" size={13} color={colors.navy} /><Text style={[S.actionBtnText, { color: colors.navy }]}>Save</Text></>
                }
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber }]}
              onPress={() => startEditing(item)}>
              <Ionicons name="create-outline" size={13} color={colors.navy} />
              <Text style={[S.actionBtnText, { color: colors.navy }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Header row */}
        <TouchableOpacity
          style={[scanStyles.cardHeader, { borderTopColor: colors.border }]}
          onPress={() => { if (!isEditing) setExpandedId(isExpanded ? null : item.id); }}
          activeOpacity={0.7}
        >
          <View style={[scanStyles.avatar, { backgroundColor: colors.amberLight }]}>
            <Text style={[scanStyles.avatarText, { color: colors.amberDark }]}>{cardName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={scanStyles.cardInfo}>
            <Text style={[scanStyles.cardName, { color: colors.text }]} numberOfLines={1}>{cardName}</Text>
            <Text style={[scanStyles.cardDetail, { color: colors.muted }]}>
              {displayFields.length} fields{isEditing ? ' · ✏️ editing' : ''}
            </Text>
          </View>
          {!isEditing && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />}
        </TouchableOpacity>

        {/* Expanded / editing */}
        {isExpanded && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
            <View style={[scanStyles.details, { paddingBottom: isEditing ? 8 : 16 }]}>
              {/* Dual badge */}
              {item.hasBothSides && (
                <View style={[scanStyles.infoBadge, { backgroundColor: colors.amber + '15' }]}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.amber} />
                  <Text style={[scanStyles.infoText, { color: colors.amber }]}>Data merged from front & back sides</Text>
                </View>
              )}

              {/* Smart re-classify banner */}
              {isEditing && (
                <TouchableOpacity style={S.reclassifyBanner} onPress={handleSmartReclassify}>
                  <Ionicons name="sparkles" size={15} color={colors.amberDark} />
                  <Text style={S.reclassifyText}>Auto-fix field types — detects swapped name/designation etc.</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.amber} />
                </TouchableOpacity>
              )}

              {/* Fields */}
              {displayFields.map(field => (
                <InlineFieldRow key={field.id} field={field} isEditMode={isEditing}
                  onUpdate={updateLocalField} onDelete={deleteLocalField}
                  onChangeType={changeLocalFieldType} onCopy={handleCopyField} />
              ))}

              {/* Add field */}
              {isEditing && <AddFieldRow onAdd={addLocalField} />}

              {/* Bottom sticky bar — edit mode */}
              {isEditing && (
                <View style={S.stickyBar}>
                  <TouchableOpacity style={S.stickyCancel} onPress={cancelEditing} disabled={isSavingEdit}>
                    <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                    <Text style={S.stickyCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.stickySave} onPress={() => saveEditing(item.id)} disabled={isSavingEdit}>
                    {isSavingEdit
                      ? <ActivityIndicator size="small" color={colors.navy} />
                      : <><Ionicons name="checkmark-circle-outline" size={16} color={colors.navy} /><Text style={S.stickySaveText}>Save & Sync Contact</Text></>
                    }
                  </TouchableOpacity>
                </View>
              )}

              {/* Read mode */}
              {!isEditing && (
                <>
                  <TouchableOpacity
                    style={[scanStyles.rawButton, { backgroundColor: colors.amber + '15', borderColor: colors.amber, marginTop: 4 }]}
                    onPress={() => handleSaveContact(item)} disabled={savingContact}>
                    {savingContact ? <ActivityIndicator size="small" color={colors.amber} /> : (
                      <><Ionicons name="person-add-outline" size={14} color={colors.amberDark} />
                      <Text style={[scanStyles.rawButtonText, { color: colors.amberDark }]}>Save as Contact</Text></>
                    )}
                  </TouchableOpacity>
                  {item.data && (
                    <TouchableOpacity
                      style={[scanStyles.rawButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => Alert.alert('Raw OCR Text', (item.data as any).fullText || 'No text')}>
                      <Ionicons name="document-text-outline" size={14} color={colors.amberDark} />
                      <Text style={[scanStyles.rawButtonText, { color: colors.amberDark }]}>View Raw OCR Text</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    );
  };

  if (showCamera) {
    if (scanType === 'dual') {
      return <CameraScanner mode={cameraMode} onFrontCaptured={handleFrontCaptured} onCapture={handleBackCaptured} onClose={() => { setShowCamera(false); setFrontImage(null); }} />;
    }
    return <CameraScanner mode="single" onCapture={handleSingleCaptured} onClose={() => setShowCamera(false)} />;
  }

  return (
    <View style={[scanStyles.container, { backgroundColor: colors.phoneBg }]}>
      {/* Header */}
      <View style={[scanStyles.header, { backgroundColor: colors.navy }]}>
        <View style={scanStyles.headerGlow} />
        <View>
          <Text style={scanStyles.greetText}>SCAN BUSINESS CARDS</Text>
          <Text style={scanStyles.titleText}>Card <Text style={scanStyles.titleSpan}>Scanner</Text></Text>
        </View>
        <View style={[scanStyles.badge, { backgroundColor: colors.amber + '20' }]}>
          <Ionicons name="scan-outline" size={16} color={colors.amber} />
          <Text style={[scanStyles.badgeText, { color: colors.amber }]}>ML Kit</Text>
        </View>
      </View>

      {/* Scan Options */}
      <View style={scanStyles.scanOptions}>
        {[
          { label: 'Single', sub: 'One side', icon: 'camera', bg: colors.amberLight, color: colors.amberDark, onPress: handleSingleCamera },
          { label: 'Dual', sub: 'Front & Back', icon: 'camera-reverse', bg: colors.leadBg, color: colors.lead, onPress: handleDualCamera },
          { label: 'Multi', sub: 'Up to 15', icon: 'albums', bg: colors.partnerBg, color: colors.partner, onPress: handleMultiCamera },
        ].map(opt => (
          <TouchableOpacity key={opt.label} style={[scanStyles.optionBtn, { backgroundColor: colors.white }]} onPress={opt.onPress} disabled={isProcessing}>
            <View style={[scanStyles.optionIcon, { backgroundColor: opt.bg }]}>
              <Ionicons name={opt.icon as any} size={28} color={opt.color} />
            </View>
            <Text style={[scanStyles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
            <Text style={[scanStyles.optionSub, { color: colors.muted }]}>{opt.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Processing */}
      {isProcessing && (
        <View style={[scanStyles.processingBox, { backgroundColor: colors.white }]}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={[scanStyles.processingText, { color: colors.amber }]}>{processingStatus || 'Processing...'}</Text>
          {processingCount.total > 1 && (
            <View style={scanStyles.progressContainer}>
              <View style={[scanStyles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[scanStyles.progressFill, { backgroundColor: colors.amber, width: `${Math.round((processingCount.done / processingCount.total) * 100)}%` }]} />
              </View>
              <Text style={[scanStyles.progressText, { color: colors.muted }]}>{processingCount.done}/{processingCount.total}</Text>
            </View>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={cards as ExtendedScannedCard[]}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={scanStyles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={!isProcessing ? (
          <View style={scanStyles.emptyContainer}>
            <View style={[scanStyles.emptyIcon, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="scan-outline" size={48} color={colors.amberDark} />
            </View>
            <Text style={[scanStyles.emptyTitle, { color: colors.text }]}>No cards scanned yet</Text>
            <Text style={[scanStyles.emptyText, { color: colors.muted }]}>Use Single, Dual, or Multi to scan business cards</Text>
          </View>
        ) : null}
      />
    </View>
  );
}