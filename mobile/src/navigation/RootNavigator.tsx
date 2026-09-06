import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { colors } from '../constants/theme';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'REGISTER') {
      return <RegisterScreen onNavigateLogin={() => setAuthScreen('LOGIN')} />;
    }
    return <LoginScreen onNavigateRegister={() => setAuthScreen('REGISTER')} />;
  }

  return <HomeScreen />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
