import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { AuthProvider } from '../../modules/auth/hooks/useAuth';

export default function AuthLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
