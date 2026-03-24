// components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isAdmin?:         boolean;
  userInitials?:    string;
  userAvatarColor?: string;
  userName?:        string;
  userRole?:        string;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const BASE_NAV_ITEMS = [
  { icon: 'grid-outline',   activeIcon: 'grid',   label: 'Dashboard', route: '/dashboard' },
  { icon: 'people-outline', activeIcon: 'people', label: 'Contacts',  route: '/contacts-web' },
  { icon: 'cog-outline',    activeIcon: 'cog',    label: 'Settings',  route: '/settings' },
];

const ADMIN_NAV_ITEM = {
  icon:       'person-circle-outline',
  activeIcon: 'person-circle',
  label:      'Users',
  route:      '/users',
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  isAdmin         = false,
  userInitials    = 'U',
  userAvatarColor = colors.amber,
  userName        = 'User',
  userRole,
}) => {
  const router   = useRouter();
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS.slice(0, 2), ADMIN_NAV_ITEM, BASE_NAV_ITEMS[2]]
    : BASE_NAV_ITEMS;

  const isActive = (route: string) => {
    if (route === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    if (route === '/contacts-web') return pathname === '/contacts-web' || pathname === '/contacts';
    return pathname === route;
  };

  const handleNavigation = async (route: string) => {
    if (navigating) return;
    
    // Don't navigate if already on that page
    if (isActive(route)) return;
    
    setNavigating(true);
    setPendingRoute(route);
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      await router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Add a small delay before hiding loading state
      setTimeout(() => {
        setNavigating(false);
        setPendingRoute(null);
      }, 300);
    }
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoIcon}>
          <Icon name="card" size={20} color={colors.navy} />
        </View>
        <View>
          <Text style={styles.logoText}>CardScan Pro</Text>
          <Text style={styles.logoTag}>Smart Scanner</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Nav items */}
      <View style={styles.nav}>
        {navItems.map(item => {
          const active = isActive(item.route);
          const isLoading = navigating && pendingRoute === item.route;
          
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem, 
                active && styles.navItemActive,
                isLoading && styles.navItemLoading
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.75}
              disabled={navigating}
            >
              {active && <View style={styles.activeBar} />}
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={active ? colors.navy : 'rgba(255,255,255,0.45)'} />
                ) : (
                  <Icon
                    name={active ? item.activeIcon : item.icon}
                    size={18}
                    color={active ? colors.navy : 'rgba(255,255,255,0.45)'}
                  />
                )}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* User footer */}
      <View style={styles.divider} />
      <TouchableOpacity
        style={[styles.userFooter, navigating && styles.userFooterDisabled]}
        onPress={() => handleNavigation('/settings')}
        activeOpacity={0.8}
        disabled={navigating}
      >
        <View style={[styles.userAvatar, { backgroundColor: userAvatarColor }]}>
          <Text style={styles.userAvatarText}>{userInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.userRoleText}>
            {userRole ?? (isAdmin ? 'Admin' : 'Member')}
          </Text>
        </View>
        <Icon name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
      </TouchableOpacity>
    </View>
  );
};

// ─── SidebarLayout wrapper ────────────────────────────────────────────────────
// • Desktop (≥1024px): sidebar + main content side-by-side
// • Tablet  (640–1023px): no sidebar, content centred with max-width 680px
// • Mobile  (<640px): no sidebar, full-width content

interface SidebarLayoutProps extends SidebarProps {
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  ...sidebarProps
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet  = width >= 640 && width < 1024;

  if (!isDesktop) {
    // Tablet: centre content
    if (isTablet) {
      return (
        <View style={styles.tabletWrapper}>
          {children}
        </View>
      );
    }
    // Mobile: plain passthrough
    return <>{children}</>;
  }

  // Desktop: sidebar + content
  return (
    <View style={styles.layout}>
      <Sidebar {...sidebarProps} />
      <View style={styles.mainContent}>
        {children}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Desktop layout
  layout: {
    flex:            1,
    flexDirection:   'row',
    backgroundColor: colors.navy,
  },
  mainContent: {
    flex:            1,
    backgroundColor: colors.phoneBg,
    overflow:        'hidden',
  },

  // Tablet wrapper — centres page content
  tabletWrapper: {
    flex:            1,
    backgroundColor: colors.phoneBg,
    alignItems:      'center',
  },

  // Sidebar shell
  sidebar: {
    width:           220,
    minWidth:        220,
    backgroundColor: colors.navy,
    paddingTop:      28,
    paddingHorizontal: 14,
    paddingBottom:   24,
    flexDirection:   'column',
  },

  // Logo
  logo: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    marginBottom:  20,
    paddingHorizontal: 4,
  },
  logoIcon: {
    width:           40,
    height:          40,
    backgroundColor: colors.amber,
    borderRadius:    12,
    justifyContent:  'center',
    alignItems:      'center',
  },
  logoText: {
    color:        colors.white,
    fontSize:     15,
    fontWeight:   '800',
    letterSpacing: -0.3,
  },
  logoTag: {
    color:          colors.amber,
    fontSize:       9,
    fontWeight:     '600',
    textTransform:  'uppercase',
    letterSpacing:  1,
    opacity:        0.8,
  },

  // Divider
  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical:  12,
  },

  // Nav
  nav: { gap: 2 },
  navItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius:   10,
    position:       'relative',
    overflow:       'hidden',
    transition:     'all 0.2s ease-in-out',
  },
  navItemActive: {
    backgroundColor: 'rgba(245,159,10,0.13)',
  },
  navItemLoading: {
    opacity: 0.7,
  },
  activeBar: {
    position:        'absolute',
    left:            0,
    top:             8,
    bottom:          8,
    width:           3,
    backgroundColor: colors.amber,
    borderRadius:    2,
  },
  navIconWrap: {
    width:          32,
    height:         32,
    borderRadius:   9,
    justifyContent: 'center',
    alignItems:     'center',
    transition:     'all 0.2s ease-in-out',
  },
  navIconWrapActive: {
    backgroundColor: colors.amber,
  },
  navLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.45)',
    transition: 'color 0.2s ease-in-out',
  },
  navLabelActive: {
    color:      colors.white,
    fontWeight: '700',
  },

  // User footer
  userFooter: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius:  10,
    transition:    'all 0.2s ease-in-out',
  },
  userFooterDisabled: {
    opacity: 0.6,
  },
  userAvatar: {
    width:          36,
    height:         36,
    borderRadius:   18,
    justifyContent: 'center',
    alignItems:     'center',
    flexShrink:     0,
  },
  userAvatarText: {
    fontSize:   13,
    fontWeight: '800',
    color:      colors.white,
  },
  userName: {
    color:      colors.white,
    fontSize:   13,
    fontWeight: '700',
  },
  userRoleText: {
    color:      'rgba(255,255,255,0.4)',
    fontSize:   10,
    fontWeight: '500',
  },
});