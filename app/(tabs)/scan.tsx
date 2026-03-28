// app/(tabs)/scan.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Text, View, StyleSheet, Alert, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import MlkitOcr from 'react-native-mlkit-ocr';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCards, ScannedCard, OCRData } from '@/components/store/useCardStore';
import { useContact } from '@/hooks/useContact';
import { colors } from '@/constants/colors';
import { CameraStyles, scanStyles } from '@/components/styles/scanStyles';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { useMenuVisibility } from '@/context/MenuVisibilityContext';

// ─── TYPES ───────────────────────────────────────────
interface FieldItem { id: string; type: string; value: string; order: number; }
interface ExtendedScannedCard extends ScannedCard { fields?: FieldItem[]; backUri?: string; hasBothSides?: boolean; }
type CameraPhase = 'front' | 'back';

let _seed = 0;
const uid = (p: string) => `${p}-${Date.now()}-${++_seed}`;

// ─── EXTRACT API ERROR (field-level + general) ────────────────────────────────
function extractApiError(e: any): string {
  if (!e) return 'Unknown error.';
  const data = e?.response?.data ?? e?.data ?? null;
  if (data?.message) return data.message.trim();
  if (data?.errors) {
    const msgs: string[] = [];
    Object.entries(data.errors as Record<string, string[]>).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(m => msgs.push(k === '$' ? m : `${k}: ${m}`));
    });
    if (msgs.length) return msgs.join('\n');
  }
  if (data?.title) return data.title.trim();
  return e?.message?.trim() || 'Something went wrong.';
}

// Normalize PascalCase → camelCase and return field → first error message map
function extractFieldErrors(e: any): Record<string, string> {
  const data = e?.response?.data ?? e?.data ?? null;
  const map: Record<string, string> = {};
  if (!data?.errors) return map;
  for (const [key, value] of Object.entries(data.errors as Record<string, string[]>)) {
    const normalized = key.charAt(0).toLowerCase() + key.slice(1);
    const msgs = Array.isArray(value) ? value : [value];
    if (msgs.length > 0) map[normalized] = msgs[0] as string;
  }
  return map;
}

