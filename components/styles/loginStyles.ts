import { Platform, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

// Breakpoints
const isWeb = Platform.OS === 'web';
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;
const isLargeScreen = isTablet || isDesktop;

// Responsive helpers
const getCardWidth = () => {
  if (isDesktop) return 480;
  if (isTablet) return 520;
  return undefined; // full width on mobile
};

const getCardMarginHorizontal = () => {
  if (isDesktop) return 'auto' as any;
  if (isTablet) return 'auto' as any;
  return 16;
};

const getHeroPaddingHorizontal = () => {
  if (isDesktop) return 80;
  if (isTablet) return 60;
  return 28;
};

const getHeroFontSize = () => {
  if (isDesktop) return 36;
  if (isTablet) return 32;
  return 28;
};

const getContainerMaxWidth = () => {
  if (isDesktop) return 1100;
  if (isTablet) return 768;
  return undefined;
};

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isLargeScreen ? colors.navy : colors.phoneBg,
  },

  scrollView: {
    flex: 1,
  },

  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },

  // ── Web/Tablet: center the content column ──────────────────────────────────
  innerWrapper: isLargeScreen
    ? {
        flex: 1,
        alignSelf: 'center',
        width: '100%' as any,
        maxWidth: getContainerMaxWidth(),
      }
    : { flex: 1 },

  // ── Web two-column layout wrapper ─────────────────────────────────────────
  twoColumnLayout: isDesktop
    ? {
        flex: 1,
        flexDirection: 'row' as any,
        minHeight: height,
      }
    : {},

  // Left panel (hero) on desktop
  leftPanel: isDesktop
    ? {
        flex: 1,
        backgroundColor: colors.navy,
        justifyContent: 'center' as any,
        paddingHorizontal: 60,
        paddingVertical: 60,
      }
    : {},

  // Right panel (form) on desktop
  rightPanel: isDesktop
    ? {
        width: 580,
        backgroundColor: colors.phoneBg,
        justifyContent: 'center' as any,
        paddingHorizontal: 40,
        paddingVertical: 60,
      }
    : {},

  // ── Toast ──────────────────────────────────────────────────────────────────
toast: {
  position: 'absolute',
  top: 54,

  // ✅ FIX
  left: '50%',
  transform: [{ translateX: -150 }], 

  backgroundColor: colors.toastBg,
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 20,
  flexDirection: 'row',
  alignItems: 'center',
  zIndex: 999,

  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 5,

  maxWidth: 300, // important for centering
},

  toastText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 7,
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: getHeroPaddingHorizontal(),
    paddingTop: isDesktop ? 0 : 20,
    paddingBottom: isDesktop ? 0 : 48,
   marginTop: isDesktop ? 0 : isTablet ? -0 : -40,
    position: 'relative',
  },

  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: isDesktop ? 360 : 260,
    height: isDesktop ? 360 : 260,
    borderRadius: isDesktop ? 180 : 130,
    backgroundColor: 'rgba(245,159,10,0.22)',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isDesktop ? 32 : 20,
  },

  brandIcon: {
    width: isDesktop ? 50 : 42,
    height: isDesktop ? 50 : 42,
    backgroundColor: colors.amber ,
    borderRadius: isDesktop ? 16 : 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: colors.amber,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  brandName: {
    color: colors.white,
    marginTop:17,
    fontSize: isDesktop ? 22 : 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  brandTag: {
    color: colors.amber,
    fontSize: isDesktop ? 11 : 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  heroTitle: {
    color: colors.white,
    fontSize: getHeroFontSize(),
    fontWeight: '800',
    lineHeight: getHeroFontSize() * 1.22,
    marginBottom: isDesktop ? 12 : 8,
  },

  heroSpan: {
    color: colors.amber,
  },

  heroSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: isDesktop ? 15 : 13,
    fontWeight: '500',
    marginBottom: isDesktop ? 0 : 28,
  },

  // Tabs only visible on mobile/tablet hero (not shown on desktop left panel)
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 4,
    marginTop: isTablet ? 32 : 0,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: colors.amber,
    shadowColor: colors.amber,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  tabText: {
    fontSize: isDesktop ? 14 : 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
  },

  activeTabText: {
    color: colors.navy,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    marginHorizontal: isDesktop ? 0 : isTablet ? 40 : 16,
    marginTop: isDesktop ? 0 : -20,
    borderRadius: isDesktop ? 20 : 24,
    padding: isDesktop ? 32 : 22,
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
    // Center card on tablet
    ...(isTablet && {
      alignSelf: 'center' as any,
      width: getCardWidth(),
    }),
  },

  // ── Form Elements ──────────────────────────────────────────────────────────
  inputGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: isDesktop ? 12 : 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    // Hover effect supported on web
    ...(isWeb && {
      cursor: 'text' as any,
      transition: 'border-color 0.2s ease' as any,
    }),
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    paddingVertical: isDesktop ? 14 : 13,
    fontSize: isDesktop ? 15 : 14,
    color: colors.text,
    fontWeight: '500',
    ...(isWeb && {
      outlineStyle: 'none' as any,
    }),
  },

  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 5,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb && { cursor: 'pointer' as any }),
  },

  checked: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },

  rememberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },

  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.amberDark,
    ...(isWeb && { cursor: 'pointer' as any }),
  },

  btn: {
    backgroundColor: colors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isDesktop ? 16 : 15,
    borderRadius: 14,
    gap: 8,
    marginBottom: 14,
    shadowColor: colors.amber,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    ...(isWeb && {
      cursor: 'pointer' as any,
      transition: 'opacity 0.15s ease, transform 0.15s ease' as any,
    }),
  },

  btnText: {
    fontSize: isDesktop ? 16 : 15,
    fontWeight: '800',
    color: colors.navy,
  },

  switchLink: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
    ...(isWeb && { cursor: 'pointer' as any }),
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  strengthRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },

  strengthBar: {
    height: 3,
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 4,
  },

  strengthActive: {
    backgroundColor: colors.amber,
  },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    ...(isWeb && { cursor: 'pointer' as any }),
  },

  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },

  forgotIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.amberLight,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },

  forgotTitle: {
    fontSize: isDesktop ? 20 : 17,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 6,
  },

  forgotSub: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },

  bottomInfo: {
    padding: 20,
    paddingHorizontal: isDesktop ? 32 : 24,
  },

  bottomText: {
    fontSize: 10,
    color: isLargeScreen ? 'rgba(163, 163, 163, 0.57)' : colors.muted,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },

  bottomLink: {
    color: isLargeScreen ? colors.amber : colors.amberDark,
    fontWeight: '600',
  },
});