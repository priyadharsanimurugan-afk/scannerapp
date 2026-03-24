import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, Animated } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Web-specific toast manager
let webToastContainer: HTMLDivElement | null = null;

const createWebToastContainer = () => {
  if (Platform.OS !== 'web') return null;
  
  if (!webToastContainer) {
    webToastContainer = document.createElement('div');
    webToastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(webToastContainer);
    
    // Add keyframe animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  return webToastContainer;
};

const showWebToast = (message: string, type: ToastType, duration: number = 3000) => {
  if (Platform.OS !== 'web') return;
  
  const container = createWebToastContainer();
  if (!container) return;
  
  const toast = document.createElement('div');
  
  // Original gradient styling from your code
  const bgColor = type === 'success'
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : type === 'error'
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #f59f0a 0%, #d97706 100%)';
  
  toast.style.cssText = `
    background: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    animation: slideInRight 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  toast.textContent = message;
  
  // Add hover effect similar to your original buttons
  toast.onmouseenter = () => {
    toast.style.transform = 'translateY(-2px)';
    toast.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
  };
  toast.onmouseleave = () => {
    toast.style.transform = 'translateY(0)';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  };
  
  // Click to dismiss
  toast.onclick = () => {
    dismissWebToast(toast);
  };
  
  container.appendChild(toast);
  
  setTimeout(() => {
    dismissWebToast(toast);
  }, duration);
};

const dismissWebToast = (toast: HTMLDivElement) => {
  toast.style.animation = 'slideOutRight 0.3s ease-out';
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

// Native toast manager
interface NativeToastState {
  toasts: ToastMessage[];
}

let nativeToastListeners: ((state: NativeToastState) => void)[] = [];

const addNativeToast = (message: string, type: ToastType, duration: number = 3000) => {
  const id = Date.now().toString();
  const newToast = { id, message, type };
  
  nativeToastListeners.forEach(listener => {
    listener({ toasts: [newToast] });
  });
  
  setTimeout(() => {
    nativeToastListeners.forEach(listener => {
      listener({ toasts: [] });
    });
  }, duration);
};

// Main Toast component for native platforms
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fadeAnim = new Animated.Value(0);
  
  useEffect(() => {
    const listener = (state: NativeToastState) => {
      setToasts(state.toasts);
      if (state.toasts.length > 0) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(2700),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
    
    nativeToastListeners.push(listener);
    return () => {
      nativeToastListeners = nativeToastListeners.filter(l => l !== listener);
    };
  }, [fadeAnim]);
  
  if (toasts.length === 0) return null;
  
  const toast = toasts[0];
  // Using your original gradient colors for native as well
  const getGradientStyle = () => {
    if (toast.type === 'success') {
      return { backgroundColor: '#10b981' };
    } else if (toast.type === 'error') {
      return { backgroundColor: '#ef4444' };
    } else {
      return { backgroundColor: '#f59f0a' };
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.nativeToast,
        getGradientStyle(),
        { opacity: fadeAnim }
      ]}
    >
      <Text style={styles.nativeToastText}>{toast.message}</Text>
    </Animated.View>
  );
};

// Toast API
export const Toast = {
  show: (message: string, type: ToastType = 'info', duration?: number) => {
    if (Platform.OS === 'web') {
      showWebToast(message, type, duration);
    } else {
      addNativeToast(message, type, duration);
    }
  },
  
  success: (message: string, duration?: number) => {
    Toast.show(message, 'success', duration);
  },
  
  error: (message: string, duration?: number) => {
    Toast.show(message, 'error', duration);
  },
  
  info: (message: string, duration?: number) => {
    Toast.show(message, 'info', duration);
  },
};

const styles = StyleSheet.create({
  nativeToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    left: 20,
    padding: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  nativeToastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});