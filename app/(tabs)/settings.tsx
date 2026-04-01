import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { settingsStyles } from '@/components/styles/settingsStyles';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { useDashboard, usePaymentUrl } from '@/hooks/useDashboard';
import { router } from 'expo-router';
import { deleteTokens, getRoles } from '@/utils/tokenStorage';
import { SidebarLayout } from '../sidebar';
import QRCode from "react-native-qrcode-svg";
import { useMyPremiumRequests, usePremiumRequest } from '@/hooks/usePremiumReq';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;

  const [toast, setToast] = useState({ show: false, msg: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { profile, loading: profileLoading, editProfile, fetchProfile } = useProfile();
  const { paymentUrl, loading, error, fetchPaymentUrl } = usePaymentUrl();
  const { summary } = useDashboard();

  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [originalData, setOriginalData] = useState({ userName: '', phoneNumber: '' });

  const [paymentRef, setPaymentRef] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const { submitRequest, loading: submitLoading } = usePremiumRequest();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const { data: myRequests, loading: reqLoading, fetchRequests } = useMyPremiumRequests();

  const scrollViewRef = useRef<ScrollView>(null);

  // ── Sync profile into local state ──
  useEffect(() => {
    if (profile) {
      if (profile.userName) setUserName(profile.userName);
      if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
      if (profile.email) setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    const checkRole = async () => {
      const r = await getRoles();
      if (r?.includes('Admin')) setIsAdmin(true);
    };
    checkRole();
  }, []);

  useEffect(() => {
    const loadRoles = async () => {
      const storedRoles = await getRoles();
      setRoles(storedRoles);
    };
    loadRoles();
  }, []);

  // ── Helpers ──
  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2500);
  };

  const getInitials = () => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const extractErrorsWithField = (error: any): Record<string, string[]> => {
    const data = error?.response?.data;
    const errorsMap: Record<string, string[]> = {};
    if (!data) {
      errorsMap['general'] = [error?.message || 'Something went wrong'];
      return errorsMap;
    }
    if (data.errors) {
      for (const [key, value] of Object.entries(data.errors)) {
        const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
        if (Array.isArray(value)) {
          errorsMap[normalizedKey] = value as string[];
        } else if (typeof value === 'string') {
          errorsMap[normalizedKey] = [value];
        }
      }
    }
    return errorsMap;
  };

  // ── Handlers ──
  const handleEditPress = () => {
    if (!isEditing) {
      setOriginalData({ userName, phoneNumber });
      setFieldErrors({});
    }
    setIsEditing(prev => !prev);
  };

  const handleCancel = () => {
    setUserName(originalData.userName);
    setPhoneNumber(originalData.phoneNumber);
    setIsEditing(false);
    setFieldErrors({});
  };

  const handleSave = async () => {
    try {
      setFieldErrors({});
      await editProfile(userName, phoneNumber);
      showToast('Profile saved successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      const errors = extractErrorsWithField(error);
      setFieldErrors(errors);
      if (errors.general) {
        showToast(errors.general[0]);
      } else {
        showToast('Please fix the validation errors below');
      }
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const [showQR, setShowQR] = useState(false);

  const handleUpgrade = async () => {
    try {
      await fetchPaymentUrl();
      setShowQR(true);
    } catch (err) {
      console.log("Payment failed");
    }
  };

  const resetPaymentForm = () => {
    setPaymentRef("");
    setMessage("");
    setContact("");
    setFieldError(null);
  };

  // ── Derived values ──
  const isPremium = profile?.accountType === 'Premium';

  const usagePercent =
    profile?.remainingScans && summary?.totalScansUsed
      ? Math.round(
          (summary.totalScansUsed /
            (summary.totalScansUsed + profile.remainingScans)) * 100,
        )
      : 0;

  const usageWidth =
    profile?.remainingScans && summary?.totalScansUsed
      ? `${Math.min(
          (summary.totalScansUsed /
            (summary.totalScansUsed + profile.remainingScans)) * 100,
          100,
        )}%`
      : '0%';

  // ── Form fields ──
  const formFields = (
    <>
      {/* Username */}
      <View style={settingsStyles.formGroup}>
        <Text style={settingsStyles.formLabel}>Username</Text>
        <TextInput
          style={[
            settingsStyles.formInput,
            { color: colors.muted },
            fieldErrors.userName && settingsStyles.inputError,
          ]}
          value={userName}
          onChangeText={setUserName}
          placeholder="Enter username"
          placeholderTextColor={colors.muted}
          editable={false}
        />
        {fieldErrors.userName && (
          <Text style={settingsStyles.errorText}>{fieldErrors.userName[0]}</Text>
        )}
      </View>

      {/* Phone Number */}
      <View style={settingsStyles.formGroup}>
        <Text style={settingsStyles.formLabel}>Phone Number</Text>
        <TextInput
          style={[
            settingsStyles.formInput,
            fieldErrors.phoneNumber && settingsStyles.inputError,
          ]}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          editable={isEditing}
          maxLength={10}
        />
        {fieldErrors.phoneNumber && (
          <Text style={settingsStyles.errorText}>
            {fieldErrors.phoneNumber[0]}
          </Text>
        )}
      </View>
    </>
  );

  // ── Content ──
  const content = (
    <View style={{ flex: 1 }} onTouchStart={Keyboard.dismiss}>
      <View
        style={[
          settingsStyles.container,
          isDesktop && settingsStyles.containerDesktop,
          { flex: 1 },
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

        {/* Toast */}
        {toast.show && (
          <View style={settingsStyles.toast}>
            <Icon name="checkmark-circle" size={18} color={colors.white} />
            <Text style={settingsStyles.toastText}>{toast.msg}</Text>
          </View>
        )}

        {/* ── FIXED HEADER — outside ScrollView so it never scrolls ── */}
        <View style={{ zIndex: 10 }}>
          <View style={settingsStyles.profileHero}>
            <View style={settingsStyles.heroGlow} />

            <View style={settingsStyles.heroTop}>
              <Text style={settingsStyles.heroTitle}>Settings</Text>
              <TouchableOpacity style={settingsStyles.heroEdit} onPress={handleEditPress}>
                <Icon
                  name={isEditing ? 'close-outline' : 'pencil-outline'}
                  size={14}
                  color={colors.amber}
                />
              </TouchableOpacity>
            </View>

            <View style={settingsStyles.heroBody}>
              <View style={settingsStyles.avatarWrap}>
                <View style={settingsStyles.avatar}>
                  <Text style={settingsStyles.avatarText}>{getInitials()}</Text>
                </View>
           
              </View>

              <View style={settingsStyles.heroInfo}>
                <Text style={settingsStyles.heroName}>{userName || 'User'}</Text>
                <Text style={settingsStyles.heroEmail}>{email}</Text>
                <View style={settingsStyles.heroBadges}>
                  <View style={[settingsStyles.badge, settingsStyles.badgeAmber]}>
                    <Icon name="star" size={9} color={colors.navy} />
                    <Text style={settingsStyles.badgeTextAmber}>
                      {profile?.accountType || 'Free'} Plan
                    </Text>
                  </View>
                  <View style={[settingsStyles.badge, settingsStyles.badgeGreen]}>
                    <Icon name="ellipse" size={7} color={colors.partner} />
                    <Text style={settingsStyles.badgeTextGreen}>Active</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── SCROLLABLE CONTENT — starts from Mini Stats downward ── */}
        <ScrollView
          ref={scrollViewRef}
          style={[settingsStyles.body, { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            settingsStyles.scrollContent,
            isDesktop && settingsStyles.scrollContentDesktop,
            isTablet && settingsStyles.scrollContentTablet,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mini Stats ── */}
          <View style={settingsStyles.miniStats}>
            <View style={settingsStyles.miniStat}>
              <Text style={settingsStyles.statValue}>{summary?.totalContactsCount ?? 0}</Text>
              <Text style={settingsStyles.statLabel}>Contacts</Text>
            </View>
            <View style={[settingsStyles.miniStat, settingsStyles.miniStatBorder]}>
              <Text style={settingsStyles.statValue}>{summary?.totalScansUsed ?? 0}</Text>
              <Text style={settingsStyles.statLabel}>Scanned</Text>
            </View>
            <View style={[settingsStyles.miniStat, settingsStyles.miniStatBorder]}>
              <Text style={settingsStyles.statValue}>{summary?.totalExportsCount ?? 0}</Text>
              <Text style={settingsStyles.statLabel}>Exports</Text>
            </View>
          </View>

          {/* ── Admin Section ── */}
          {isAdmin && (
            <>
              <Text style={settingsStyles.sectionLabel}>Admin</Text>
              <View style={settingsStyles.menuCard}>
                <TouchableOpacity
                  style={settingsStyles.menuItem}
                  onPress={() => router.push('/users')}
                >
                  <View style={[settingsStyles.menuIconWrap, { backgroundColor: colors.amberLight }]}>
                    <Icon name="people-outline" size={16} color={colors.amberDark} />
                  </View>
                  <View style={settingsStyles.menuText}>
                    <Text style={settingsStyles.menuLabel}>Users</Text>
                    <Text style={settingsStyles.menuSub}>Access and manage all users</Text>
                  </View>
                  <Icon name="chevron-forward" size={12} style={settingsStyles.chevron} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Profile Form ── */}
          <Text style={settingsStyles.sectionLabel}>Profile Information</Text>
          <View style={[settingsStyles.formCard, isDesktop && settingsStyles.formCardDesktop]}>
            {profileLoading && !isEditing ? (
              <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={colors.amber} />
                <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>
                  Loading profile...
                </Text>
              </View>
            ) : (
              <View style={settingsStyles.formInner}>
                {isDesktop ? (
                  <View style={settingsStyles.formRow}>
                    {formFields}
                  </View>
                ) : (
                  formFields
                )}

                {/* Email — always read-only */}
                <View style={settingsStyles.formGroup}>
                  <Text style={settingsStyles.formLabel}>Email Address</Text>
                  <TextInput
                    style={[
                      settingsStyles.formInput,
                      { color: colors.muted },
                      fieldErrors.email && settingsStyles.inputError,
                    ]}
                    value={email}
                    editable={false}
                  />
                  {fieldErrors.email && (
                    <Text style={settingsStyles.errorText}>{fieldErrors.email[0]}</Text>
                  )}
                </View>

                {/* Cancel / Save buttons */}
                {isEditing && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 13,
                        backgroundColor: '#E5E7EB',
                        alignItems: 'center',
                      }}
                      onPress={handleCancel}
                    >
                      <Text style={{ fontWeight: '700', color: '#374151' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        settingsStyles.saveButton,
                        { flex: 1 },
                        profileLoading && settingsStyles.saveButtonDisabled,
                      ]}
                      onPress={handleSave}
                      disabled={profileLoading}
                    >
                      {profileLoading ? (
                        <ActivityIndicator size="small" color={colors.navy} />
                      ) : (
                        <>
                          <Icon name="checkmark" size={14} color={colors.navy} />
                          <Text style={settingsStyles.saveButtonText}>Save Changes</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Subscription ── */}
          {!isAdmin && (
            <>
              <Text style={settingsStyles.sectionLabel}>Subscription</Text>
              <View style={[settingsStyles.subCard, isDesktop && settingsStyles.subCardDesktop]}>
                <View style={settingsStyles.subTop}>
                  <View style={settingsStyles.subIcon}>
                    <Icon name="star" size={18} color={colors.amberDark} />
                  </View>
                  <View>
                    <Text style={settingsStyles.subTitle}>
                      {profile?.accountType || 'Free'} Plan
                    </Text>
                    {!isPremium && (
                      <Text style={settingsStyles.subSubtitle}>
                        {profile?.remainingScans ?? 0} scans remaining
                      </Text>
                    )}
                    {isPremium && (
                      <Text style={settingsStyles.subSubtitle}>
                        Unlimited scans
                      </Text>
                    )}
                  </View>
                </View>

                <View style={settingsStyles.progressLabels}>
                  {!isPremium ? (
                    <Text style={{ color: colors.muted, fontWeight: '600' }}>
                      {summary?.totalScansUsed ?? 0} of{' '}
                      {(summary?.totalScansUsed ?? 0) + (profile?.remainingScans ?? 0)} scans used
                    </Text>
                  ) : (
                    <Text style={{ color: colors.muted, fontWeight: '600' }}>Usage</Text>
                  )}
                  <Text style={settingsStyles.progressLabelStrong}>{usagePercent}%</Text>
                </View>

                <View style={settingsStyles.progressBar}>
                  <View style={[settingsStyles.progressFill, { width: usageWidth as any }]} />
                </View>

                {!isPremium ? (
                  <TouchableOpacity
                    style={settingsStyles.upgradeButton}
                    onPress={handleUpgrade}
                  >
                    <Icon name="flash" size={13} color={colors.amber} />
                    <Text style={settingsStyles.upgradeButtonText}>
                      Upgrade to Pro — Unlimited Scans
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}

          {/* ── Legal & Account ── */}
          <View style={[
            settingsStyles.twoColumnSection,
            !isDesktop && !isTablet && settingsStyles.twoColumnSectionMobile,
          ]}>
            {/* Legal */}
            <View style={settingsStyles.twoColumnItem}>
              <Text style={settingsStyles.sectionLabel}>Legal</Text>
              <View style={settingsStyles.menuCard}>
                <TouchableOpacity
                  style={settingsStyles.menuItem}
                  onPress={() => router.push("/privacy-policy")}
                >
                  <View style={[settingsStyles.menuIconWrap, { backgroundColor: colors.amberLight }]}>
                    <Icon name="document-text-outline" size={15} color={colors.amberDark} />
                  </View>
                  <View style={settingsStyles.menuText}>
                    <Text style={settingsStyles.menuLabel}>Privacy Policy</Text>
                    <Text style={settingsStyles.menuSub}>Read how we handle your data</Text>
                  </View>
                  <Icon name="chevron-forward" size={12} style={settingsStyles.chevron} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account */}
            <View style={settingsStyles.twoColumnItem}>
              <Text style={settingsStyles.sectionLabel}>Account</Text>
              <View style={settingsStyles.menuCard}>
                <TouchableOpacity style={settingsStyles.menuItem} onPress={handleLogout}>
                  <View style={[settingsStyles.menuIconWrap, settingsStyles.menuIconRed]}>
                    <Icon name="log-out-outline" size={15} color={colors.red} />
                  </View>
                  <View style={settingsStyles.menuText}>
                    <Text style={[settingsStyles.menuLabel, settingsStyles.menuLabelRed]}>
                      Sign Out
                    </Text>
                    <Text style={settingsStyles.menuSub}>Log out of your account</Text>
                  </View>
                  <Icon name="chevron-forward" size={12} style={settingsStyles.chevron} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ── Logout Modal ── */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24,
            }}>
              <TouchableWithoutFeedback>
                <View style={{
                  width: '100%',
                  maxWidth: 360,
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  paddingHorizontal: 24,
                  paddingTop: 28,
                  paddingBottom: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 24,
                  elevation: 12,
                }}>
                  {/* Icon */}
                  <View style={{
                    alignSelf: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#FEE2E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <Icon name="log-out-outline" size={26} color={colors.red} />
                  </View>

                  {/* Title */}
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: colors.navy,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                    Sign Out
                  </Text>

                  {/* Subtitle */}
                  <Text style={{
                    fontSize: 14,
                    color: colors.muted,
                    textAlign: 'center',
                    lineHeight: 20,
                    marginBottom: 24,
                  }}>
                    Are you sure you want to sign out of your account?
                  </Text>

                  {/* Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 13,
                        borderRadius: 12,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                      }}
                      onPress={() => setShowLogoutModal(false)}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 14, color: '#374151' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 13,
                        borderRadius: 12,
                        backgroundColor: '#FEE2E2',
                        alignItems: 'center',
                      }}
                      onPress={async () => {
                        setShowLogoutModal(false);
                        await deleteTokens();
                        router.replace('/login');
                      }}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 14, color: colors.red }}>
                        Sign Out
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Premium Upgrade Modal ── */}
        <Modal
          visible={showQR}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => {
            setShowQR(false);
            resetPaymentForm();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback
              onPress={() => {
                Keyboard.dismiss();
                setShowQR(false);
                resetPaymentForm();
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'flex-end',
                }}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View
                    style={{
                      backgroundColor: '#fff',
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      maxHeight: '90%',
                      width: '100%',
                      ...(isDesktop || isTablet
                        ? {
                            alignSelf: 'center',
                            maxWidth: 460,
                            borderRadius: 20,
                            marginBottom: 40,
                          }
                        : {}),
                    }}
                  >
                    {/* Drag handle */}
                    {!isDesktop && !isTablet && (
                      <View
                        style={{
                          width: 40,
                          height: 4,
                          backgroundColor: '#E5E7EB',
                          borderRadius: 2,
                          alignSelf: 'center',
                          marginTop: 10,
                          marginBottom: 6,
                        }}
                      />
                    )}

                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                      contentContainerStyle={{
                        padding: 20,
                        paddingBottom: 36,
                      }}
                    >
                      {!showRequests ? (
                        <>
                          {/* Header */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy }}>
                              Upgrade to Pro 🚀
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setShowQR(false);
                                resetPaymentForm();
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Icon name="close-circle" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>

                          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 19 }}>
                            Scan &amp; pay using any UPI app. Already paid? Enter your transaction ID below.
                          </Text>

                          {/* QR */}
                          {paymentUrl && (
                            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                              <View style={{
                                padding: 12,
                                backgroundColor: '#F9FAFB',
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: '#E5E7EB',
                              }}>
                                <QRCode value={paymentUrl} size={180} />
                              </View>
                            </View>
                          )}

                          {/* Open UPI */}
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.amber,
                              paddingVertical: 13,
                              borderRadius: 12,
                              alignItems: 'center',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              gap: 6,
                              marginBottom: 10,
                            }}
                            onPress={() => Linking.openURL(paymentUrl)}
                          >
                            <Icon name="open-outline" size={15} color={colors.navy} />
                            <Text style={{ fontWeight: '700', color: colors.navy, fontSize: 14 }}>
                              Open UPI App
                            </Text>
                          </TouchableOpacity>

                          {/* View Requests */}
                          <TouchableOpacity
                            onPress={() => {
                              fetchRequests();
                              setShowRequests(true);
                            }}
                            style={{ marginBottom: 14 }}
                          >
                            <Text style={{ color: colors.amber, textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                              View My Requests →
                            </Text>
                          </TouchableOpacity>

                          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 14 }} />

                          {/* Transaction ID */}
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                            Transaction ID <Text style={{ color: 'red' }}>*</Text>
                          </Text>
                          <TextInput
                            placeholder="e.g. 4359XXXXXXXXXXXX"
                            value={paymentRef}
                            onChangeText={(t) => {
                              setPaymentRef(t);
                              if (fieldError) setFieldError(null);
                            }}
                            returnKeyType="next"
                            style={{
                              borderWidth: 1,
                              borderColor: fieldError ? '#EF4444' : '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              fontSize: 14,
                              backgroundColor: '#F9FAFB',
                              color: '#111827',
                              marginBottom: fieldError ? 4 : 12,
                            }}
                          />
                          {fieldError && (
                            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10 }}>
                              {fieldError}
                            </Text>
                          )}

                          {/* Message */}
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                            Message <Text style={{ color: '#9CA3AF' }}>(optional)</Text>
                          </Text>
                          <TextInput
                            placeholder="Add a note..."
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={2}
                            returnKeyType="done"
                            blurOnSubmit
                            style={{
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingTop: 12,
                              paddingBottom: 12,
                              fontSize: 14,
                              backgroundColor: '#F9FAFB',
                              color: '#111827',
                              minHeight: 60,
                              textAlignVertical: 'top',
                              marginBottom: 16,
                            }}
                          />

                          {/* Submit */}
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.navy,
                              paddingVertical: 14,
                              borderRadius: 12,
                              alignItems: 'center',
                              opacity: submitLoading ? 0.7 : 1,
                            }}
                            onPress={async () => {
                              if (!paymentRef.trim()) {
                                setFieldError('Transaction ID is required');
                                return;
                              }
                              try {
                                setFieldError(null);
                                await submitRequest({
                                  message: message || 'Premium upgrade',
                                  paymentReference: paymentRef,
                                });
                                showToast('Request submitted ✅');
                                resetPaymentForm();
                                setShowQR(false);
                              } catch (err: any) {
                                const apiErrors = err?.response?.data?.errors;
                                if (apiErrors?.PaymentReference) {
                                  setFieldError(apiErrors.PaymentReference[0]);
                                } else {
                                  setFieldError('Submission failed. Please try again.');
                                }
                              }
                            }}
                            disabled={submitLoading}
                          >
                            {submitLoading ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                                Submit Request
                              </Text>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          {/* My Requests header */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <TouchableOpacity
                              onPress={() => setShowRequests(false)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={{ marginRight: 10 }}
                            >
                              <Icon name="arrow-back" size={20} color={colors.navy} />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy }}>
                              My Requests
                            </Text>
                          </View>

                          {reqLoading ? (
                            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                              <ActivityIndicator color={colors.amber} />
                            </View>
                          ) : myRequests.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                              <Icon name="receipt-outline" size={36} color="#D1D5DB" />
                              <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 14 }}>
                                No requests found
                              </Text>
                            </View>
                          ) : (
                            myRequests.map((item) => (
                              <View
                                key={item.id}
                                style={{
                                  borderWidth: 1,
                                  borderColor: '#F3F4F6',
                                  borderRadius: 12,
                                  padding: 14,
                                  marginBottom: 10,
                                  backgroundColor: '#F9FAFB',
                                }}
                              >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <Text style={{ fontWeight: '700', fontSize: 13, color: colors.navy }}>
                                    {item.paymentReference}
                                  </Text>
                                  <View style={{
                                    backgroundColor:
                                      item.status === 'Approved' ? '#D1FAE5' :
                                      item.status === 'Rejected' ? '#FEE2E2' : '#FEF9C3',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 20,
                                  }}>
                                    <Text style={{
                                      fontSize: 11,
                                      fontWeight: '700',
                                      color:
                                        item.status === 'Approved' ? '#065F46' :
                                        item.status === 'Rejected' ? '#991B1B' : '#78350F',
                                    }}>
                                      {item.status}
                                    </Text>
                                  </View>
                                </View>
                                {item.message ? (
                                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                                    {item.message}
                                  </Text>
                                ) : null}
                                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                  {new Date(item.createdAtUtc + 'Z').toLocaleString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </Text>
                              </View>
                            ))
                          )}
                        </>
                      )}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </View>
  );

  return (
    <SidebarLayout
      isAdmin={isAdmin}
      userName={userName}
      userInitials={getInitials()}
      userRole={roles?.[0]}
    >
      {content}
    </SidebarLayout>
  );
}