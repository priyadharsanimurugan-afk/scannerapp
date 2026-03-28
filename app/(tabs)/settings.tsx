import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { settingsStyles } from '@/components/styles/settingsStyles';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { useDashboard } from '@/hooks/useDashboard';
import { router } from 'expo-router';
import { deleteTokens, getRoles } from '@/utils/tokenStorage';
import { SidebarLayout } from '../sidebar';


export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet  = width >= 640 && width < 1024;

  const [toast, setToast] = useState({ show: false, msg: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { profile, loading: profileLoading, editProfile, fetchProfile } = useProfile();
  const { summary } = useDashboard();

  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName]       = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail]             = useState('');
  const [isAdmin, setIsAdmin]         = useState(false);
  const [roles, setRoles]             = useState<string[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [originalData, setOriginalData] = useState({ userName: '', phoneNumber: '' });

  // ── Sync profile into local state (guard against empty overwrites) ──
  useEffect(() => {
    if (profile) {
      if (profile.userName)    setUserName(profile.userName);
      if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
      if (profile.email)       setEmail(profile.email);
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

  // ── Helpers ──────────────────────────────────────────────────────────
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
        // Normalize PascalCase → camelCase (e.g. "PhoneNumber" → "phoneNumber")
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

  // ── Handlers ─────────────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────
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

  // ── Form fields (reused for both desktop and mobile) ─────────────────
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
  maxLength={10}   // ✅ limit to 10 digits
/>
{fieldErrors.phoneNumber && (
  <Text style={settingsStyles.errorText}>
    {fieldErrors.phoneNumber[0]}
  </Text>
)}

      </View>
    </>
  );

  // ── Content ───────────────────────────────────────────────────────────
  const content = (
    <View
      style={[
        settingsStyles.container,
        isDesktop && settingsStyles.containerDesktop,
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

      <ScrollView
        style={settingsStyles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          settingsStyles.scrollContent,
          isDesktop && settingsStyles.scrollContentDesktop,
          isTablet  && settingsStyles.scrollContentTablet,
        ]}
      >
        {/* ── Profile Hero ── */}
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
              <View style={settingsStyles.avatarEdit}>
                <Icon name="camera" size={9} color={colors.navy} />
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

          {/* Form-level loader — only shown on initial fetch, not while editing */}
          {profileLoading && !isEditing ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.amber} />
              <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>
                Loading profile...
              </Text>
            </View>
          ) : (
            <View style={settingsStyles.formInner}>

              {/* Desktop: username + phone side-by-side */}
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

              {!isPremium && (
                <TouchableOpacity style={settingsStyles.upgradeButton}>
                  <Icon name="flash" size={13} color={colors.amber} />
                  <Text style={settingsStyles.upgradeButtonText}>
                    Upgrade to Pro — Unlimited Scans
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Account ── */}
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

        {/* ── Logout Modal ── */}
        {showLogoutModal && (
          <View style={settingsStyles.overlay}>
            <View style={settingsStyles.modalCard}>
              <Text style={settingsStyles.modalTitle}>Confirm Logout</Text>
              <Text style={settingsStyles.modalText}>
                Are you sure you want to log out?
              </Text>
              <View style={settingsStyles.modalActions}>
                <TouchableOpacity
                  style={settingsStyles.cancelBtn}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={settingsStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={settingsStyles.logoutBtn}
                  onPress={async () => {
                    setShowLogoutModal(false);
                    await deleteTokens();
                    router.replace('/login');
                  }}
                >
                  <Text style={settingsStyles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
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