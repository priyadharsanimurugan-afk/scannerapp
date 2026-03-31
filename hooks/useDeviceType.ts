// hooks/useDeviceType.ts
import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

export const useDeviceType = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = Dimensions.get('window').width;
      // Consider devices with width >= 1024px as desktop
      // Tablets are between 768px and 1023px
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
    };

    // Check initial device
    checkDevice();

    // Add event listener for dimension changes
    const subscription = Dimensions.addEventListener('change', checkDevice);

    return () => subscription?.remove();
  }, []);

  return { isDesktop, isTablet };
};