// app/dashboard/_layout.tsx

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { useDeviceType } from '@/hooks/useDeviceType';

function TabIcon({ name, label, focused, isScan = false }: { name: any; label: string; focused: boolean; isScan?: boolean }) {
  const { isDesktop, isTablet } = useDeviceType();

  // Don't show tab icons on desktop (where sidebar exists)
  if (isDesktop) {
    return null;
  }

  // Show tab icons on both mobile and tablet (since they don't have sidebar)
  return (
    <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
      <Entypo 
        name={name} 
        size={20} 
        color={focused ? colors.amberDark : colors.text} 
      />
      <Text 
        style={[
          tabStyles.label, 
          focused ? tabStyles.labelActive : tabStyles.labelInactive
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 70,
  },
  tabItemActive: {
    backgroundColor: colors.amberLight,
    height: 45,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
  },
  labelInactive: {
    color: colors.text,
  },
  labelActive: {
    color: colors.amberDark,
    fontWeight: '700',
  },
  // Mobile and tablet tab bar styles
  tabBarMobile: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 65,
    paddingTop: 6,
    paddingHorizontal: 8,
    elevation: 20,
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 2 },
  },
  // Desktop tab bar style (hidden)
  tabBarDesktop: {
    display: 'none',
    height: 0,
  },
});

export default function TabLayout() {
  const { isDesktop } = useDeviceType();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: isDesktop ? tabStyles.tabBarDesktop : tabStyles.tabBarMobile,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ focused }) => <TabIcon name="old-phone" label="Contacts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="camera" label="Scan" focused={focused} isScan={true} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="cog" label="Settings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null, // hides it from tab bar
        }}
      />
    </Tabs>
  );
}