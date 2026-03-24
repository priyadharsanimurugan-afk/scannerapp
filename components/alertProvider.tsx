import React from 'react';
import { View } from 'react-native';
import { ToastContainer } from './webalert';


interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ToastContainer />
    </View>
  );
};