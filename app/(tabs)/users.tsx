import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { dashboardStyles } from "@/components/styles/dashboardStyles";
import { colors } from "@/constants/colors";
import { getAllUsers, upgradeUser, downgradeUser } from "@/services/users";
import { SidebarLayout } from "../sidebar";
import { Toast } from "@/components/webalert";
import { getRoles } from "@/utils/tokenStorage";
import { useProfile } from "@/hooks/useProfile";


// Platform-specific alert (keeping this as it's separate functionality)
const showWebAlert = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS !== 'web') return;

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #1a1f2e 0%, #0f1119 100%);
    border-radius: 24px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 159, 10, 0.2);
    animation: slideUp 0.3s ease-out;
  `;

  // Title
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 12px 0;
    background: linear-gradient(135deg, #fff 0%, #f59f0a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  `;

  // Message
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 24px 0;
  `;

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `;

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: none;
    padding: 10px 20px;
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `;
  cancelBtn.onmouseenter = () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
  };
  cancelBtn.onmouseleave = () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
  };
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = title === 'Upgrade User' ? 'Upgrade' : 'Downgrade';
  confirmBtn.style.cssText = `
    background: linear-gradient(135deg, #f59f0a 0%, #d97706 100%);
    border: none;
    padding: 10px 20px;
    border-radius: 12px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(245, 159, 10, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  confirmBtn.onmouseenter = () => {
    confirmBtn.style.transform = 'translateY(-1px)';
    confirmBtn.style.boxShadow = '0 4px 12px rgba(245, 159, 10, 0.4)';
  };
  confirmBtn.onmouseleave = () => {
    confirmBtn.style.transform = 'translateY(0)';
    confirmBtn.style.boxShadow = '0 2px 8px rgba(245, 159, 10, 0.3)';
  };
  confirmBtn.onclick = () => {
    document.body.removeChild(overlay);
    onConfirm();
  };

  // Add keyframe animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  modal.appendChild(titleEl);
  modal.appendChild(messageEl);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
};

// Platform-specific alert wrapper
const showAlert = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    showWebAlert(title, message, onConfirm);
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: onConfirm },
    ]);
  }
};

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { width } = useWindowDimensions();
  const router = useRouter();
  
  const isDesktop = width >= 1024;
  const USERS_PER_PAGE = 10;

  // Calculate pagination
  const indexOfLastUser = currentPage * USERS_PER_PAGE;
  const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const [roles, setRoles] = useState<string[] | null>(null);

    const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    const loadRoles = async () => {
      const storedRoles = await getRoles();
      setRoles(storedRoles);
    };
    loadRoles();
  }, []);

    const getUserFullName = () => profile?.userName || "User";
  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.log(err);
      Toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpgrade = async (userName: string, id: string) => {
    showAlert(
      "Upgrade User",
      `Are you sure you want to upgrade ${userName} to Premium?`,
      async () => {
        try {
          await upgradeUser(id);
          fetchUsers();
          Toast.success(`${userName} has been upgraded to Premium!`);
        } catch (error) {
          console.log("Upgrade failed:", error);
          Toast.error('Upgrade failed. Please try again.');
        }
      }
    );
  };

  const handleDowngrade = async (userName: string, id: string) => {
    showAlert(
      "Downgrade User",
      `Are you sure you want to downgrade ${userName} to Free plan?`,
      async () => {
        try {
          await downgradeUser(id);
          fetchUsers();
          Toast.success(`${userName} has been downgraded to Free plan!`);
        } catch (error) {
          console.log("Downgrade failed:", error);
          Toast.error('Downgrade failed. Please try again.');
        }
      }
    );
  };

  const UsersContent = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.amber} />
        </View>
      );
    }

    return (
      <View style={[dashboardStyles.container, isDesktop && { backgroundColor: colors.phoneBg }]}>
        {/* HEADER WITH GLOW */}
        <View style={dashboardStyles.header}>
          <View style={dashboardStyles.headerGlow1} />
          <View style={dashboardStyles.headerGlow2} />

          <View style={dashboardStyles.headerTop}>
            <View>
              <Text style={dashboardStyles.greetText}>Admin Panel</Text>
              <Text style={dashboardStyles.titleText}>
                Manage <Text style={dashboardStyles.titleSpan}>Users</Text>
              </Text>
              {!isDesktop && (
                <TouchableOpacity 
                  onPress={() => router.back()}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ color: colors.amber, fontSize: 14 }}>
                    ← Back
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={[dashboardStyles.body, isDesktop && { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Section Header */}
          <View style={dashboardStyles.sectionHead}>
            <Text style={dashboardStyles.sectionTitle}>All Users</Text>
            <Text style={dashboardStyles.sectionSubtitle}>
              Total: {users.length} users
            </Text>
          </View>

          {/* Users List */}
          <View style={dashboardStyles.contactList}>
            {currentUsers.map((user) => (
              <View key={user.id} style={dashboardStyles.contactCard}>
                {/* Avatar */}
                <View
                  style={[
                    dashboardStyles.contactAvatar,
                    { backgroundColor: colors.navy },
                  ]}
                >
                  <Text style={dashboardStyles.contactAvatarText}>
                    {user.userName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>

                {/* User Info */}
                <View style={dashboardStyles.contactInfo}>
                  <Text style={dashboardStyles.contactName}>
                    {user.userName || "Unnamed User"}
                  </Text>
                  <Text style={dashboardStyles.contactRole}>
                    {user.email || "No email"}
                  </Text>
                  <View style={dashboardStyles.planBadge}>
                    <Text style={[
                      dashboardStyles.contactCompany,
                      user.accountType === "Premium" && dashboardStyles.premiumText
                    ]}>
                      {user.accountType || "Free"} Plan
                    </Text>
                  </View>
                  <Text style={dashboardStyles.remainingScans}>
                    {user.remainingScans || 0} scans remaining
                  </Text>
                </View>

                {/* Action Buttons */}
                <View>
                  {user.accountType === "Premium" ? (
                    <TouchableOpacity
                      style={dashboardStyles.downgradeButton}
                      onPress={() => handleDowngrade(user.userName, user.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={dashboardStyles.buttonText}>Downgrade</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={dashboardStyles.upgradeButton}
                      onPress={() => handleUpgrade(user.userName, user.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={dashboardStyles.buttonText}>Upgrade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={dashboardStyles.paginationContainer}>
              <TouchableOpacity
                style={[
                  dashboardStyles.paginationButton,
                  currentPage === 1 && dashboardStyles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Text style={dashboardStyles.paginationText}>Previous</Text>
              </TouchableOpacity>
              
              <View style={dashboardStyles.paginationInfo}>
                <Text style={dashboardStyles.paginationInfoText}>
                  Page {currentPage} of {totalPages}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  dashboardStyles.paginationButton,
                  currentPage === totalPages && dashboardStyles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={dashboardStyles.paginationText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Wrap with SidebarLayout on desktop
  if (isDesktop) {
    return (
      <SidebarLayout 
        isAdmin={true}
        userInitials="A"
        userAvatarColor={colors.amber}
      userName={getUserFullName()}
     userRole={roles?.[0]}
      >
        <UsersContent />
      </SidebarLayout>
    );
  }

  return <UsersContent />;
}