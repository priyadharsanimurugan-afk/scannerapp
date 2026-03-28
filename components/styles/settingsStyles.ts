import { Dimensions, Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';


const { width, height } = Dimensions.get('window');

const isWeb = Platform.OS === 'web';
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;
const isLargeScreen = isTablet || isDesktop;
export const settingsStyles = StyleSheet.create({
  // ─── Root container ────────────────────────────────────────────────────────
  container: {
    flex:            1,
    backgroundColor: colors.navy,
  },
  // On desktop the container sits inside the sidebar layout's white main area
  containerDesktop: {
    backgroundColor: colors.phoneBg,
  },

  body: {
    flex: 1,
  },
// Add to your settingsStyles object
inputError: {
  borderColor: '#EF4444',
  borderWidth: 1,
},
errorText: {
  color: '#EF4444',
  fontSize: 12,
  marginTop: 4,
  marginLeft: 4,
},
  // ─── Scroll content padding ────────────────────────────────────────────────
  scrollContent: {
    paddingBottom:   20,
    backgroundColor: colors.phoneBg,
  },
  // Desktop: add horizontal padding so content doesn't stretch edge-to-edge
  scrollContentDesktop: {
    paddingHorizontal: 0,   // hero + cards handle their own margins
  },
  // Tablet: constrain width and centre
  scrollContentTablet: {
    width:     '100%',
    maxWidth:  980,
    alignSelf: 'center',
  },

  // ─── Profile Hero ──────────────────────────────────────────────────────────
  profileHero: {
    backgroundColor: colors.navy,
    position:        'relative',
    overflow:        'hidden',
    paddingBottom:   28,
  },
  heroGlow: {
    position:        'absolute',
    top:             -40,
    right:           -40,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: colors.amber,
    opacity:         0.18,
  },
  heroTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 24,
    paddingTop:     20,
    paddingBottom:  18,
  },
  heroTitle: {
    color:      colors.white,
    fontSize:   22,
    fontWeight: '800',
  },
  heroEdit: {
    width:          36,
    height:         36,
    backgroundColor: 'rgba(245,159,10,0.18)',
    borderRadius:   11,
    justifyContent: 'center',
    alignItems:     'center',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           16,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width:          68,
    height:         68,
    backgroundColor: colors.amber,
    borderRadius:   34,
    justifyContent: 'center',
    alignItems:     'center',
    borderWidth:    3,
    borderColor:    'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontSize:   24,
    fontWeight: '800',
    color:      colors.navy,
  },
  avatarEdit: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           22,
    height:          22,
    backgroundColor: colors.amber,
    borderRadius:    11,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     2,
    borderColor:     colors.navy,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    color:      colors.white,
    fontSize:   18,
    fontWeight: '800',
  },
  heroEmail: {
    color:     'rgba(255,255,255,0.6)',
    fontSize:  12,
    marginTop: 3,
  },
  heroBadges: {
    flexDirection: 'row',
    gap:           6,
    marginTop:     8,
    flexWrap:      'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius:  20,
  },
  badgeAmber: {
    backgroundColor: colors.amber,
  },
  badgeGreen: {
    backgroundColor: colors.partnerBg,
  },
  badgeTextAmber: {
    color:      colors.navy,
    fontSize:   10,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color:      colors.partner,
    fontSize:   10,
    fontWeight: '700',
  },

  // ─── Mini Stats ────────────────────────────────────────────────────────────
 miniStats: {
   width: isDesktop ?'100%' : 'auto', // ✅ FORCE full width always
  maxWidth: isDesktop ? 1200 : '100%',

  alignSelf: isDesktop ? 'center' : 'auto', // ✅ DON'T use stretch
 

  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',

  marginHorizontal: 16,
  marginVertical: 16,

  borderRadius: 16,
  overflow: 'hidden',
  marginTop:isDesktop ? 30 : 10,
  shadowColor: colors.text,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
},

  miniStat: {
    flex:            1,
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems:      'center',
  },
  // applied to 2nd and 3rd stat cells
  miniStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statValue: {
    fontSize:   20,
    fontWeight: '800',
    color:      colors.text,
  },
  statLabel: {
    fontSize:   10,
    color:      colors.muted,
    fontWeight: '500',
    marginTop:  2,
  },

  // ─── Section Label ─────────────────────────────────────────────────────────
sectionLabel: {
  width: isDesktop ?'100%' : 'auto',
  maxWidth: isDesktop ? 1200 : '100%', // ✅ SAME as card
  alignSelf: isDesktop ? 'center' : 'auto', // ✅ center like card

  fontSize: 11,
  fontWeight: '800',
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,

  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 6,
},

  // ─── Form Card ─────────────────────────────────────────────────────────────
  formCard: {
    width: isDesktop ?'100%' : 'auto',// ✅ FORCE full width always
  maxWidth: isDesktop ? 1200 : '100%',

  alignSelf: isDesktop ? 'center' : 'auto', // ✅ DON'T use stretch
    backgroundColor: colors.white,
    borderRadius:    18,
    marginHorizontal: 16,
    marginBottom:    14,
    shadowColor:     colors.text,
    shadowOpacity:   0.08,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  // On desktop the row layout is handled in the screen component via formRow
  formCardDesktop: {
    marginHorizontal: 16,
  },
  formInner: {
    padding: 18,
  },
  // Side-by-side row used on desktop
  formRow: {
    flexDirection: 'row',
    gap:           12,
    marginBottom:  0,
  },
  formGroup: {
    flex:         1,
    marginBottom: 14,
  },
  formLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  5,
  },
  formInput: {
    width:           '100%',
    backgroundColor: colors.bg,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    11,
    padding:         12,
    fontSize:        13,
    color:           colors.text,
    fontWeight:      '600',
  },
  saveButton: {
    backgroundColor: colors.amber,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             7,
    paddingVertical: 14,
    borderRadius:    13,
    shadowColor:     colors.amber,
    shadowOpacity:   0.32,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 5 },
    elevation:       8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize:   14,
    fontWeight: '800',
    color:      colors.navy,
  },

  // ─── Subscription Card ─────────────────────────────────────────────────────
  subCard: {
       width: isDesktop ?'100%' : 'auto', // ✅ FORCE full width always
  maxWidth: isDesktop ? 1200 : '100%',

  alignSelf: isDesktop ? 'center' : 'auto', // ✅ DON'T use stretch
    backgroundColor: colors.white,
    borderRadius:    18,
    marginHorizontal: 16,
    marginBottom:    14,
    padding:         18,
    shadowColor:     colors.text,
    shadowOpacity:   0.08,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  subCardDesktop: {
    marginHorizontal: 16,
  },
  subTop: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginBottom:  14,
  },
  subIcon: {
    width:          42,
    height:         42,
    backgroundColor: colors.amberLight,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
  },
  subTitle: {
    fontSize:   15,
    fontWeight: '800',
    color:      colors.text,
  },
  subSubtitle: {
    fontSize:   11,
    color:      colors.muted,
    fontWeight: '500',
    marginTop:  1,
  },
  progressLabels: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   7,
  },
  progressLabelStrong: {
    color:      colors.text,
    fontWeight: '800',
    fontSize:   11,
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius:    20,
    height:          7,
    overflow:        'hidden',
    marginBottom:    14,
  },
  progressFill: {
    height:          '100%',
    backgroundColor: colors.amber,
    borderRadius:    20,
  },
  upgradeButton: {
    backgroundColor: colors.navy,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 13,
    borderRadius:    13,
  },
  upgradeButtonText: {
    fontSize:   13,
    fontWeight: '800',
    color:      colors.amber,
  },

  // ─── Menu Card ─────────────────────────────────────────────────────────────
