// components/toast.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface ToastProps {
  show: boolean;
  messages: string[];
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
}

const CONFIG = {
  error: {
    bg:       '#18181B',
    border:   '#E24B4A',
    iconBg:   '#E24B4A18',
    icon:     '#E24B4A',
    title:    '#FCA5A5',
    dot:      '#E24B4A',
    iconName: 'close-circle',
    closeColor: '#FCA5A580',
  },
  success: {
    bg:       '#18181B',
    border:   '#22C55E',
    iconBg:   '#22C55E18',
    icon:     '#22C55E',
    title:    '#86EFAC',
    dot:      '#22C55E',
    iconName: 'checkmark-circle',
    closeColor: '#86EFAC80',
  },
  info: {
    bg:       '#18181B',
    border:   '#3B82F6',
    iconBg:   '#3B82F618',
    icon:     '#3B82F6',
    title:    '#93C5FD',
    dot:      '#3B82F6',
    iconName: 'information-circle',
    closeColor: '#93C5FD80',
  },
};

export const Toast: React.FC<ToastProps> = ({ show, messages, type, onClose }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (show) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue:  0,
          tension:  70,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:  1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue:  1,
          tension:  70,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:  -100,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:  0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue:  0.92,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [show]);

  const c = CONFIG[type];

  return (
    <Animated.View
      pointerEvents={show ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: c.bg, borderColor: c.border }]}>
        <View style={[styles.topLine, { backgroundColor: c.border }]} />
        
        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 0, bottom: 0, left: 8, right: 98 }}
          >
            <Icon name="close" size={14} color={c.closeColor} />
          </TouchableOpacity>
        )}

        <View style={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: c.iconBg }]}>
            <Icon name={c.iconName} size={22} color={c.icon} />
          </View>

          <View style={styles.msgWrap}>
            {messages.map((msg, i) => (
              <View key={i} style={styles.msgRow}>
                {messages.length > 1 && (
                  <View style={[styles.dot, { backgroundColor: c.dot }]} />
                )}
                <Text style={[styles.msgText, { color: c.title }]} numberOfLines={3}>
                  {msg}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position:          'absolute',
    top:               Platform.OS === 'ios' ? 60 : 44,
    left:              0,
    right:             0,
    zIndex:            9999,
    elevation:         20,
    alignItems:        'center',
    paddingHorizontal: 24,
  },
  toast: {
    width:        '100%',
    maxWidth:     420,
    borderRadius: 16,
    borderWidth:  1,
    overflow:     'hidden',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  topLine: {
    height:  2.5,
    width:   '100%',
    opacity: 0.9,
  },
  closeBtn: {
    position: 'absolute',
    top:      10,
    right:    10,
    zIndex:   10,
    padding:  4,
  },
  inner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
    paddingVertical:   13,
    paddingRight:      32,
    gap:               12,
  },
  iconWrap: {
    width:          42,
    height:         42,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
    flexShrink:     0,
  },
  msgWrap: {
    flex: 1,
    gap:  5,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  dot: {
    width:        5,
    height:       5,
    borderRadius: 3,
    marginTop:    6,
    flexShrink:   0,
  },
  msgText: {
    fontSize:      13.5,
    fontWeight:    '500',
    lineHeight:    20,
    flex:          1,
    letterSpacing: 0.1,
  },
});