// ─── CLASSIFIERS ─────────────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}$/;
const URL_RE = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const DESIG_KW = ['manager', 'director', 'engineer', 'developer', 'designer', 'officer', 'president', 'head', 'lead', 'specialist', 'analyst', 'consultant', 'associate', 'founder', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'executive', 'proprietor', 'partner', 'chairman', 'md', 'gm', 'sr.', 'jr.', 'senior', 'junior', 'incharge', 'in-charge', 'coordinator', 'supervisor', 'technician', 'accountant'];
const COMPANY_KW = ['pvt', 'ltd', 'limited', 'llc', 'inc', 'corp', '& co', 'company', 'industries', 'enterprises', 'solutions', 'technologies', 'systems', 'group', 'associates', 'partners', 'holdings', 'international', 'global', 'ventures', 'foundation', 'trust'];
const SERVICE_KW = ['services', 'solutions', 'consulting', 'training', 'development', 'design', 'manufacturing', 'trading', 'retail', 'wholesale', 'distribution', 'import', 'export', 'agency', 'consultancy', 'software', 'hardware', 'automation', 'fabrication', 'contractor', 'supplier', 'dealer', 'logistics'];
const ADDR_KW = ['road', 'rd', 'street', 'st', 'nagar', 'colony', 'sector', 'building', 'bldg', 'near', 'opp', 'opposite', 'phase', 'block', 'avenue', 'lane', 'bypass', 'highway', 'floor', 'flr', 'plot', 'flat', 'door', 'house', 'office', 'shop', 'suite', 'main', 'cross', 'circle', 'junction', 'jn', 'market', 'bazaar', 'chowk', 'marg', 'salai', 'layout', 'extension', 'extn', 'village', 'taluk', 'district', 'dist', 'state', 'pin', 'p.o', 'po box', 'area', 'zone', 'industrial'];
const STATE_LIST = ['andhra', 'telangana', 'karnataka', 'tamil', 'kerala', 'maharashtra', 'gujarat', 'rajasthan', 'punjab', 'haryana', 'delhi', 'bihar', 'uttar', 'madhya', 'west bengal', 'odisha', 'assam', 'jharkhand', 'uttarakhand', 'himachal', 'goa', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura', 'arunachal', 'chhattisgarh', 'puducherry'];
const CITY_LIST = ['chennai', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'pune', 'kolkata', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'vizag', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'coimbatore', 'madurai', 'tiruppur', 'tirunelveli', 'vellore', 'salem', 'erode', 'trichy', 'tiruchirappalli', 'kochi', 'calicut', 'kozhikode', 'mysuru', 'mysore', 'hubli', 'dharwad', 'belgaum', 'bellary', 'mangaluru', 'mangalore', 'ranchi', 'raipur', 'amritsar', 'chandigarh', 'bhubaneswar', 'cuttack', 'guwahati', 'vijayawada', 'guntur', 'nellore', 'warangal', 'srinagar', 'jammu', 'dehradun', 'haridwar', 'allahabad', 'prayagraj', 'varanasi', 'jodhpur', 'udaipur', 'kota', 'ajmer', 'sikar', 'dhanbad', 'jamshedpur', 'gaya', 'muzaffarpur', 'durgapur', 'asansol', 'siliguri', 'howrah'];
const PARTNER_KW = ['partner', 'partnership', 'collaboration', 'joint venture', 'tie-up', 'alliance', 'franchise', 'distributor', 'authorized', 'agent', 'representative', 'reseller', 'dealership'];

export function smartClassify(value: string): string {
  const v = value.trim(), lo = v.toLowerCase();
  if (EMAIL_RE.test(v)) return 'email';
  if (GST_RE.test(v.toUpperCase())) return 'gst';
  const digits = v.replace(/\D/g, '');
  if (/^\d{6}$/.test(v) && /^[1-9]/.test(v)) return 'pincode';
  if (PHONE_RE.test(v) && digits.length >= 7 && digits.length <= 15) return 'phone';
  if (URL_RE.test(v) && !EMAIL_RE.test(v) && !v.includes(' ')) return 'website';
  const sc: Record<string, number> = { name: 0, designation: 0, company: 0, service: 0, address: 0, partnership: 0, other: 0 };
  sc.designation += DESIG_KW.filter(k => lo.includes(k)).length * 35;
  sc.company += COMPANY_KW.filter(k => lo.includes(k)).length * 30;
  if (/\b(pvt\.?\s*ltd\.?|llc|inc\.?|corp\.?)\b/i.test(v)) sc.company += 40;
  sc.service += SERVICE_KW.filter(k => lo.includes(k)).length * 22;
  sc.partnership += PARTNER_KW.filter(k => lo.includes(k)).length * 30;
  sc.address += ADDR_KW.filter(k => lo.split(/[\s,]+/).includes(k)).length * 28 + ADDR_KW.filter(k => lo.includes(k)).length * 8;
  if (digits.length === 6 && /^[1-9]/.test(v)) sc.address += 20;
  if (v.length > 35) sc.address += 12;
  if (v.includes(',')) sc.address += 15;
  if (STATE_LIST.some(s => lo.includes(s))) sc.address += 30;
  if (CITY_LIST.some(c => lo.includes(c))) sc.address += 25;
  if (/^\d+[\/\-]\d+/.test(v)) sc.address += 20;
  if (/^[A-Za-z\s.'\-]+$/.test(v) && v.split(' ').length >= 2 && v.split(' ').length <= 5 && v.length < 35 && !sc.designation && !sc.company && digits.length === 0) {
    sc.name += 45;
    if (/^(mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|er\.?|shri|smt)\s/i.test(v)) sc.name += 35;
  }
  if (Math.max(...Object.values(sc)) < 10) sc.other += 5;
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}

function reClassify(fields: FieldItem[]): FieldItem[] {
  return fields.map(f => {
    const t = smartClassify(f.value);
    if (['email', 'phone', 'website', 'pincode', 'gst'].includes(t) && f.type !== t) return { ...f, type: t };
    if (f.type === 'other' && t !== 'other') return { ...f, type: t };
    return f;
  });
}

// ─── QR SCAN FROM IMAGE ──────────────────────────────
async function scanQRFromImage(uri: string): Promise<string | null> {
  try {
    const results = await (Camera as any).scanFromURLAsync(uri, ['qr', 'pdf417', 'aztec', 'datamatrix', 'code128', 'code39', 'ean13', 'ean8']);
    if (results?.length > 0) {
      const qr = results.find((r: any) => r.type === 'qr') || results[0];
      return qr.data || null;
    }
    return null;
  } catch { return null; }
}

function parseQRToFields(raw: string): Partial<Record<string, string>> {
  const lo = raw.toLowerCase();
  if (lo.includes('begin:vcard') || lo.includes('mecard:')) return {};
  const out: Partial<Record<string, string>> = {};
  if (/upi:\/\//i.test(raw)) {
    const pa = raw.match(/pa=([^&\s]+)/i)?.[1]; if (pa) out.email = pa;
    const pn = raw.match(/pn=([^&\s]+)/i)?.[1]; if (pn) out.name = decodeURIComponent(pn);
    return Object.keys(out).length > 0 ? out : {};
  }
  if (URL_RE.test(raw) && !raw.includes('\n')) { out.website = raw; return out; }
  if (EMAIL_RE.test(raw) && !raw.includes('\n')) { out.email = raw; return out; }
  if (GST_RE.test(raw.trim().toUpperCase())) { out.gst = raw.trim().toUpperCase(); return out; }
  if (raw.trim().length > 0) { out.qrdetail = raw.trim(); }
  return out;
}

// ─── OCR + FIELD EXTRACTION ──────────────────────────
const cleanLine = (l: string) => l.replace(/[|\\]/g, '').replace(/\s{2,}/g, ' ').trim();

function mergeAddrLines(lines: string[], pins: string[]): string[] {
  const out: string[] = [], buf: string[] = [];
  const isAddr = (l: string) => { const lo = l.toLowerCase(); return ADDR_KW.some(k => lo.split(/[\s,]+/).includes(k)) || ADDR_KW.some(k => lo.includes(k)) || pins.some(p => l.includes(p)) || STATE_LIST.some(s => lo.includes(s)) || CITY_LIST.some(c => lo.includes(c)) || /^\d+[\/\-]\d+/.test(l) || /\b(no\.?|#)\s*\d+/i.test(l); };
  for (const l of lines) { if (isAddr(l)) { buf.push(l); } else { if (buf.length) { out.push(buf.join(', ')); (buf as any).length = 0; } out.push(l); } }
  if (buf.length) out.push(buf.join(', '));
  return out;
}

function extractFields(rawText: string): FieldItem[] {
  const rawLines = rawText.split('\n').map(cleanLine).filter(l => l.length > 1);
  const full = rawLines.join(' ');
  const pins = [...new Set([...full.matchAll(/\b[1-9][0-9]{5}\b/g)].map(m => m[0]))];
  const lines = mergeAddrLines(rawLines, pins);
  const fields: FieldItem[] = [];

  const gstNums = [...new Set([...full.matchAll(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g)].map(m => m[0]))];
  gstNums.forEach(g => fields.push({ id: uid('gst'), type: 'gst', value: g, order: fields.length }));
  const emails = [...new Set([...full.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map(m => m[0].toLowerCase()))];
  emails.forEach(e => fields.push({ id: uid('email'), type: 'email', value: e, order: fields.length }));
  const phones = [...new Set([...full.matchAll(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g)].map(m => m[0].trim()))];
  phones.forEach(p => { const d = p.replace(/\D/g, ''); if (d.length >= 7 && d.length <= 15 && !emails.some(e => e.includes(p))) fields.push({ id: uid('phone'), type: 'phone', value: p, order: fields.length }); });
  const urls = [...new Set([...full.matchAll(/(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s,;)\]"']*)?/g)].map(m => m[0]))];
  urls.forEach(u => { if (!emails.some(e => u.includes(e)) && !u.match(/^\d/) && u.length > 4) fields.push({ id: uid('web'), type: 'website', value: u, order: fields.length }); });
  pins.forEach(p => fields.push({ id: uid('pin'), type: 'pincode', value: p, order: fields.length }));

  const extracted = new Set<string>([...emails, ...phones, ...urls, ...pins, ...gstNums].map(v => v.toLowerCase()));
  const seen = new Set<string>();

  for (const line of lines) {
    const t = line.trim(); if (t.length <= 1) continue;
    const lo = t.toLowerCase();
    if (extracted.has(t.toLowerCase()) || seen.has(lo)) continue;
    const gstM = t.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/);
    if (gstM && !gstNums.includes(gstM[0])) { fields.push({ id: uid('gst'), type: 'gst', value: gstM[0], order: fields.length }); seen.add(lo); continue; }
    const addrScore = (ADDR_KW.filter(k => lo.split(/[\s,]+/).includes(k)).length * 28 + ADDR_KW.filter(k => lo.includes(k)).length * 8 + (pins.some(p => t.includes(p)) ? 40 : 0) + (STATE_LIST.some(s => lo.includes(s)) ? 30 : 0) + (CITY_LIST.some(c => lo.includes(c)) ? 25 : 0) + (t.includes(',') ? 15 : 0) + (/^\d+[\/\-]\d+/.test(t) ? 20 : 0));
    if (addrScore >= 28) { const n = t.replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ').trim(); if (n.length > 2) { fields.push({ id: uid('addr'), type: 'address', value: n, order: fields.length }); seen.add(lo); continue; } }
    if (PARTNER_KW.some(k => lo.includes(k)) && t.length < 80) { fields.push({ id: uid('partner'), type: 'partnership', value: t, order: fields.length }); seen.add(lo); continue; }
    if (DESIG_KW.some(k => lo.includes(k)) && t.length < 60 && !t.match(/pvt|ltd/i)) { fields.push({ id: uid('desig'), type: 'designation', value: t, order: fields.length }); seen.add(lo); continue; }
    if (COMPANY_KW.some(k => lo.includes(k)) && t.length < 80) { fields.push({ id: uid('co'), type: 'company', value: t, order: fields.length }); seen.add(lo); continue; }
    if (SERVICE_KW.some(k => lo.includes(k)) && t.length < 60) { fields.push({ id: uid('svc'), type: 'service', value: t, order: fields.length }); seen.add(lo); continue; }
    const wc = t.split(/\s+/).length, dc = t.replace(/\D/g, '').length;
    if (t.length > 2 && t.length < 40 && /^[A-Za-z\s.'\-]+$/.test(t) && dc === 0 && (wc >= 2 || /^(mr|ms|mrs|dr|prof|er|shri|smt)\s/i.test(t))) { fields.push({ id: uid('name'), type: 'name', value: t, order: fields.length }); seen.add(lo); continue; }
    if (t.length > 2 && t.length < 60 && !/[^\w\s\-.,&@#\/]/.test(t)) { fields.push({ id: uid('other'), type: 'other', value: t, order: fields.length }); seen.add(lo); }
  }
  const dedup = new Set<string>();
  return reClassify(fields.filter(f => { const k = f.value.toLowerCase().trim(); if (dedup.has(k)) return false; dedup.add(k); return true; }));
}

async function uriToBase64(uri: string): Promise<string> {
  try { const r = await fetch(uri), b = await r.blob(); return await new Promise((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res((rd.result as string).split(',')[1] || ''); rd.onerror = rej; rd.readAsDataURL(b); }); } catch { return ''; }
}
const buildAddress = (fields: FieldItem[]) => fields.filter(f => f.type === 'address').map(f => f.value.trim()).filter(Boolean).join(', ');

// ─── WHATSAPP ─────────────────────────────────────────
const sendWhatsApp = async (card: ExtendedScannedCard, fields: FieldItem[]) => {
  const get = (t: string, i = 0) => fields.filter(f => f.type === t)[i]?.value || '';
  const phone = get('phone').replace(/\D/g, '');
  if (!phone) { Alert.alert('No Phone', 'Cannot open WhatsApp without a phone number.'); return; }
  const msg = ['Hi 👋\n\nScanned via Scanify:\n', `👤 ${get('name')}`, `🏢 ${get('company')}`, `💼 ${get('designation')}`, `📧 ${get('email')}`, `🌐 ${get('website')}`, `📍 ${buildAddress(fields)}`, get('gst') ? `🧾 GST: ${get('gst')}` : ''].filter(Boolean).join('\n');
  try { await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`); } catch { Alert.alert('WhatsApp not installed'); }
};

// ─── FIELD META ───────────────────────────────────────
const FTC: Record<string, string> = { name: colors.amberDark, designation: colors.lead, company: colors.partner, subcompany: '#7c3aed', phone: colors.success, email: colors.startup, website: colors.enterprise, address: '#64748b', service: colors.vendor, pincode: colors.muted, other: '#888', gst: '#0891b2', partnership: '#16a34a', qrdetail: '#7c3aed' };
const FTI: Record<string, keyof typeof Ionicons.glyphMap> = { name: 'person-outline', designation: 'briefcase-outline', company: 'business-outline', subcompany: 'git-branch-outline', phone: 'call-outline', email: 'mail-outline', website: 'globe-outline', address: 'map-outline', service: 'construct-outline', pincode: 'location-outline', other: 'document-text-outline', gst: 'receipt-outline', partnership: 'handshake-outline', qrdetail: 'qr-code-outline' };
const ALL_TYPES = ['name', 'designation', 'company', 'subcompany', 'phone', 'email', 'website', 'address', 'service', 'pincode', 'gst', 'partnership', 'qrdetail', 'other'];
const fLabel = (t: string) => t === 'subcompany' ? 'Sub Company' : t === 'qrdetail' ? 'QR Detail' : t === 'gst' ? 'GST Number' : t.charAt(0).toUpperCase() + t.slice(1);

// ─── TYPE PICKER ──────────────────────────────────────
function TypePicker({ visible, current, onSelect, onClose }: { visible: boolean; current: string; onSelect: (t: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={S.pickerBox}>
          <View style={S.handle} /><Text style={S.pickerTitle}>Change Field Type</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_TYPES.map(t => { const c = FTC[t] || '#888', ic = FTI[t] || 'ellipse-outline', sel = t === current; return (
              <TouchableOpacity key={t} style={[S.typeRow, sel && { backgroundColor: c + '18' }]} onPress={() => { onSelect(t); onClose(); }}>
                <View style={[S.typeIco, { backgroundColor: c + '20' }]}><Ionicons name={ic} size={16} color={c} /></View>
                <Text style={[S.typeLbl, { color: sel ? c : colors.text }]}>{fLabel(t)}</Text>
                {sel && <Ionicons name="checkmark-circle" size={18} color={c} />}
              </TouchableOpacity>
            ); })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── FIELD ROW ────────────────────────────────────────
function FieldRow({ field, isEdit, onUpdate, onDelete, onChangeType, onCopy, error }: {
  field: FieldItem; isEdit: boolean;
  onUpdate: (id: string, v: string) => void; onDelete: (id: string) => void;
  onChangeType: (id: string, t: string) => void; onCopy: (v: string, t: string) => void;
  error?: string;
}) {
  const [showP, setShowP] = useState(false);
  const c = FTC[field.type] || '#888', ic = FTI[field.type] || 'ellipse-outline';
  if (isEdit) return (<>
    <View style={[S.editRow, error ? { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.04)' } : {}]}>
      <TouchableOpacity style={[S.badge, { backgroundColor: c + '18', borderColor: c + '55' }]} onPress={() => setShowP(true)}>
        <Ionicons name={ic} size={10} color={c} /><Text style={[S.badgeText, { color: c }]} numberOfLines={1}>{fLabel(field.type)}</Text><Ionicons name="chevron-down" size={9} color={c} />
      </TouchableOpacity>
      <TextInput
        style={[S.editInput, error ? { borderWidth: 1, borderColor: '#ef4444' } : {}]}
        value={field.value}
        onChangeText={v => onUpdate(field.id, v)}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize={field.type === 'gst' ? 'characters' : 'none'}
        multiline={field.type === 'address' || field.type === 'qrdetail'}
        numberOfLines={field.type === 'address' || field.type === 'qrdetail' ? 3 : 1}
      />
      <TouchableOpacity style={S.delBtn} onPress={() => onDelete(field.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Ionicons name="close-circle" size={22} color="#ef4444" /></TouchableOpacity>
    </View>
    {error ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 4 }}>
        <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '500' }}>{error}</Text>
      </View>
    ) : null}
    <TypePicker visible={showP} current={field.type} onSelect={t => onChangeType(field.id, t)} onClose={() => setShowP(false)} />
  </>);
  return (
    <TouchableOpacity style={scanStyles.draggableItem} onPress={() => onCopy(field.value, field.type)} activeOpacity={0.65}>
      <View style={[scanStyles.fieldIcon, { backgroundColor: c + '15' }]}><Ionicons name={ic} size={14} color={c} /></View>
      <View style={scanStyles.fieldContent}>
        <Text style={[scanStyles.fieldType, { color: c }]}>{fLabel(field.type).toUpperCase()}</Text>
        <Text style={[scanStyles.fieldValue, { color: colors.text }]} numberOfLines={field.type === 'address' || field.type === 'qrdetail' ? 0 : 2}>{field.value}</Text>
      </View>
      <Ionicons name="copy-outline" size={14} color={colors.muted} />
    </TouchableOpacity>
  );
}

// ─── ADD FIELD ────────────────────────────────────────
function AddField({ onAdd }: { onAdd: (t: string, v: string) => void }) {
  const [type, setType] = useState('name'), [val, setVal] = useState(''), [showP, setShowP] = useState(false);
  const c = FTC[type] || '#888', ic = FTI[type] || 'ellipse-outline';
  const add = () => { if (!val.trim()) return; onAdd(type, val.trim()); setVal(''); };
  return (<>
    <View style={S.addRow}>
      <TouchableOpacity style={[S.badge, { backgroundColor: c + '18', borderColor: c + '55' }]} onPress={() => setShowP(true)}>
        <Ionicons name={ic} size={10} color={c} /><Text style={[S.badgeText, { color: c }]} numberOfLines={1}>{fLabel(type)}</Text><Ionicons name="chevron-down" size={9} color={c} />
      </TouchableOpacity>
      <TextInput style={S.addInput} value={val} onChangeText={setVal} placeholder={`Add ${fLabel(type)}…`} placeholderTextColor={colors.muted} returnKeyType="done" onSubmitEditing={add} autoCorrect={false} />
      <TouchableOpacity style={[S.addBtn, { backgroundColor: val.trim() ? colors.amber : '#e2e8f0' }]} onPress={add} disabled={!val.trim()}><Ionicons name="add" size={20} color={val.trim() ? colors.navy : '#94a3b8'} /></TouchableOpacity>
    </View>
    <TypePicker visible={showP} current={type} onSelect={setType} onClose={() => setShowP(false)} />
  </>);
}

// ─── CAMERA SCANNER ──────────────────────────────────
function CameraScanner({ phase, onCapture, onClose, capturedFrontUri, onGalleryPick, onLiveQR, onSkip }: {
  phase: CameraPhase; onCapture: (uri: string) => void; onClose: () => void; capturedFrontUri: string | null; onGalleryPick: () => void; onLiveQR: (d: string) => void; onSkip?: () => void;
}) {
  const camRef = useRef<CameraView>(null);
  const [perm, reqPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const lastQR = useRef('');

  const capture = async () => {
    if (busy) return; setBusy(true);
    try {
      const p = await camRef.current?.takePictureAsync({ quality: 0.95, skipProcessing: false });
      if (p?.uri) {
        const proc = await ImageManipulator.manipulateAsync(p.uri, [{ resize: { width: 1400 } }], { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG });
        setFlash(true); setTimeout(() => setFlash(false), 600);
        onCapture(proc.uri);
      }
    } catch { } finally { setBusy(false); }
  };

  const onBarcode = useCallback(({ data }: { data: string }) => {
    if (!data || data === lastQR.current) return;
    lastQR.current = data; onLiveQR(data);
    setTimeout(() => { lastQR.current = ''; }, 3000);
  }, [onLiveQR]);

  if (!perm) return <ActivityIndicator style={{ flex: 1 }} color={colors.amber} />;
  if (!perm.granted) return (
    <View style={[CameraStyles.center, { backgroundColor: colors.phoneBg }]}>
      <Ionicons name="camera-outline" size={52} color={colors.amber} />
      <Text style={[CameraStyles.permText, { color: colors.text }]}>Camera permission required</Text>
      <TouchableOpacity style={[CameraStyles.permBtn, { backgroundColor: colors.amber }]} onPress={reqPerm}>
        <Text style={{ color: colors.navy, fontWeight: '700', fontSize: 15 }}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  const isFront = phase === 'front', fc = isFront ? colors.amber : '#22d3ee';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'aztec', 'datamatrix', 'code128', 'code39', 'ean13', 'ean8'] }}
        onBarcodeScanned={onBarcode} />
      <View style={CameraStyles.overlayTop} /><View style={CameraStyles.overlayBottom} />
      <View style={CameraStyles.overlayLeft} /><View style={CameraStyles.overlayRight} />
      <View style={[CameraStyles.cardFrame, { borderColor: fc }]} />

      {flash && <View style={CS.flashWrap}><View style={CS.flashBox}><Ionicons name="checkmark-circle" size={72} color="#fff" /><Text style={CS.flashTxt}>{isFront ? 'Front captured!' : 'Back captured — processing…'}</Text></View></View>}

      <View style={CS.phaseBar}>
        {phase === 'back' && capturedFrontUri && <Image source={{ uri: capturedFrontUri }} style={CS.thumb} contentFit="cover" />}
        <View style={[CS.phaseBadge, { backgroundColor: fc }]}>
          <Ionicons name={isFront ? 'arrow-forward-circle' : 'arrow-back-circle'} size={15} color={isFront ? colors.navy : '#fff'} />
          <Text style={[CS.phaseText, { color: isFront ? colors.navy : '#fff' }]}>{isFront ? 'Tap to capture FRONT' : 'Tap to capture BACK'}</Text>
        </View>
        {phase === 'back' && <View style={[CS.phaseBadge, { backgroundColor: '#16a34a', paddingHorizontal: 8 }]}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={[CS.phaseText, { color: '#fff', fontSize: 10 }]}>Front ✓</Text></View>}
      </View>

      <View style={CameraStyles.hint}>
        <Ionicons name="card-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
        <Text style={CameraStyles.hintText}>{isFront ? 'Align FRONT of card in frame' : 'Flip card — align BACK in frame'}</Text>
      </View>

      <View style={CS.controls}>
        <TouchableOpacity style={CameraStyles.cancelBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color="#fff" /><Text style={CameraStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        {!isFront && onSkip && (
          <TouchableOpacity style={[CameraStyles.cancelBtn, { backgroundColor: '#f59e0b' }]} onPress={onSkip}>
            <Ionicons name="arrow-forward-outline" size={16} color="#fff" /><Text style={CameraStyles.cancelText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[CameraStyles.captureBtn, { backgroundColor: fc, opacity: busy ? 0.7 : 1 }]} onPress={capture} disabled={busy} activeOpacity={0.8}>
          {busy ? <ActivityIndicator size="small" color={isFront ? colors.navy : '#fff'} />
            : <><Ionicons name="camera" size={20} color={isFront ? colors.navy : '#fff'} /><Text style={[CameraStyles.captureText, { color: isFront ? colors.navy : '#fff' }]}>{isFront ? ' Capture Front' : ' Back'}</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[CameraStyles.cancelBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]} onPress={onGalleryPick}>
          <Ionicons name="images-outline" size={16} color="#fff" /><Text style={CameraStyles.cancelText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CS = StyleSheet.create({
  phaseBar: { position: 'absolute', top: 52, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  phaseText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  thumb: { width: 48, height: 30, borderRadius: 5, borderWidth: 2, borderColor: colors.amber },
  flashWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  flashBox: { alignItems: 'center', gap: 10 },
  flashTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
  controls: { position: 'absolute', bottom: 36, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16, flexWrap: 'wrap' },
});

// ─── QR BANNER ──
function QRBanner({ fields, onDismiss }: { fields: Partial<Record<string, string>>; onDismiss: () => void }) {
  const items = Object.entries(fields).filter(([k, v]) => v && v.length > 0 && k !== 'qrdetail');
  const details = fields['qrdetail'];
  return (
    <View style={S.qrBanner}>
      <View style={S.qrHead}>
        <View style={S.qrIco}><Ionicons name="qr-code" size={18} color="#7c3aed" /></View>
        <Text style={S.qrTitle}>QR Code Decoded</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity>
      </View>
      {items.map(([k, v]) => (
        <Text key={k} style={S.qrItem}><Text style={{ fontWeight: '700', color: '#5b21b6' }}>{fLabel(k)}: </Text>{v}</Text>
      ))}
      {details && <Text style={S.qrItem}><Text style={{ fontWeight: '700', color: '#5b21b6' }}>Info: </Text>{details}</Text>}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────
const S = StyleSheet.create({
  editRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4, borderWidth: 1.5, borderColor: colors.amber + '55', gap: 6, elevation: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 7, borderWidth: 1, width: 82, flexShrink: 0 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2, flex: 1 },
  editInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f8fafc', borderRadius: 7, minHeight: 34 },
  delBtn: { width: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingTop: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amber, gap: 6 },
  addInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f8fafc', borderRadius: 7, minHeight: 34 },
  addBtn: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, gap: 12, marginBottom: 2 },
  typeIco: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLbl: { flex: 1, fontSize: 14, fontWeight: '600' },
  actionBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.navy, gap: 6 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', minHeight: 38 },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  reclassBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber + '15', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10, borderWidth: 1, borderColor: colors.amber + '35' },
  reclassText: { fontSize: 11, color: colors.amberDark, flex: 1, lineHeight: 15 },
  stickyBar: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 2 },
  stickyCancel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  stickyCancelTxt: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  stickySave: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: colors.amber },
  stickySaveTxt: { fontSize: 13, fontWeight: '700', color: colors.navy },
  dualWrap: { flexDirection: 'row', height: 160, backgroundColor: '#000', position: 'relative' },
  dualHalf: { flex: 1, position: 'relative', overflow: 'hidden' },
  dualImg: { width: '100%', height: '100%' },
  dualDiv: { width: 2, backgroundColor: colors.amber },
  sideLabel: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.amber + 'cc', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  sideLabelTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  dualBadge: { position: 'absolute', top: 8, left: '50%', transform: [{ translateX: -44 }], flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.amber, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dualBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.navy },
  dualBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.amber + '40' },
  dualBannerTxt: { fontSize: 11, color: colors.amberDark, flex: 1, fontWeight: '600' },
  procWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.phoneBg },
  procTxt: { color: colors.text, fontSize: 17, fontWeight: '700' },
  procStepWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  procStep: { fontSize: 12, color: colors.muted },
  qrBanner: { backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#7c3aed33' },
  qrHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrIco: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#7c3aed20', alignItems: 'center', justifyContent: 'center' },
  qrTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#5b21b6' },
  qrItem: { fontSize: 12, color: '#4c1d95', lineHeight: 20, marginBottom: 2 },
  gstBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfeff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: '#0891b233' },
  gstTxt: { fontSize: 12, color: '#0e7490', fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  partnerBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: '#16a34a33' },
  partnerTxt: { fontSize: 12, color: '#166534', fontWeight: '600' },
});

// ─── MAIN SCREEN ──────────────────────────────────────
export default function ScanScreen() {
  const { cards, addCard, deleteCard, updateCard } = useCards();
  const { addContact, loading: savingContact } = useContact();
  const { setMenuVisible } = useMenuVisibility();

  const [isProc, setIsProc] = useState(false);
  const [procStep, setProcStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<FieldItem[]>([]);
  const [qrBanner, setQrBanner] = useState<{ cardId: string; fields: Partial<Record<string, string>> } | null>(null);
  // ── field-level errors from backend ──────────────────
  const [saveFieldErrors, setSaveFieldErrors] = useState<Record<string, string>>({});

  const [showCam, setShowCam] = useState(true);
  const [phase, setPhase] = useState<CameraPhase>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const liveQR = useRef<string | null>(null);

  useEffect(() => { setMenuVisible(!showCam); }, [showCam, setMenuVisible]);

  useFocusEffect(useCallback(() => {
    setFrontUri(null); setPhase('front'); setExpandedId(null); setEditingId(null); setLocalFields([]);
    setShowCam(true); setQrBanner(null); liveQR.current = null; setSaveFieldErrors({});
    return () => { setShowCam(false); };
  }, []));

  const { openCamera: openCameraParam } = useLocalSearchParams<{ openCamera?: string }>();

  useEffect(() => {
    if (openCameraParam) {
      setFrontUri(null); setPhase('front'); liveQR.current = null;
      setExpandedId(null); setEditingId(null); setLocalFields([]);
      setQrBanner(null); setShowCam(true); setSaveFieldErrors({});
    }
  }, [openCameraParam]);

  const openCamera = useCallback(() => { setFrontUri(null); setPhase('front'); liveQR.current = null; setShowCam(true); }, []);
  const closeCamera = useCallback(() => { setShowCam(false); setFrontUri(null); setPhase('front'); liveQR.current = null; }, []);
  const onLiveQR = useCallback((d: string) => { liveQR.current = d; }, []);

  const runOCR = async (uri: string): Promise<string> => {
    try {
      const res = await MlkitOcr.detectFromUri(uri); if (!res?.length) return '';
      return res.map((b: any) => { if (b.lines) return b.lines.map((l: any) => l.elements ? l.elements.map((e: any) => e.text || '').join(' ') : (l.text || '')).join('\n'); return b.text || ''; }).join('\n');
    } catch { return ''; }
  };

  const buildCard = useCallback(async (fUri: string, bUri?: string | null) => {
    setIsProc(true); setProcStep('Running OCR…'); setShowCam(false);
    try {
      const ft = await runOCR(fUri), bt = bUri ? await runOCR(bUri) : '';
      if (!ft.trim() && !bt.trim()) {
        Alert.alert('No Text Detected', 'Try again with better lighting.', [{ text: 'Retry', onPress: openCamera }, { text: 'Cancel', style: 'cancel' }]);
        return;
      }
      let fields: FieldItem[], fullText: string;
      if (bUri && bt.trim()) {
        const ff = extractFields(ft), bf = extractFields(bt);
        const seen = new Set(ff.map(f => f.value.toLowerCase().trim())); const merged = [...ff];
        bf.forEach(f => { if (!seen.has(f.value.toLowerCase().trim())) { merged.push(f); seen.add(f.value.toLowerCase().trim()); } });
        merged.forEach((f, i) => { f.order = i; });
        fields = merged; fullText = `${ft}\n\n--- BACK ---\n\n${bt}`;
      } else { fields = extractFields(ft); fullText = ft; }

      const addrF = fields.filter(f => f.type === 'address'), nonA = fields.filter(f => f.type !== 'address');
      if (addrF.length > 0) { const av = addrF.map(f => f.value.trim()).filter(Boolean).join(', '); fields = [{ id: uid('addr'), type: 'address', value: av, order: 0 }, ...nonA]; fields.forEach((f, i) => { f.order = i; }); }

      setProcStep('Scanning for QR code…');
      let qrRaw: string | null = liveQR.current || null;
      if (!qrRaw) qrRaw = await scanQRFromImage(fUri);
      if (!qrRaw && bUri) qrRaw = await scanQRFromImage(bUri);
      liveQR.current = null;

      let qrFields: Partial<Record<string, string>> = {};
      if (qrRaw) {
        const parsed = parseQRToFields(qrRaw);
        console.log('RAW QR:', qrRaw);
        const verified: Partial<Record<string, string>> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (!v || !v.trim()) continue;
          if (qrRaw.toLowerCase().includes(v.toLowerCase().trim())) { verified[k] = v; }
        }
        qrFields = verified;
        if (Object.keys(qrFields).length > 0) {
          const existVals = new Set(fields.map(f => f.value.toLowerCase().trim()));
          const typeMap: Record<string, string> = { name: 'name', phone: 'phone', email: 'email', website: 'website', company: 'company', designation: 'designation', address: 'address', gst: 'gst', qrdetail: 'qrdetail' };
          Object.entries(qrFields).forEach(([k, v]) => {
            if (!v || !v.length) return;
            const t = typeMap[k] || k;
            if (!existVals.has(v.toLowerCase().trim())) { fields.push({ id: uid(`qr-${t}`), type: t, value: v, order: fields.length }); existVals.add(v.toLowerCase().trim()); }
          });
          fields.forEach((f, i) => { f.order = i; });
        }
      }

      const card: ExtendedScannedCard = { id: uid('card'), uri: fUri, ...(bUri ? { backUri: bUri, hasBothSides: true } : {}), data: { fullText } as OCRData, fields, tags: [], createdAt: new Date().toISOString(), exported: false };
      addCard(card);
      setExpandedId(card.id); setLocalFields((card.fields || []).map(f => ({ ...f }))); setEditingId(card.id);
      const bannerFields = Object.fromEntries(Object.entries(qrFields).filter(([k]) => k !== 'qrdetail'));
      if (qrRaw && Object.keys(bannerFields).length > 0) setQrBanner({ cardId: card.id, fields: bannerFields });
    } catch (e: any) { Alert.alert('Processing Failed', e.message ?? 'Unknown error'); }
    finally { setIsProc(false); setProcStep(''); }
  }, [addCard, openCamera]);

  const onCapture = useCallback(async (uri: string) => {
    if (phase === 'front') { setFrontUri(uri); setPhase('back'); }
    else { const f = frontUri!; setFrontUri(null); setPhase('front'); await buildCard(f, uri); }
  }, [phase, frontUri, buildCard]);

  const onSkip = useCallback(() => {
    if (phase === 'back' && frontUri) { const f = frontUri; setFrontUri(null); setPhase('front'); buildCard(f, null); }
  }, [phase, frontUri, buildCard]);

  const onGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Allow photo library access.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.95, allowsMultipleSelection: true, selectionLimit: 2 });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      if (res.assets.length >= 2) {
        const p1 = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1400 } }], { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG });
        const p2 = await ImageManipulator.manipulateAsync(res.assets[1].uri, [{ resize: { width: 1400 } }], { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG });
        await buildCard(p1.uri, p2.uri);
      } else {
        const proc = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1400 } }], { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG });
        if (phase === 'front') { setFrontUri(proc.uri); setPhase('back'); }
        else { const f = frontUri!; setFrontUri(null); setPhase('front'); await buildCard(f, proc.uri); }
      }
    } catch (e: any) { Alert.alert('Gallery Error', e?.message || 'Could not open gallery.'); }
  }, [phase, frontUri, buildCard]);

  const startEdit = useCallback((card: ExtendedScannedCard) => {
    setLocalFields((card.fields || []).map(f => ({ ...f })));
    setEditingId(card.id);
    setExpandedId(card.id);
    setSaveFieldErrors({});
  }, []);

  const cancelEdit = useCallback(() => { setEditingId(null); setLocalFields([]); setSaveFieldErrors({}); }, []);

  const showSaved = useCallback((card: ExtendedScannedCard, fields: FieldItem[]) => {
    Alert.alert('Contact Saved ✅', 'What next?', [
      { text: 'Send WhatsApp', onPress: () => { sendWhatsApp(card, fields); openCamera(); } },
      { text: 'Scan Next', onPress: () => openCamera() },
      { text: 'View Contacts', onPress: () => { setShowCam(false); router.replace('/(tabs)/contacts'); } },
    ]);
  }, [openCamera]);

  // ── field type → contact payload key mapping ──────────
  const FIELD_TYPE_TO_PAYLOAD_KEY: Record<string, string> = {
    phone: 'phoneNumber1',   // phoneNumber1/2/3 handled by index below
    email: 'email1',
    website: 'website1',
    company: 'companyName',
    subcompany: 'subCompanyName',
    designation: 'designation',
    name: 'personName',
    address: 'address',
    gst: 'gstNumber',
    partnership: 'partnership',
    qrdetail: 'qrCodeDetail',
    service: 'servicesCsv',
  };

  // Map backend camelCase key back to field type for highlighting the right row
  const PAYLOAD_KEY_TO_FIELD_TYPE: Record<string, string> = {
    phoneNumber1: 'phone', phoneNumber2: 'phone', phoneNumber3: 'phone',
    email1: 'email', email2: 'email',
    website1: 'website', website2: 'website',
    companyName: 'company', subCompanyName: 'subcompany',
    designation: 'designation', personName: 'name',
    address: 'address', gstNumber: 'gst',
    partnership: 'partnership', qrCodeDetail: 'qrdetail',
    servicesCsv: 'service',
  };

  const saveEdit = useCallback(async (cardId: string) => {
    const card = (cards as ExtendedScannedCard[]).find(c => c.id === cardId); if (!card) return;
    const reord = localFields.map((f, i) => ({ ...f, order: i }));
    updateCard(cardId, { ...card, fields: reord } as unknown as ScannedCard);
    setIsSaving(true);
    setSaveFieldErrors({});
    try {
      const get = (t: string, i = 0) => reord.filter(f => f.type === t)[i]?.value || '';
      const fi = await uriToBase64(card.uri), bi = card.hasBothSides && card.backUri ? await uriToBase64(card.backUri) : '';
      await addContact({
        companyName: get('company'), subCompanyName: get('subcompany'), branchName: '',
        personName: get('name'), designation: get('designation'),
        phoneNumber1: get('phone', 0), phoneNumber2: get('phone', 1), phoneNumber3: get('phone', 2),
        email1: get('email', 0), email2: get('email', 1),
        address: buildAddress(reord),
        servicesCsv: reord.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1: get('website', 0), website2: get('website', 1),
        rawExtractedText: (card.data as any)?.fullText || '',
        frontImageAsString: fi, frontImageMimeType: 'image/jpeg',
        backImageAsString: bi, backImageMimeType: 'image/jpeg',
        gstNumber: get('gst'),
        partnership: reord.filter(f => f.type === 'partnership').map(f => f.value).join(', '),
        qrCodeDetail: reord.filter(f => f.type === 'qrdetail').map(f => f.value).join('\n---\n'),
      });
      deleteCard(card.id); showSaved(card, reord);
    } catch (e: any) {
      // Extract field-level errors and map payload keys → field types
      const raw = extractFieldErrors(e);
      const mapped: Record<string, string> = {};
      for (const [payloadKey, msg] of Object.entries(raw)) {
        const fieldType = PAYLOAD_KEY_TO_FIELD_TYPE[payloadKey];
        if (fieldType) mapped[fieldType] = msg;
        else mapped[payloadKey] = msg;
      }
      setSaveFieldErrors(mapped);
      // Show a concise Alert listing which fields failed
      const lines = Object.entries(mapped).map(([ft, msg]) => `• ${fLabel(ft)}: ${msg}`).join('\n');
      Alert.alert('Save Failed — Fix These Fields', lines || extractApiError(e));
    }
    finally { setIsSaving(false); }
  }, [cards, localFields, updateCard, addContact, deleteCard, showSaved]);

  const saveContact = async (card: ExtendedScannedCard) => {
    const fields = card.fields || [], get = (t: string, i = 0) => fields.filter(f => f.type === t)[i]?.value || '';
    try {
      const fi = await uriToBase64(card.uri), bi = card.hasBothSides && card.backUri ? await uriToBase64(card.backUri) : '';
      await addContact({
        companyName: get('company'), subCompanyName: get('subcompany'), branchName: '',
        personName: get('name'), designation: get('designation'),
        phoneNumber1: get('phone', 0), phoneNumber2: get('phone', 1), phoneNumber3: get('phone', 2),
        email1: get('email', 0), email2: get('email', 1),
        address: buildAddress(fields),
        servicesCsv: fields.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1: get('website', 0), website2: get('website', 1),
        rawExtractedText: (card.data as any)?.fullText || '',
        frontImageAsString: fi, frontImageMimeType: 'image/jpeg',
        backImageAsString: bi, backImageMimeType: 'image/jpeg',
        gstNumber: get('gst'),
        partnership: fields.filter(f => f.type === 'partnership').map(f => f.value).join(', '),
        qrCodeDetail: fields.filter(f => f.type === 'qrdetail').map(f => f.value).join('\n---\n'),
      });
      deleteCard(card.id); showSaved(card, fields);
    } catch (e: any) { Alert.alert('Save Failed', extractApiError(e)); }
  };

  const upd = useCallback((id: string, v: string) => {
    setLocalFields(p => p.map(f => f.id === id ? { ...f, value: v } : f));
    // Clear error for this field's type when user edits it
    setSaveFieldErrors(prev => {
      const field = localFields.find(f => f.id === id);
      if (!field || !prev[field.type]) return prev;
      const next = { ...prev }; delete next[field.type]; return next;
    });
  }, [localFields]);

  const del = useCallback((id: string) => setLocalFields(p => p.filter(f => f.id !== id)), []);
  const chType = useCallback((id: string, t: string) => setLocalFields(p => p.map(f => f.id === id ? { ...f, type: t } : f)), []);
  const addF = useCallback((t: string, v: string) => setLocalFields(p => [...p, { id: uid(t), type: t, value: v, order: p.length }]), []);

  const reclassify = useCallback(() => {
    const rc = reClassify(localFields);
    const n = rc.filter((f, i) => f.type !== localFields[i]?.type).length;
    setLocalFields(rc);
    Alert.alert(n > 0 ? `Re-classified ✨ (${n} fixed)` : 'All Good!', n > 0 ? `${n} field${n > 1 ? 's were' : ' was'} fixed.` : 'All types look correct.');
  }, [localFields]);

  const copyAll = async (card: ExtendedScannedCard) => { await Clipboard.setStringAsync((card.fields || []).map(f => `${fLabel(f.type).toUpperCase()}: ${f.value}`).join('\n')); Alert.alert('Copied', 'All fields copied'); };
  const copyField = async (v: string, t: string) => { await Clipboard.setStringAsync(v); Alert.alert('Copied', `${fLabel(t)} copied`); };

  const renderCard = ({ item }: { item: ExtendedScannedCard }) => {
    const isExp = expandedId === item.id, isEdit = editingId === item.id;
    const dF = isEdit ? [...localFields].sort((a, b) => a.order - b.order) : (item.fields || []).sort((a, b) => a.order - b.order);
    const cardName = item.fields?.find(f => f.type === 'name')?.value || 'Business Card';
    const gstF = dF.find(f => f.type === 'gst'), partF = dF.filter(f => f.type === 'partnership'), qrF = dF.filter(f => f.type === 'qrdetail');

    return (
      <View style={[scanStyles.card, { backgroundColor: colors.white }]}>
        {item.hasBothSides && item.backUri ? (
          <View style={S.dualWrap}>
            <View style={S.dualHalf}><Image source={{ uri: item.uri }} style={S.dualImg} contentFit="cover" /><View style={S.sideLabel}><Ionicons name="arrow-forward-circle" size={12} color="#fff" /><Text style={S.sideLabelTxt}>FRONT</Text></View></View>
            <View style={S.dualDiv} />
            <View style={S.dualHalf}><Image source={{ uri: item.backUri }} style={S.dualImg} contentFit="cover" /><View style={[S.sideLabel, { backgroundColor: colors.navy + 'cc' }]}><Ionicons name="arrow-back-circle" size={12} color="#fff" /><Text style={S.sideLabelTxt}>BACK</Text></View></View>
            <View style={S.dualBadge}><Ionicons name="swap-horizontal" size={11} color={colors.navy} /><Text style={S.dualBadgeTxt}>Front & Back</Text></View>
          </View>
        ) : <Image source={{ uri: item.uri }} style={scanStyles.cardImage} contentFit="cover" />}

        <TouchableOpacity style={scanStyles.deleteBtn} onPress={() => Alert.alert('Delete', 'Remove this card?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (editingId === item.id) cancelEdit(); deleteCard(item.id); } }])}>
          <Ionicons name="trash-outline" size={16} color={colors.white} />
        </TouchableOpacity>

        <View style={S.actionBar}>
          <TouchableOpacity style={S.actionBtn} onPress={() => copyAll(item)}><Ionicons name="copy-outline" size={13} color="#fff" /><Text style={S.actionBtnText}>Copy All</Text></TouchableOpacity>
          {isEdit ? (<>
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#ef4444cc' }]} onPress={cancelEdit} disabled={isSaving}><Ionicons name="close" size={13} color="#fff" /><Text style={S.actionBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber, flex: 1.5 }]} onPress={() => saveEdit(item.id)} disabled={isSaving}>{isSaving ? <ActivityIndicator size="small" color={colors.navy} /> : <><Ionicons name="checkmark" size={13} color={colors.navy} /><Text style={[S.actionBtnText, { color: colors.navy }]}>Save</Text></>}</TouchableOpacity>
          </>) : (<>
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]} onPress={openCamera}><Ionicons name="camera-outline" size={13} color="#fff" /><Text style={S.actionBtnText}>New Scan</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber }]} onPress={() => startEdit(item)}><Ionicons name="create-outline" size={13} color={colors.navy} /><Text style={[S.actionBtnText, { color: colors.navy }]}>Edit</Text></TouchableOpacity>
          </>)}
        </View>

        <TouchableOpacity style={[scanStyles.cardHeader, { borderTopColor: colors.border }]} onPress={() => { if (!isEdit) setExpandedId(isExp ? null : item.id); }} activeOpacity={0.7}>
          <View style={[scanStyles.avatar, { backgroundColor: colors.amberLight }]}><Text style={[scanStyles.avatarText, { color: colors.amberDark }]}>{cardName.charAt(0).toUpperCase()}</Text></View>
          <View style={scanStyles.cardInfo}>
            <Text style={[scanStyles.cardName, { color: colors.text }]} numberOfLines={1}>{cardName}</Text>
            <Text style={[scanStyles.cardDetail, { color: colors.muted }]}>{dF.length} fields{gstF ? ' · 🧾 GST' : ''}{qrF.length > 0 ? ' · 📷 QR' : ''}{partF.length > 0 ? ' · 🤝' : ''}{isEdit ? ' · ✏️ editing' : ''}</Text>
          </View>
          {!isEdit && <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />}
        </TouchableOpacity>

        {isExp && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
            <View style={[scanStyles.details, { paddingBottom: isEdit ? 8 : 16 }]}>
              {item.hasBothSides && <View style={S.dualBanner}><Ionicons name="swap-horizontal" size={14} color={colors.amber} /><Text style={S.dualBannerTxt}>Fields merged from front & back</Text></View>}
              {qrBanner && qrBanner.cardId === item.id && <QRBanner fields={qrBanner.fields} onDismiss={() => setQrBanner(null)} />}
              {!isEdit && gstF && <View style={S.gstBanner}><Ionicons name="receipt-outline" size={14} color="#0891b2" /><Text style={S.gstTxt}>GST: {gstF.value}</Text><TouchableOpacity onPress={() => copyField(gstF.value, 'gst')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="copy-outline" size={13} color="#0891b2" /></TouchableOpacity></View>}
              {!isEdit && partF.length > 0 && <View style={S.partnerBanner}><Ionicons name="handshake-outline" size={14} color="#16a34a" /><Text style={S.partnerTxt} numberOfLines={2}>{partF.map(f => f.value).join(' • ')}</Text></View>}
              {isEdit && <TouchableOpacity style={S.reclassBar} onPress={reclassify}><Ionicons name="sparkles" size={15} color={colors.amberDark} /><Text style={S.reclassText}>Auto-fix field types</Text><Ionicons name="chevron-forward" size={13} color={colors.amber} /></TouchableOpacity>}
              {dF.map(f => (
                <FieldRow
                  key={f.id}
                  field={f}
                  isEdit={isEdit}
                  onUpdate={upd}
                  onDelete={del}
                  onChangeType={chType}
                  onCopy={copyField}
                  error={isEdit ? saveFieldErrors[f.type] : undefined}
                />
              ))}
              {isEdit && <AddField onAdd={addF} />}
              {isEdit && (
                <View style={S.stickyBar}>
                  <TouchableOpacity style={S.stickyCancel} onPress={cancelEdit} disabled={isSaving}><Ionicons name="close-circle-outline" size={16} color="#dc2626" /><Text style={S.stickyCancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={S.stickySave} onPress={() => saveEdit(item.id)} disabled={isSaving}>{isSaving ? <ActivityIndicator size="small" color={colors.navy} /> : <><Ionicons name="checkmark-circle-outline" size={16} color={colors.navy} /><Text style={S.stickySaveTxt}>Save & Sync Contact</Text></>}</TouchableOpacity>
                </View>
              )}
              {!isEdit && <>
                <TouchableOpacity style={[scanStyles.rawButton, { backgroundColor: colors.amber + '15', borderColor: colors.amber, marginTop: 8 }]} onPress={() => saveContact(item)} disabled={savingContact}>
                  {savingContact ? <ActivityIndicator size="small" color={colors.amber} /> : <><Ionicons name="person-add-outline" size={14} color={colors.amberDark} /><Text style={[scanStyles.rawButtonText, { color: colors.amberDark }]}>Save as Contact</Text></>}
                </TouchableOpacity>
                {item.data && <TouchableOpacity style={[scanStyles.rawButton, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => Alert.alert('Raw OCR Text', (item.data as any).fullText || 'No text')}><Ionicons name="document-text-outline" size={14} color={colors.amberDark} /><Text style={[scanStyles.rawButtonText, { color: colors.amberDark }]}>View Raw OCR</Text></TouchableOpacity>}
              </>}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    );
  };

  if (showCam) return <CameraScanner phase={phase} onCapture={onCapture} onClose={closeCamera} capturedFrontUri={frontUri} onGalleryPick={onGallery} onLiveQR={onLiveQR} onSkip={onSkip} />;

  if (isProc) return (
    <View style={S.procWrap}>
      <ActivityIndicator size="large" color={colors.amber} />
      <Text style={S.procTxt}>Reading card…</Text>
      <View style={S.procStepWrap}><Ionicons name="sync-outline" size={14} color={colors.muted} /><Text style={S.procStep}>{procStep || 'Extracting text…'}</Text></View>
    </View>
  );

  return (
    <View style={[scanStyles.container, { backgroundColor: colors.phoneBg }]}>
      <View style={[scanStyles.header, { backgroundColor: colors.navy }]}>
        <View style={scanStyles.headerGlow} />
        <View><Text style={scanStyles.greetText}>SCAN BUSINESS CARDS</Text><Text style={scanStyles.titleText}>Card <Text style={scanStyles.titleSpan}>Scanner</Text></Text></View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[scanStyles.badge, { backgroundColor: colors.amber + '20' }]}><Ionicons name="scan-outline" size={16} color={colors.amber} /><Text style={[scanStyles.badgeText, { color: colors.amber }]}>ML Kit</Text></View>
          <TouchableOpacity style={{ backgroundColor: colors.amber, borderRadius: 8, padding: 8 }} onPress={openCamera}><Ionicons name="camera" size={18} color={colors.navy} /></TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={cards as ExtendedScannedCard[]}
        keyExtractor={i => i.id}
        renderItem={renderCard}
        contentContainerStyle={scanStyles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={scanStyles.emptyContainer}><View style={[scanStyles.emptyIcon, { backgroundColor: colors.amberLight }]}><Ionicons name="scan-outline" size={48} color={colors.amberDark} /></View><Text style={[scanStyles.emptyTitle, { color: colors.text }]}>Ready to scan</Text><Text style={[scanStyles.emptyText, { color: colors.muted }]}>Tap the camera button above</Text></View>}
      />
    </View>
  );
}