menuCard: {
  width: isDesktop ?'100%' : 'auto',// ✅ FORCE full width always
  maxWidth: isDesktop ? 1200 : '100%',

  alignSelf: isDesktop ? 'center' : 'auto', // ✅ DON'T use stretch

  backgroundColor: colors.white,
  borderRadius: 18,
  marginHorizontal: isDesktop ? 0 : 16, // ✅ important
  marginBottom: 14,

  shadowColor: colors.text,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,

  overflow: 'hidden',
},

  menuItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    padding:         15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width:          38,
    height:         38,
    borderRadius:   11,
    justifyContent: 'center',
    alignItems:     'center',
  },
  menuIconAmber: {
    backgroundColor: colors.amberLight,
  },
  menuIconRed: {
    backgroundColor: colors.redBg,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize:   14,
    fontWeight: '700',
    color:      colors.text,
  },
  menuLabelRed: {
    color: colors.red,
  },
  menuSub: {
    fontSize:   11,
    color:      colors.muted,
    fontWeight: '500',
    marginTop:  1,
  },
  chevron: {
    color:    colors.textLight,
    fontSize: 12,
  },

  // ─── Version Footer ────────────────────────────────────────────────────────
  versionFooter: {
    textAlign:     'center',
    paddingVertical: 8,
    paddingBottom: 14,
    fontSize:      10,
    color:         colors.textLight,
  },

  // ─── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position:        'absolute',
    top:             60,
    alignSelf:       'center',
    backgroundColor: colors.toastBg,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             7,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius:    20,
    zIndex:          999,
    shadowColor:     colors.text,
    shadowOpacity:   0.2,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       5,
  },
  toastText: {
    color:      colors.white,
    fontSize:   12,
    fontWeight: '700',
  },

  // ─── Toggle (kept for completeness) ────────────────────────────────────────
  toggle: {
    width:           42,
    height:          24,
    backgroundColor: colors.amber,
    borderRadius:    20,
    position:        'relative',
  },
  toggleDot: {
    width:        18,
    height:       18,
    backgroundColor: colors.white,
    borderRadius: 9,
    position:     'absolute',
    top:          3,
    right:        3,
    shadowColor:  colors.text,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation:    2,
  },

  overlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20, // ✅ spacing on mobile
},

modalCard: {
  width: '100%',
  maxWidth: 360, // ✅ perfect mobile width
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 20,

  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 5 },
  elevation: 10,
},

modalTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: colors.text,
  textAlign: 'center',
},

modalText: {
  fontSize: 14,
  color: colors.muted,
  textAlign: 'center',
  marginTop: 8,
  marginBottom: 20,
},

modalActions: {
  flexDirection: 'row',
  gap: 10,
},

cancelBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: '#F3F4F6',
  alignItems: 'center',
},

cancelText: {
  fontWeight: '700',
  color: '#374151',
},

logoutBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: colors.red,
  alignItems: 'center',
},

logoutText: {
  color: '#fff',
  fontWeight: '700',
},

});