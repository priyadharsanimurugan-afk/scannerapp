// app/(tabs)/scan.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Text, View, StyleSheet, Alert, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import MlkitOcr from 'react-native-mlkit-ocr';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useCards, ScannedCard, OCRData } from '@/components/store/useCardStore';
import { useContact } from '@/hooks/useContact';
import { colors } from '@/constants/colors';
import { CameraStyles, scanStyles } from '@/components/styles/scanStyles';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { useMenuVisibility } from '@/context/MenuVisibilityContext';

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

type CameraPhase = 'front' | 'back';

// ─────────────────────────────────────────────────────
// GLOBALLY UNIQUE ID GENERATOR
// ─────────────────────────────────────────────────────
let _globalIdSeed = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_globalIdSeed}`;
}

// ─────────────────────────────────────────────────────
// API ERROR EXTRACTOR
// ─────────────────────────────────────────────────────
function extractApiError(e: any): string {
  if (!e) return 'An unknown error occurred.';
  const data = e?.response?.data ?? e?.data ?? null;
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (data.errors && typeof data.errors === 'object') {
      const messages: string[] = [];
      Object.entries(data.errors as Record<string, string[]>).forEach(([key, vals]) => {
        if (Array.isArray(vals)) vals.forEach(v => messages.push(key === '$' ? v : `${key}: ${v}`));
      });
      if (messages.length) return messages.join('\n');
    }
    if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  }
  if (typeof e.message === 'string' && e.message.trim()) return e.message.trim();
  return 'Something went wrong. Please try again.';
}

// ─────────────────────────────────────────────────────
// INTELLIGENT CLASSIFIER
// ─────────────────────────────────────────────────────
const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE   = /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}$/;
const URL_RE     = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/;
const PINCODE_RE = /^\d{6}$/;
const NAME_RE    = /^[A-Za-z\s.'\-]+$/;
const GST_RE     = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const DESIG_KEYWORDS      = ['manager','director','engineer','developer','designer','officer','president','head','lead','specialist','analyst','consultant','associate','founder','ceo','cto','cfo','coo','vp','executive','proprietor','partner','chairman','md','gm','sr.','jr.','senior','junior','incharge','in-charge','coordinator','supervisor','technician','accountant','executive director'];
const COMPANY_INDICATORS  = ['pvt','ltd','limited','llc','inc','corp','& co','company','industries','enterprises','solutions','technologies','systems','group','associates','partners','holdings','international','global','ventures','foundation','trust'];
const SERVICE_KEYWORDS    = ['services','solutions','consulting','training','development','design','manufacturing','trading','retail','wholesale','distribution','import','export','agency','consultancy','software','hardware','automation','fabrication','contractor','supplier','dealer','logistics'];
const ADDR_KEYWORDS       = ['road','rd','street','st','nagar','colony','sector','building','bldg','near','opp','opposite','phase','block','avenue','lane','bypass','highway','floor','flr','plot','flat','door','house','office','shop','suite','main','cross','circle','junction','jn','market','bazaar','chowk','marg','salai','layout','extension','extn','village','taluk','district','dist','state','pin','p.o','po box','area','zone','industrial'];
const STATE_LIST          = ['andhra','telangana','karnataka','tamil','kerala','maharashtra','gujarat','rajasthan','punjab','haryana','delhi','bihar','uttar','madhya','west bengal','odisha','assam','jharkhand','uttarakhand','himachal','goa','manipur','meghalaya','mizoram','nagaland','sikkim','tripura','arunachal','chhattisgarh','puducherry'];
const CITY_LIST           = ['chennai','mumbai','delhi','bangalore','bengaluru','hyderabad','pune','kolkata','ahmedabad','surat','jaipur','lucknow','kanpur','nagpur','indore','thane','bhopal','visakhapatnam','vizag','patna','vadodara','ghaziabad','ludhiana','agra','nashik','faridabad','meerut','rajkot','coimbatore','madurai','tiruppur','tirunelveli','vellore','salem','erode','trichy','tiruchirappalli','kochi','calicut','kozhikode','mysuru','mysore','hubli','dharwad','belgaum','bellary','mangaluru','mangalore','ranchi','raipur','amritsar','chandigarh','bhubaneswar','cuttack','guwahati','vijayawada','guntur','nellore','warangal','srinagar','jammu','dehradun','haridwar','allahabad','prayagraj','varanasi','jodhpur','udaipur','kota','ajmer','sikar','dhanbad','jamshedpur','gaya','muzaffarpur','durgapur','asansol','siliguri','howrah','navi mumbai','thana'];
const PARTNERSHIP_KEYWORDS = ['partner','partnership','collaboration','joint venture','tie-up','alliance','franchise','distributor','authorized','agent','representative','reseller','dealership'];

export function smartClassify(value: string): string {
  const v = value.trim();
  const lower = v.toLowerCase();
  const scores: Record<string, number> = {
    email:0, phone:0, website:0, pincode:0, name:0,
    designation:0, company:0, service:0, address:0, subcompany:0,
    gst:0, partnership:0, qrdetail:0, other:0,
  };

  if (EMAIL_RE.test(v)) return 'email';
  if (GST_RE.test(v.toUpperCase())) return 'gst';
  if (/\bgstin?\b/i.test(v) || /\bgst\s*no/i.test(v)) scores.gst += 80;

  const digits = v.replace(/\D/g, '');
  if (PINCODE_RE.test(v) && /^[1-9]/.test(v)) scores.pincode += 95;
  if (PHONE_RE.test(v) && digits.length >= 7 && digits.length <= 15) scores.phone += 90;
  if (URL_RE.test(v) && !EMAIL_RE.test(v) && !v.includes(' ')) scores.website += 85;

  const desigMatches = DESIG_KEYWORDS.filter(k => lower.includes(k)).length;
  scores.designation += desigMatches * 35;
  if (lower.match(/^(sr\.|jr\.|senior|junior|chief|deputy|asst\.?|assistant)\s/i)) scores.designation += 20;

  const companyMatches = COMPANY_INDICATORS.filter(k => lower.includes(k)).length;
  scores.company += companyMatches * 30;
  if (/\b(pvt\.?\s*ltd\.?|llc|inc\.?|corp\.?)\b/i.test(v)) scores.company += 40;

  scores.service += SERVICE_KEYWORDS.filter(k => lower.includes(k)).length * 22;
  scores.partnership += PARTNERSHIP_KEYWORDS.filter(k => lower.includes(k)).length * 30;

  scores.address += ADDR_KEYWORDS.filter(k => lower.split(/[\s,]+/).includes(k)).length * 28;
  scores.address += ADDR_KEYWORDS.filter(k => lower.includes(k)).length * 8;
  if (digits.length === 6 && /^[1-9]/.test(v)) scores.address += 20;
  if (v.length > 35) scores.address += 12;
  if (v.includes(',')) scores.address += 15;
  if (STATE_LIST.some(s => lower.includes(s))) scores.address += 30;
  if (CITY_LIST.some(c => lower.includes(c))) scores.address += 25;
  if (/^\d+[\/\-]\d+/.test(v)) scores.address += 20;
  if (/\b(no\.?|#)\s*\d+/i.test(v)) scores.address += 15;

  if (NAME_RE.test(v) && v.split(' ').length >= 2 && v.split(' ').length <= 5 && v.length < 35 && desigMatches === 0 && companyMatches === 0 && digits.length === 0) {
    scores.name += 45;
    if (/^(mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|er\.?|shri|smt|capt|col|lt)\s/i.test(v)) scores.name += 35;
    if (v === v.toUpperCase() && v.split(' ').length === 1) scores.name -= 30;
  }

  if (Math.max(...Object.values(scores)) < 10) scores.other += 5;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

function reClassifyFields(fields: FieldItem[]): FieldItem[] {
  return fields.map(field => {
    const smartType = smartClassify(field.value);
    const hardTypes = ['email', 'phone', 'website', 'pincode', 'gst'];
    if (hardTypes.includes(smartType) && field.type !== smartType) return { ...field, type: smartType };
    if (field.type === 'other' && smartType !== 'other') return { ...field, type: smartType };
    return field;
  });
}

// ─────────────────────────────────────────────────────
// QR CODE DECODER — uses react-native-mlkit-ocr to scan
// barcode/QR text embedded in the image.
// ML Kit OCR can detect QR codes that are printed on cards
// by reading the text they encode. For proper barcode scanning,
// install @react-native-ml-kit/barcode-scanning separately.
// This implementation uses a layered approach:
//  1. Try to extract any URL/vCard-like lines from OCR text
//  2. Use the raw OCR output to find QR-encoded text patterns
// ─────────────────────────────────────────────────────
async function decodeQRFromOCRText(ocrText: string): Promise<string | null> {
  if (!ocrText || !ocrText.trim()) return null;

  // vCard encoded in QR
  if (/BEGIN:VCARD/i.test(ocrText)) {
    const match = ocrText.match(/BEGIN:VCARD[\s\S]*?END:VCARD/i);
    if (match) return match[0].trim();
  }

  // MeCard format
  if (/MECARD:/i.test(ocrText)) {
    const match = ocrText.match(/MECARD:[^\n]+/i);
    if (match) return match[0].trim();
  }

  // UPI payment QR
  if (/upi:\/\//i.test(ocrText)) {
    const match = ocrText.match(/upi:\/\/[^\s]+/i);
    if (match) return match[0].trim();
  }

  // Standalone URL (likely QR content)
  const urlMatch = ocrText.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) return urlMatch[0].trim();

  return null;
}

// ─────────────────────────────────────────────────────
// PARSE QR DETAIL — extract structured info from QR content
// ─────────────────────────────────────────────────────
function parseQRDetail(raw: string): { qrText: string; extractedFields: Partial<Record<string, string>> } {
  const extracted: Partial<Record<string, string>> = {};
  const lower = raw.toLowerCase();

  // vCard parsing
  if (lower.includes('begin:vcard')) {
    const getVCardField = (field: string) => {
      const match = raw.match(new RegExp(`${field}[^:]*:([^\r\n]+)`, 'i'));
      return match ? match[1].trim() : '';
    };
    const fn = getVCardField('FN');
    const n  = getVCardField('N')?.replace(/;/g, ' ').trim();
    extracted.name        = fn || n || '';
    extracted.phone       = getVCardField('TEL');
    extracted.email       = getVCardField('EMAIL');
    extracted.website     = getVCardField('URL');
    extracted.company     = getVCardField('ORG');
    extracted.designation = getVCardField('TITLE');
    const adr = getVCardField('ADR');
    if (adr) extracted.address = adr.replace(/;+/g, ', ').replace(/^,\s*/,'').replace(/,\s*,/g,',').trim();
    return { qrText: raw, extractedFields: extracted };
  }

  // MeCard parsing
  if (lower.includes('mecard:')) {
    const getField = (f: string) => {
      const match = raw.match(new RegExp(`${f}:([^;\\n]+)`, 'i'));
      return match ? match[1].trim() : '';
    };
    extracted.name    = getField('N');
    extracted.phone   = getField('TEL');
    extracted.email   = getField('EMAIL');
    extracted.website = getField('URL');
    return { qrText: raw, extractedFields: extracted };
  }

  // UPI
  if (/upi:\/\//i.test(raw)) {
    const pa  = raw.match(/pa=([^&\s]+)/i)?.[1];
    const pn  = raw.match(/pn=([^&\s]+)/i)?.[1];
    if (pa) extracted.email = pa; // UPI VPA stored as identifier
    if (pn) extracted.name  = decodeURIComponent(pn);
    return { qrText: raw, extractedFields: extracted };
  }

  // URL
  if (URL_RE.test(raw) && !raw.includes('\n')) {
    extracted.website = raw;
    return { qrText: raw, extractedFields: extracted };
  }

  // Email
  if (EMAIL_RE.test(raw) && !raw.includes('\n')) {
    extracted.email = raw;
    return { qrText: raw, extractedFields: extracted };
  }

  // GST number
  if (GST_RE.test(raw.trim().toUpperCase())) {
    extracted.gst = raw.trim().toUpperCase();
    return { qrText: raw, extractedFields: extracted };
  }

  return { qrText: raw, extractedFields: extracted };
}

// ─────────────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────────────
const sendWhatsAppMessage = async (card: ExtendedScannedCard, fields: FieldItem[]) => {
  const get    = (type: string, idx = 0) => fields.filter(f => f.type === type)[idx]?.value || '';
  const getAll = (type: string) => fields.filter(f => f.type === type).map(f => f.value).join(', ');
  const phone = get('phone').replace(/\D/g, '');
  if (!phone) { Alert.alert('No Phone Number', 'Cannot send WhatsApp message without a phone number.'); return; }
  const message = [
    'Hi 👋\n\nThis is Scanify App.\n\nHere is the scanned contact information:\n',
    `👤 Name: ${get('name')}`,
    `🏢 Company: ${get('company')}`,
    `💼 Designation: ${get('designation')}`,
    `📧 Email: ${get('email')}`,
    `🌐 Website: ${get('website')}`,
    `📍 Address: ${getAll('address')}`,
    get('gst') ? `🧾 GST: ${get('gst')}` : '',
    get('partnership') ? `🤝 Partnership: ${get('partnership')}` : '',
    '\nSaved via Scanify Card Scanner.',
  ].filter(Boolean).join('\n');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  try { await Linking.openURL(url); } catch { Alert.alert('WhatsApp not installed'); }
};

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const cleanLine = (l: string) => l.replace(/[|\\]/g, '').replace(/\s{2,}/g, ' ').trim();

function mergeAddressLines(lines: string[], pincodes: string[]): string[] {
  const result: string[] = [];
  let addrBuffer: string[] = [];
  const isAddrLine = (l: string) => {
    const lo = l.toLowerCase();
    return (
      ADDR_KEYWORDS.some(k => lo.split(/[\s,]+/).includes(k)) ||
      ADDR_KEYWORDS.some(k => lo.includes(k)) ||
      pincodes.some(p => l.includes(p)) ||
      STATE_LIST.some(s => lo.includes(s)) ||
      CITY_LIST.some(c => lo.includes(c)) ||
      /^\d+[\/\-]\d+/.test(l) ||
      /\b(no\.?|#)\s*\d+/i.test(l)
    );
  };
  for (const line of lines) {
    if (isAddrLine(line)) { addrBuffer.push(line); }
    else {
      if (addrBuffer.length > 0) { result.push(addrBuffer.join(', ')); addrBuffer = []; }
      result.push(line);
    }
  }
  if (addrBuffer.length > 0) result.push(addrBuffer.join(', '));
  return result;
}

const extractAllFields = (rawText: string): FieldItem[] => {
  const rawLines = rawText.split('\n').map(cleanLine).filter(l => l.length > 1);
  const fullText = rawLines.join(' ');

  const pincodeRegex = /\b[1-9][0-9]{5}\b/g;
  const pincodes = [...new Set([...fullText.matchAll(pincodeRegex)].map(m => m[0]))];
  const lines = mergeAddressLines(rawLines, pincodes);
  const fields: FieldItem[] = [];

  // GST from full text
  const gstMatches = [...fullText.matchAll(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g)];
  const gstNumbers = [...new Set(gstMatches.map(m => m[0]))];
  gstNumbers.forEach(gst => fields.push({ id: uid('gst'), type: 'gst', value: gst, order: fields.length }));

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set([...fullText.matchAll(emailRegex)].map(m => m[0].toLowerCase()))];
  emails.forEach(email => fields.push({ id: uid('email'), type: 'email', value: email, order: fields.length }));

  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;
  const phones = [...new Set([...fullText.matchAll(phoneRegex)].map(m => m[0].trim()))];
  phones.forEach(phone => {
    const d = phone.replace(/\D/g, '');
    if (d.length >= 7 && d.length <= 15 && !emails.some(e => e.includes(phone)))
      fields.push({ id: uid('phone'), type: 'phone', value: phone, order: fields.length });
  });

  const urlRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s,;)\]"']*)?/g;
  const urls = [...new Set([...fullText.matchAll(urlRegex)].map(m => m[0]))];
  urls.forEach(url => {
    if (!emails.some(e => url.includes(e)) && !url.match(/^\d/) && url.length > 4)
      fields.push({ id: uid('web'), type: 'website', value: url, order: fields.length });
  });

  pincodes.forEach(pin => fields.push({ id: uid('pin'), type: 'pincode', value: pin, order: fields.length }));

  const alreadyExtracted = new Set<string>([...emails, ...phones, ...urls, ...pincodes, ...gstNumbers].map(v => v.toLowerCase()));
  const isDuplicate = (v: string) => alreadyExtracted.has(v.toLowerCase());
  const seenValues = new Set<string>();

  for (const line of lines) {
    if (line.length <= 1) continue;
    const lower = line.toLowerCase();
    const trimmed = line.trim();
    if (isDuplicate(trimmed)) continue;
    if (seenValues.has(trimmed.toLowerCase())) continue;

    const gstLineMatch = trimmed.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/);
    if (gstLineMatch && !gstNumbers.includes(gstLineMatch[0])) {
      fields.push({ id: uid('gst'), type: 'gst', value: gstLineMatch[0], order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }

    const addrScore = (
      ADDR_KEYWORDS.filter(k => lower.split(/[\s,]+/).includes(k)).length * 28 +
      ADDR_KEYWORDS.filter(k => lower.includes(k)).length * 8 +
      (pincodes.some(p => line.includes(p)) ? 40 : 0) +
      (STATE_LIST.some(s => lower.includes(s)) ? 30 : 0) +
      (CITY_LIST.some(c => lower.includes(c)) ? 25 : 0) +
      (trimmed.includes(',') ? 15 : 0) +
      (/^\d+[\/\-]\d+/.test(trimmed) ? 20 : 0)
    );
    if (addrScore >= 28) {
      const normalized = trimmed.replace(/,\s*,+/g,',').replace(/\s{2,}/g,' ').replace(/^[,\s]+|[,\s]+$/g,'').trim();
      if (normalized.length > 2) {
        fields.push({ id: uid('addr'), type: 'address', value: normalized, order: fields.length });
        seenValues.add(trimmed.toLowerCase()); continue;
      }
    }

    if (PARTNERSHIP_KEYWORDS.some(k => lower.includes(k)) && trimmed.length < 80) {
      fields.push({ id: uid('partner'), type: 'partnership', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }
    if (DESIG_KEYWORDS.some(k => lower.includes(k)) && trimmed.length < 60 && !trimmed.match(/pvt|ltd/i)) {
      fields.push({ id: uid('desig'), type: 'designation', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }
    if (COMPANY_INDICATORS.some(ind => lower.includes(ind)) && trimmed.length < 80) {
      fields.push({ id: uid('company'), type: 'company', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }
    if (SERVICE_KEYWORDS.some(k => lower.includes(k)) && trimmed.length < 60) {
      fields.push({ id: uid('service'), type: 'service', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }

    const nameIndicators = ['mr','ms','mrs','dr','prof','er','shri','smt','capt','col'];
    const wordCount = trimmed.split(/\s+/).length;
    const digitCount = trimmed.replace(/\D/g,'').length;
    if (trimmed.length > 2 && trimmed.length < 40 && /^[A-Za-z\s.'\-]+$/.test(trimmed) && !trimmed.includes('@') && digitCount === 0 && (wordCount >= 2 || nameIndicators.some(ind => lower.startsWith(ind)))) {
      fields.push({ id: uid('name'), type: 'name', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase()); continue;
    }
    if (trimmed.length > 2 && trimmed.length < 60 && !/[^\w\s\-.,&@#\/]/.test(trimmed)) {
      fields.push({ id: uid('other'), type: 'other', value: trimmed, order: fields.length });
      seenValues.add(trimmed.toLowerCase());
    }
  }

  const seen = new Set<string>();
  return reClassifyFields(fields.filter(f => {
    const k = f.value.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }));
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

const buildFullAddress = (fields: FieldItem[]): string =>
  fields.filter(f => f.type === 'address').map(f => f.value.trim()).filter(v => v.length > 0).join(', ');

// ─────────────────────────────────────────────────────
// FIELD TYPE META
// ─────────────────────────────────────────────────────
const FieldTypeColors: Record<string, string> = {
  name: colors.amberDark, designation: colors.lead, company: colors.partner, subcompany: '#7c3aed',
  phone: colors.success, email: colors.startup, website: colors.enterprise,
  address: '#64748b', service: colors.vendor, pincode: colors.muted, other: '#888',
  gst: '#0891b2', partnership: '#16a34a', qrdetail: '#7c3aed',
};
const FieldTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  name: 'person-outline', designation: 'briefcase-outline', company: 'business-outline', subcompany: 'git-branch-outline',
  phone: 'call-outline', email: 'mail-outline', website: 'globe-outline',
  address: 'map-outline', service: 'construct-outline', pincode: 'location-outline', other: 'document-text-outline',
  gst: 'receipt-outline', partnership: 'handshake-outline', qrdetail: 'qr-code-outline',
};
const ALL_FIELD_TYPES = [
  'name','designation','company','subcompany','phone','email','website',
  'address','service','pincode','gst','partnership','qrdetail','other',
];
const fieldLabel = (type: string) => {
  if (type === 'subcompany') return 'Sub Company';
  if (type === 'qrdetail') return 'QR Detail';
  if (type === 'gst') return 'GST Number';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ─────────────────────────────────────────────────────
// TYPE PICKER MODAL
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
              const icon  = FieldTypeIcons[t] || 'ellipse-outline';
              const isSel = t === currentType;
              return (
                <TouchableOpacity key={t} style={[S.typeRow, isSel && { backgroundColor: color + '18' }]}
                  onPress={() => { onSelect(t); onClose(); }}>
                  <View style={[S.typeIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <Text style={[S.typeLabel, { color: isSel ? color : colors.text }]}>{fieldLabel(t)}</Text>
                  {isSel && <Ionicons name="checkmark-circle" size={18} color={color} />}
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
  const icon  = FieldTypeIcons[field.type] || 'ellipse-outline';

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
            autoCapitalize={field.type === 'gst' ? 'characters' : 'none'}
            multiline={field.type === 'address' || field.type === 'qrdetail'}
            numberOfLines={field.type === 'address' || field.type === 'qrdetail' ? 3 : 1}
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
        <Text style={[scanStyles.fieldType, { color }]}>{fieldLabel(field.type).toUpperCase()}</Text>
        <Text style={[scanStyles.fieldValue, { color: colors.text }]}
          numberOfLines={field.type === 'address' || field.type === 'qrdetail' ? 0 : 2}>
          {field.value}
        </Text>
      </View>
      <Ionicons name="copy-outline" size={14} color={colors.muted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────
// ADD FIELD ROW
// ─────────────────────────────────────────────────────
function AddFieldRow({ onAdd }: { onAdd: (type: string, value: string) => void }) {
  const [newType, setNewType]               = useState('name');
  const [newValue, setNewValue]             = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const color = FieldTypeColors[newType] || '#888';
  const icon  = FieldTypeIcons[newType] || 'ellipse-outline';
  const handleAdd = () => { if (!newValue.trim()) return; onAdd(newType, newValue.trim()); setNewValue(''); };
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
// CAMERA SCANNER
// Three bottom buttons: Cancel | Capture | Gallery
// Gallery on front phase picks front image
// Gallery on back phase picks back image (or skip)
// ─────────────────────────────────────────────────────
function CameraScanner({
  phase, onCapture, onClose, capturedFrontUri, onGalleryPick,
}: {
  phase: CameraPhase;
  onCapture: (uri: string) => void;
  onClose: () => void;
  capturedFrontUri: string | null;
  onGalleryPick: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing]       = useState(false);
  const [flashConfirm, setFlashConfirm] = useState(false);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.95, skipProcessing: false });
      if (photo?.uri) {
        const processed = await ImageManipulator.manipulateAsync(
          photo.uri, [{ resize: { width: 1400 } }],
          { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
        );
        setFlashConfirm(true);
        setTimeout(() => setFlashConfirm(false), 600);
        onCapture(processed.uri);
      }
    } catch { /* silent */ } finally { setCapturing(false); }
  };

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

  const isFront    = phase === 'front';
  const frameColor = isFront ? colors.amber : '#22d3ee';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={CameraStyles.overlayTop} />
      <View style={CameraStyles.overlayBottom} />
      <View style={CameraStyles.overlayLeft} />
      <View style={CameraStyles.overlayRight} />
      <View style={[CameraStyles.cardFrame, { borderColor: frameColor }]} />

      {flashConfirm && (
        <View style={CS.flashOverlay}>
          <View style={CS.flashCheck}>
            <Ionicons name="checkmark-circle" size={72} color="#fff" />
            <Text style={CS.flashText}>{isFront ? 'Front captured!' : 'Back captured!'}</Text>
          </View>
        </View>
      )}

      {/* Phase indicator bar */}
      <View style={CS.phaseBar}>
        {phase === 'back' && capturedFrontUri && (
          <Image source={{ uri: capturedFrontUri }} style={CS.frontThumb} contentFit="cover" />
        )}
        <View style={[CS.phaseBadge, { backgroundColor: frameColor }]}>
          <Ionicons name={isFront ? 'arrow-forward-circle' : 'arrow-back-circle'} size={15}
            color={isFront ? colors.navy : '#fff'} />
          <Text style={[CS.phaseText, { color: isFront ? colors.navy : '#fff' }]}>
            {isFront ? 'IMAGE 1 — FRONT' : 'IMAGE 2 — BACK'}
          </Text>
        </View>
        {phase === 'back' && (
          <View style={[CS.phaseBadge, { backgroundColor: '#16a34a', paddingHorizontal: 8 }]}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={[CS.phaseText, { color: '#fff', fontSize: 10 }]}>Front ✓</Text>
          </View>
        )}
      </View>

      <View style={CameraStyles.hint}>
        <Ionicons name="card-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
        <Text style={CameraStyles.hintText}>
          {isFront ? 'Align FRONT of card in frame' : 'Flip card — align BACK in frame'}
        </Text>
      </View>

      {/* ── Bottom controls: Cancel | Capture | Gallery (+ Skip on back) ── */}
      <View style={CS.controls}>
        {/* Cancel */}
        <TouchableOpacity style={CameraStyles.cancelBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color="#fff" />
          <Text style={CameraStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {/* Capture */}
        <TouchableOpacity
          style={[CameraStyles.captureBtn, { backgroundColor: frameColor, opacity: capturing ? 0.7 : 1 }]}
          onPress={handleCapture} disabled={capturing} activeOpacity={0.8}
        >
          {capturing
            ? <ActivityIndicator size="small" color={isFront ? colors.navy : '#fff'} />
            : <>
                <Ionicons name="camera" size={20} color={isFront ? colors.navy : '#fff'} />
                <Text style={[CameraStyles.captureText, { color: isFront ? colors.navy : '#fff' }]}>
                  {isFront ? 'Capture Front' : 'Capture Back'}
                </Text>
              </>
          }
        </TouchableOpacity>

        {/* Gallery */}
        <TouchableOpacity
          style={[CameraStyles.cancelBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={onGalleryPick}
        >
          <Ionicons name="images-outline" size={16} color="#fff" />
          <Text style={CameraStyles.cancelText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Skip back button — appears only on back phase, above controls */}
      {phase === 'back' && (
        <TouchableOpacity style={CS.skipBackBtn} onPress={() => onCapture('__skip__')}>
          <Ionicons name="play-skip-forward" size={14} color={colors.navy} />
          <Text style={CS.skipBackText}>Skip Back Side</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const CS = StyleSheet.create({
  phaseBar: {
    position: 'absolute', top: 52, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 20,
  },
  phaseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
  },
  phaseText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  frontThumb: { width: 48, height: 30, borderRadius: 5, borderWidth: 2, borderColor: colors.amber },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', zIndex: 99,
  },
  flashCheck: { alignItems: 'center', gap: 10 },
  flashText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  controls: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 16,
  },
  skipBackBtn: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.amber, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  skipBackText: { fontSize: 12, fontWeight: '700', color: colors.navy },
});

// ─────────────────────────────────────────────────────
// QR BANNER
// ─────────────────────────────────────────────────────
function QRDetailBanner({ qrText, extractedFields, onDismiss }: {
  qrText: string;
  extractedFields: Partial<Record<string, string>>;
  onDismiss: () => void;
}) {
  const hasFields = Object.values(extractedFields).some(v => v && v.length > 0);
  return (
    <View style={S.qrBanner}>
      <View style={S.qrBannerHeader}>
        <View style={S.qrBannerIcon}>
          <Ionicons name="qr-code" size={18} color="#7c3aed" />
        </View>
        <Text style={S.qrBannerTitle}>QR Code Detected & Decoded</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      <Text style={S.qrBannerContent} numberOfLines={5}>{qrText}</Text>
      {hasFields && (
        <View style={S.qrExtractedRow}>
          <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
          <Text style={S.qrExtractedText}>
            Auto-filled: {Object.entries(extractedFields).filter(([,v]) => v).map(([k]) => k).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  editRow: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6, borderWidth: 1.5,
    borderColor: colors.amber + '55', gap: 6, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, width: 82, flexShrink: 0,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2, flex: 1 },
  editInput: {
    flex: 1, fontSize: 13, color: colors.text, paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: '#f8fafc', borderRadius: 7, minHeight: 34,
  },
  delBtn: { width: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingTop: 6 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: colors.amber, gap: 6,
  },
  addInput: {
    flex: 1, fontSize: 13, color: colors.text, paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: '#f8fafc', borderRadius: 7, minHeight: 34,
  },
  addBtn: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  typePickerBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, paddingBottom: 40, maxHeight: '80%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  typePickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, gap: 12, marginBottom: 2 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.navy, gap: 6,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', minHeight: 38,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  reclassifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber + '15',
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10,
    borderWidth: 1, borderColor: colors.amber + '35',
  },
  reclassifyText: { fontSize: 11, color: colors.amberDark, flex: 1, lineHeight: 15 },
  stickyBar: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 2 },
  stickyCancel: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: '#fee2e2',
    borderWidth: 1, borderColor: '#fca5a5',
  },
  stickyCancelText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  stickySave: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: colors.amber,
  },
  stickySaveText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  dualImageWrap: { flexDirection: 'row', height: 160, backgroundColor: '#000', position: 'relative' },
  dualImageHalf: { flex: 1, position: 'relative', overflow: 'hidden' },
  dualImage: { width: '100%', height: '100%' },
  dualDivider: { width: 2, backgroundColor: colors.amber },
  imageSideLabel: {
    position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center',
    gap: 3, backgroundColor: colors.amber + 'cc', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3,
  },
  imageSideLabelText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  dualBadge: {
    position: 'absolute', top: 8, left: '50%', transform: [{ translateX: -44 }],
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.amber,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  dualBadgeText: { fontSize: 10, fontWeight: '700', color: colors.navy },
  dualInfoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber + '15',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: colors.amber + '40',
  },
  dualInfoText: { fontSize: 11, color: colors.amberDark, flex: 1, fontWeight: '600' },
  nextCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.navy, marginTop: 10,
  },
  nextCardBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  processingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.phoneBg },
  processingText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  processingStepWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  processingStep: { fontSize: 12, color: colors.muted },
  qrBanner: {
    backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#7c3aed33',
  },
  qrBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrBannerIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#7c3aed20',
    alignItems: 'center', justifyContent: 'center',
  },
  qrBannerTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#5b21b6' },
  qrBannerContent: { fontSize: 12, color: '#4c1d95', lineHeight: 18, marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  qrExtractedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qrExtractedText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  gstBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfeff',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#0891b233',
  },
  gstBannerText: { fontSize: 12, color: '#0e7490', fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  partnerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#16a34a33',
  },
  partnerBannerText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  galleryPreviewWrap: {
    flexDirection: 'row', gap: 10, marginBottom: 10, paddingHorizontal: 2,
  },
  galleryThumbWrap: {
    flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 2,
    borderColor: colors.amber, position: 'relative',
  },
  galleryThumb: { width: '100%', height: 80 },
  galleryThumbLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center',
  },
  galleryThumbLabelText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  fromGalleryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: '#3b82f633',
  },
  fromGalleryText: { fontSize: 11, color: '#1d4ed8', fontWeight: '600', flex: 1 },
});

// ─────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────
export default function ScanScreen() {
  const { cards, addCard, deleteCard, updateCard } = useCards();
  const { addContact, loading: savingContact }     = useContact();
  const { setMenuVisible }                         = useMenuVisibility();

  const [isProcessing,   setIsProcessing]   = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isSavingEdit,   setIsSavingEdit]   = useState(false);
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  const [editingCardId,  setEditingCardId]  = useState<string | null>(null);
  const [localFields,    setLocalFields]    = useState<FieldItem[]>([]);
  const [qrBannerData,   setQrBannerData]   = useState<{ cardId: string; qrText: string; extractedFields: Partial<Record<string, string>> } | null>(null);

  const [showCamera,      setShowCamera]      = useState(true);
  const [cameraPhase,     setCameraPhase]     = useState<CameraPhase>('front');
  const [pendingFrontUri, setPendingFrontUri] = useState<string | null>(null);

  // Track whether current card was from gallery
  const [fromGallery, setFromGallery] = useState(false);

  useEffect(() => { setMenuVisible(!showCamera); }, [showCamera, setMenuVisible]);

  useFocusEffect(
    useCallback(() => {
      setPendingFrontUri(null);
      setCameraPhase('front');
      setExpandedId(null);
      setEditingCardId(null);
      setLocalFields([]);
      setShowCamera(true);
      setQrBannerData(null);
      setFromGallery(false);
      return () => { setShowCamera(false); };
    }, [])
  );

  const resetAndOpenCamera = useCallback(() => {
    setPendingFrontUri(null);
    setCameraPhase('front');
    setExpandedId(null);
    setEditingCardId(null);
    setLocalFields([]);
    setQrBannerData(null);
    setFromGallery(false);
    setShowCamera(true);
  }, []);

  const openCameraForNextCard = useCallback(() => {
    setPendingFrontUri(null);
    setCameraPhase('front');
    setShowCamera(true);
  }, []);

  const closeCamera = useCallback(() => {
    setShowCamera(false);
    setPendingFrontUri(null);
    setCameraPhase('front');
  }, []);

  // ── Gallery picker ──
  // Called when user taps Gallery button in CameraScanner
  // Phase-aware: if front phase → picks front image, then moves to back phase
  //              if back phase  → picks back image, then processes
  const handleGalleryPick = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
        allowsMultipleSelection: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const pickedUri = result.assets[0].uri;

      // Resize for consistency
      const processed = await ImageManipulator.manipulateAsync(
        pickedUri, [{ resize: { width: 1400 } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );

      setFromGallery(true);

      if (cameraPhase === 'front') {
        // Front picked from gallery → now ask for back
        setPendingFrontUri(processed.uri);
        setCameraPhase('back');
      } else {
        // Back picked from gallery → process both
        const front = pendingFrontUri!;
        setPendingFrontUri(null);
        setCameraPhase('front');
        await buildAndStoreCard(front, processed.uri);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not open gallery.');
    }
  }, [cameraPhase, pendingFrontUri]);

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

  // ── Merge QR extracted fields into existing fields array ──
  const mergeQRFields = (fields: FieldItem[], extracted: Partial<Record<string, string>>, qrRaw: string): FieldItem[] => {
    const updated = [...fields];
    const existingValues = new Set(fields.map(f => f.value.toLowerCase().trim()));

    // Always add qrdetail field
    if (qrRaw && qrRaw.length > 0) {
      updated.push({ id: uid('qr'), type: 'qrdetail', value: qrRaw, order: updated.length });
    }

    const fieldMap: Record<string, string> = {
      name:'name', phone:'phone', email:'email', website:'website',
      company:'company', designation:'designation', address:'address', gst:'gst',
    };

    Object.entries(extracted).forEach(([key, val]) => {
      if (!val || val.length === 0) return;
      const type = fieldMap[key] || key;
      if (!existingValues.has(val.toLowerCase().trim())) {
        updated.push({ id: uid(`qr-${type}`), type, value: val, order: updated.length });
        existingValues.add(val.toLowerCase().trim());
      }
    });

    return updated;
  };

  const buildAndStoreCard = useCallback(async (frontUri: string, backUri?: string) => {
    setIsProcessing(true);
    setProcessingStep('Running OCR on image…');
    setShowCamera(false);
    try {
      const frontText = await runOCR(frontUri);
      const backText  = backUri ? await runOCR(backUri) : '';

      if (!frontText.trim() && !backText.trim()) {
        Alert.alert('No Text Detected', 'Could not read text. Try again with better lighting.', [
          { text: 'Retry', onPress: openCameraForNextCard },
          { text: 'Cancel', style: 'cancel' },
        ]);
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      let fields: FieldItem[];
      let fullText: string;

      if (backUri && backText.trim()) {
        const frontFields = extractAllFields(frontText);
        const backFields  = extractAllFields(backText);
        const seen = new Set(frontFields.map(f => f.value.toLowerCase().trim()));
        const merged = [...frontFields];
        backFields.forEach(f => {
          if (!seen.has(f.value.toLowerCase().trim())) { merged.push(f); seen.add(f.value.toLowerCase().trim()); }
        });
        merged.forEach((f, i) => { f.order = i; });
        fields   = merged;
        fullText = `${frontText}\n\n--- BACK ---\n\n${backText}`;
      } else {
        fields   = extractAllFields(frontText);
        fullText = frontText;
      }

      // Collapse all address fields into one
      const addrFields    = fields.filter(f => f.type === 'address');
      const nonAddrFields = fields.filter(f => f.type !== 'address');
      if (addrFields.length > 0) {
        const mergedAddrValue = addrFields.map(f => f.value.trim()).filter(v => v.length > 0).join(', ');
        fields = [{ id: uid('addr-merged'), type: 'address', value: mergedAddrValue, order: 0 }, ...nonAddrFields];
        fields.forEach((f, i) => { f.order = i; });
      }

      // ── QR Code detection via OCR text patterns ──
      // ML Kit OCR will sometimes decode QR code text if it's legible.
      // We scan the raw OCR output of both front and back for QR-like patterns.
      setProcessingStep('Scanning for QR code data…');
      let qrText: string | null = null;
      let qrExtracted: Partial<Record<string, string>> = {};

      // Try front OCR text first for embedded QR patterns
      qrText = await decodeQRFromOCRText(frontText);
      // If not found in front, try back OCR text
      if (!qrText && backText) {
        qrText = await decodeQRFromOCRText(backText);
      }

      if (qrText) {
        const parsed = parseQRDetail(qrText);
        qrExtracted  = parsed.extractedFields;
        fields = mergeQRFields(fields, qrExtracted, qrText);
        fields.forEach((f, i) => { f.order = i; });
      }

      const card: ExtendedScannedCard = {
        id: uid('card'),
        uri: frontUri,
        ...(backUri ? { backUri, hasBothSides: true } : {}),
        data: { fullText } as OCRData,
        fields, tags: [],
        createdAt: new Date().toISOString(),
        exported: false,
      };

      addCard(card);
      setExpandedId(card.id);
      setLocalFields((card.fields || []).map(f => ({ ...f })));
      setEditingCardId(card.id);

      if (qrText) {
        setQrBannerData({ cardId: card.id, qrText, extractedFields: qrExtracted });
      }
    } catch (e: any) {
      Alert.alert('Processing Failed', e.message ?? 'Unknown error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [addCard, openCameraForNextCard]);

  // Wrap handleGalleryPick to have access to buildAndStoreCard
  const handleGalleryPickFull = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
        allowsMultipleSelection: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const processed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri, [{ resize: { width: 1400 } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );

      setFromGallery(true);

      if (cameraPhase === 'front') {
        setPendingFrontUri(processed.uri);
        setCameraPhase('back');
      } else {
        const front = pendingFrontUri!;
        setPendingFrontUri(null);
        setCameraPhase('front');
        await buildAndStoreCard(front, processed.uri);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not open gallery.');
    }
  }, [cameraPhase, pendingFrontUri, buildAndStoreCard]);

  const handleCaptured = useCallback(async (uri: string) => {
    if (cameraPhase === 'front') {
      setPendingFrontUri(uri);
      setCameraPhase('back');
    } else {
      const front = pendingFrontUri!;
      const back  = uri === '__skip__' ? undefined : uri;
      setPendingFrontUri(null);
      setCameraPhase('front');
      await buildAndStoreCard(front, back);
    }
  }, [cameraPhase, pendingFrontUri, buildAndStoreCard]);

  const startEditing = useCallback((card: ExtendedScannedCard) => {
    setLocalFields((card.fields || []).map(f => ({ ...f })));
    setEditingCardId(card.id);
    setExpandedId(card.id);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCardId(null);
    setLocalFields([]);
  }, []);

  const showSaveAlert = useCallback((card: ExtendedScannedCard, fields: FieldItem[]) => {
    Alert.alert(
      'Contact Saved ✅',
      'What would you like to do next?',
      [
        { text: 'Send WhatsApp', onPress: () => { sendWhatsAppMessage(card, fields); resetAndOpenCamera(); } },
        { text: 'Next Card',    onPress: () => resetAndOpenCamera() },
        { text: 'View Contacts', onPress: () => { setShowCamera(false); router.replace('/(tabs)/contacts'); } },
      ]
    );
  }, [resetAndOpenCamera]);

  const saveEditing = useCallback(async (cardId: string) => {
    const card = (cards as ExtendedScannedCard[]).find(c => c.id === cardId);
    if (!card) return;
    const reordered = localFields.map((f, i) => ({ ...f, order: i }));
    updateCard(cardId, { ...card, fields: reordered } as unknown as ScannedCard);
    setIsSavingEdit(true);
    try {
      const get = (type: string, idx = 0) => reordered.filter(f => f.type === type)[idx]?.value || '';
      const fullAddress  = buildFullAddress(reordered);
      const qrCodeDetail = reordered.filter(f => f.type === 'qrdetail').map(f => f.value).join('\n---\n');
      const gstNumber    = get('gst');
      const partnership  = reordered.filter(f => f.type === 'partnership').map(f => f.value).join(', ');
      const frontImageAsString = await uriToBase64(card.uri);
      const backImageAsString  = card.hasBothSides && card.backUri ? await uriToBase64(card.backUri) : '';
      await addContact({
        companyName: get('company'), subCompanyName: get('subcompany'), branchName: '',
        personName: get('name'), designation: get('designation'),
        phoneNumber1: get('phone',0), phoneNumber2: get('phone',1), phoneNumber3: get('phone',2),
        email1: get('email',0), email2: get('email',1),
        address: fullAddress,
        servicesCsv: reordered.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1: get('website',0), website2: get('website',1),
        rawExtractedText: (card.data as any)?.fullText || '',
        frontImageAsString, frontImageMimeType: 'image/jpeg',
        backImageAsString,  backImageMimeType:  'image/jpeg',
        gstNumber, partnership, qrCodeDetail,
      });
      deleteCard(card.id);
      showSaveAlert(card, reordered);
    } catch (e: any) {
      Alert.alert('Save Failed', extractApiError(e));
    } finally {
      setIsSavingEdit(false);
      setEditingCardId(null);
      setLocalFields([]);
    }
  }, [cards, localFields, updateCard, addContact, deleteCard, showSaveAlert]);

  const handleSaveContact = async (card: ExtendedScannedCard) => {
    const fields = card.fields || [];
    const get = (type: string, idx = 0) => fields.filter(f => f.type === type)[idx]?.value || '';
    const fullAddress  = buildFullAddress(fields);
    const qrCodeDetail = fields.filter(f => f.type === 'qrdetail').map(f => f.value).join('\n---\n');
    const gstNumber    = get('gst');
    const partnership  = fields.filter(f => f.type === 'partnership').map(f => f.value).join(', ');
    try {
      const frontImageAsString = await uriToBase64(card.uri);
      const backImageAsString  = card.hasBothSides && card.backUri ? await uriToBase64(card.backUri) : '';
      await addContact({
        companyName: get('company'), subCompanyName: get('subcompany'), branchName: '',
        personName: get('name'), designation: get('designation'),
        phoneNumber1: get('phone',0), phoneNumber2: get('phone',1), phoneNumber3: get('phone',2),
        email1: get('email',0), email2: get('email',1),
        address: fullAddress,
        servicesCsv: fields.filter(f => f.type === 'service').map(f => f.value).join(', '),
        website1: get('website',0), website2: get('website',1),
        rawExtractedText: (card.data as any)?.fullText || '',
        frontImageAsString, frontImageMimeType: 'image/jpeg',
        backImageAsString,  backImageMimeType:  'image/jpeg',
        gstNumber, partnership, qrCodeDetail,
      });
      deleteCard(card.id);
      showSaveAlert(card, fields);
    } catch (e: any) {
      Alert.alert('Save Failed', extractApiError(e));
    }
  };

  const updateLocalField     = useCallback((id: string, value: string) => setLocalFields(p => p.map(f => f.id === id ? { ...f, value } : f)), []);
  const deleteLocalField     = useCallback((id: string) => setLocalFields(p => p.filter(f => f.id !== id)), []);
  const changeLocalFieldType = useCallback((id: string, newType: string) => setLocalFields(p => p.map(f => f.id === id ? { ...f, type: newType } : f)), []);
  const addLocalField        = useCallback((type: string, value: string) => setLocalFields(p => [...p, { id: uid(type), type, value, order: p.length }]), []);

  const handleSmartReclassify = useCallback(() => {
    const reclassified = reClassifyFields(localFields);
    const changedCount = reclassified.filter((f, i) => f.type !== localFields[i]?.type).length;
    setLocalFields(reclassified);
    const card = (cards as ExtendedScannedCard[]).find(c => c.id === editingCardId);
    Alert.alert(
      changedCount > 0 ? `Re-classified ✨ (${changedCount} fixed)` : 'All Good!',
      changedCount > 0 ? `${changedCount} field${changedCount > 1 ? 's were' : ' was'} auto-fixed.` : 'All field types look correct.',
      [
        { text: 'OK', style: 'cancel' },
        ...(card ? [{ text: 'Send WhatsApp', onPress: () => sendWhatsAppMessage(card, reclassified) }] : []),
      ]
    );
  }, [localFields, cards, editingCardId]);

  const copyAll = async (card: ExtendedScannedCard) => {
    const text = (card.fields || []).map(f => `${fieldLabel(f.type).toUpperCase()}: ${f.value}`).join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'All fields copied to clipboard');
  };

  const handleCopyField = async (value: string, type: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${fieldLabel(type)} copied`);
  };

  const renderCard = ({ item }: { item: ExtendedScannedCard }) => {
    const isExpanded     = expandedId === item.id;
    const isEditing      = editingCardId === item.id;
    const displayFields  = isEditing
      ? [...localFields].sort((a, b) => a.order - b.order)
      : (item.fields || []).sort((a, b) => a.order - b.order);
    const cardName = item.fields?.find(f => f.type === 'name')?.value || 'Business Card';

    const gstField          = displayFields.find(f => f.type === 'gst');
    const partnershipFields  = displayFields.filter(f => f.type === 'partnership');
    const qrFields           = displayFields.filter(f => f.type === 'qrdetail');

    return (
      <View style={[scanStyles.card, { backgroundColor: colors.white }]}>
        {item.hasBothSides && item.backUri ? (
          <View style={S.dualImageWrap}>
            <View style={S.dualImageHalf}>
              <Image source={{ uri: item.uri }} style={S.dualImage} contentFit="cover" />
              <View style={S.imageSideLabel}>
                <Ionicons name="arrow-forward-circle" size={12} color="#fff" />
                <Text style={S.imageSideLabelText}>FRONT</Text>
              </View>
            </View>
            <View style={S.dualDivider} />
            <View style={S.dualImageHalf}>
              <Image source={{ uri: item.backUri }} style={S.dualImage} contentFit="cover" />
              <View style={[S.imageSideLabel, { backgroundColor: colors.navy + 'cc' }]}>
                <Ionicons name="arrow-back-circle" size={12} color="#fff" />
                <Text style={S.imageSideLabelText}>BACK</Text>
              </View>
            </View>
            <View style={S.dualBadge}>
              <Ionicons name="swap-horizontal" size={11} color={colors.navy} />
              <Text style={S.dualBadgeText}>Front & Back</Text>
            </View>
          </View>
        ) : (
          <Image source={{ uri: item.uri }} style={scanStyles.cardImage} contentFit="cover" />
        )}

        <TouchableOpacity style={scanStyles.deleteBtn}
          onPress={() => Alert.alert('Delete Card', 'Remove this card?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { if (editingCardId === item.id) cancelEditing(); deleteCard(item.id); } },
          ])}>
          <Ionicons name="trash-outline" size={16} color={colors.white} />
        </TouchableOpacity>

        <View style={S.actionBar}>
          <TouchableOpacity style={S.actionBtn} onPress={() => copyAll(item)}>
            <Ionicons name="copy-outline" size={13} color="#fff" />
            <Text style={S.actionBtnText}>Copy All</Text>
          </TouchableOpacity>

          {isEditing ? (
            <>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#ef4444cc' }]} onPress={cancelEditing} disabled={isSavingEdit}>
                <Ionicons name="close" size={13} color="#fff" />
                <Text style={S.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber, flex: 1.5 }]} onPress={() => saveEditing(item.id)} disabled={isSavingEdit}>
                {isSavingEdit
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <><Ionicons name="checkmark" size={13} color={colors.navy} /><Text style={[S.actionBtnText, { color: colors.navy }]}>Save</Text></>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]} onPress={openCameraForNextCard}>
                <Ionicons name="scan-outline" size={13} color="#fff" />
                <Text style={S.actionBtnText}>Next Card</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.amber }]} onPress={() => startEditing(item)}>
                <Ionicons name="create-outline" size={13} color={colors.navy} />
                <Text style={[S.actionBtnText, { color: colors.navy }]}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

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
              {displayFields.length} fields
              {gstField ? ' · 🧾 GST' : ''}
              {qrFields.length > 0 ? ' · 📷 QR' : ''}
              {partnershipFields.length > 0 ? ' · 🤝' : ''}
              {isEditing ? ' · ✏️ editing' : ''}
            </Text>
          </View>
          {!isEditing && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />}
        </TouchableOpacity>

        {isExpanded && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
            <View style={[scanStyles.details, { paddingBottom: isEditing ? 8 : 16 }]}>

              {item.hasBothSides && (
                <View style={S.dualInfoBanner}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.amber} />
                  <Text style={S.dualInfoText}>Fields merged from front & back sides</Text>
                </View>
              )}

              {/* From Gallery banner */}
              {fromGallery && expandedId === item.id && (
                <View style={S.fromGalleryBanner}>
                  <Ionicons name="images-outline" size={14} color="#3b82f6" />
                  <Text style={S.fromGalleryText}>Imported from gallery</Text>
                </View>
              )}

              {/* QR banner */}
              {qrBannerData && qrBannerData.cardId === item.id && (
                <QRDetailBanner
                  qrText={qrBannerData.qrText}
                  extractedFields={qrBannerData.extractedFields}
                  onDismiss={() => setQrBannerData(null)}
                />
              )}

              {/* GST highlight */}
              {!isEditing && gstField && (
                <View style={S.gstBanner}>
                  <Ionicons name="receipt-outline" size={14} color="#0891b2" />
                  <Text style={S.gstBannerText}>GST: {gstField.value}</Text>
                  <TouchableOpacity onPress={() => handleCopyField(gstField.value, 'gst')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="copy-outline" size={13} color="#0891b2" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Partnership highlight */}
              {!isEditing && partnershipFields.length > 0 && (
                <View style={S.partnerBanner}>
                  <Ionicons name="handshake-outline" size={14} color="#16a34a" />
                  <Text style={S.partnerBannerText} numberOfLines={2}>
                    {partnershipFields.map(f => f.value).join(' • ')}
                  </Text>
                </View>
              )}

              {isEditing && (
                <TouchableOpacity style={S.reclassifyBanner} onPress={handleSmartReclassify}>
                  <Ionicons name="sparkles" size={15} color={colors.amberDark} />
                  <Text style={S.reclassifyText}>Auto-fix field types — detects swapped name/designation etc.</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.amber} />
                </TouchableOpacity>
              )}

              {displayFields.map(field => (
                <InlineFieldRow key={field.id} field={field} isEditMode={isEditing}
                  onUpdate={updateLocalField} onDelete={deleteLocalField}
                  onChangeType={changeLocalFieldType} onCopy={handleCopyField} />
              ))}

              {isEditing && <AddFieldRow onAdd={addLocalField} />}

              {isEditing && (
                <View style={S.stickyBar}>
                  <TouchableOpacity style={S.stickyCancel} onPress={cancelEditing} disabled={isSavingEdit}>
                    <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                    <Text style={S.stickyCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.stickySave} onPress={() => saveEditing(item.id)} disabled={isSavingEdit}>
                    {isSavingEdit
                      ? <ActivityIndicator size="small" color={colors.navy} />
                      : <><Ionicons name="checkmark-circle-outline" size={16} color={colors.navy} /><Text style={S.stickySaveText}>Save & Sync Contact</Text></>}
                  </TouchableOpacity>
                </View>
              )}

              {!isEditing && (
                <>
                  <TouchableOpacity style={S.nextCardBtn} onPress={openCameraForNextCard}>
                    <Ionicons name="camera-outline" size={17} color="#fff" />
                    <Text style={S.nextCardBtnText}>Scan Next Card</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[scanStyles.rawButton, { backgroundColor: colors.amber + '15', borderColor: colors.amber, marginTop: 8 }]}
                    onPress={() => handleSaveContact(item)} disabled={savingContact}>
                    {savingContact
                      ? <ActivityIndicator size="small" color={colors.amber} />
                      : <><Ionicons name="person-add-outline" size={14} color={colors.amberDark} /><Text style={[scanStyles.rawButtonText, { color: colors.amberDark }]}>Save as Contact</Text></>}
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
    return (
      <CameraScanner
        phase={cameraPhase}
        onCapture={handleCaptured}
        onClose={closeCamera}
        capturedFrontUri={pendingFrontUri}
        onGalleryPick={handleGalleryPickFull}
      />
    );
  }

  if (isProcessing) {
    return (
      <View style={S.processingWrap}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={S.processingText}>Reading card…</Text>
        <View style={S.processingStepWrap}>
          <Ionicons name="sync-outline" size={14} color={colors.muted} />
          <Text style={S.processingStep}>{processingStep || 'Extracting text with ML Kit OCR'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[scanStyles.container, { backgroundColor: colors.phoneBg }]}>
      <View style={[scanStyles.header, { backgroundColor: colors.navy }]}>
        <View style={scanStyles.headerGlow} />
        <View>
          <Text style={scanStyles.greetText}>SCAN BUSINESS CARDS</Text>
          <Text style={scanStyles.titleText}>Card <Text style={scanStyles.titleSpan}>Scanner</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[scanStyles.badge, { backgroundColor: colors.amber + '20' }]}>
            <Ionicons name="scan-outline" size={16} color={colors.amber} />
            <Text style={[scanStyles.badgeText, { color: colors.amber }]}>ML Kit</Text>
          </View>
          <TouchableOpacity style={{ backgroundColor: colors.amber, borderRadius: 8, padding: 8 }} onPress={openCameraForNextCard}>
            <Ionicons name="camera" size={18} color={colors.navy} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={cards as ExtendedScannedCard[]}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={scanStyles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={(
          <View style={scanStyles.emptyContainer}>
            <View style={[scanStyles.emptyIcon, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="scan-outline" size={48} color={colors.amberDark} />
            </View>
            <Text style={[scanStyles.emptyTitle, { color: colors.text }]}>Ready to scan</Text>
            <Text style={[scanStyles.emptyText, { color: colors.muted }]}>Tap below to open camera</Text>
            <TouchableOpacity style={[S.nextCardBtn, { marginTop: 24, paddingHorizontal: 32 }]} onPress={openCameraForNextCard}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={S.nextCardBtnText}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}