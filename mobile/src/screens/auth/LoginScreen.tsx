import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Login failed. Please check your credentials.');
    }
  };

  // Quick Demo Account Pre-fill for University Presentation
  const prefillAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏨</Text>
          </View>
          <Text style={styles.title}>HostelHub</Text>
          <Text style={styles.subtitle}>Sign in to your campus residential portal</Text>
        </View>

        {/* Quick Demo Switcher */}
        <View style={styles.demoBox}>
          <Text style={styles.demoHeader}>⚡ Quick Demo Accounts</Text>
          <View style={styles.demoGrid}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => prefillAccount('warden@hostelhub.edu', 'Warden@123')}
            >
              <Text style={styles.demoButtonText}>Warden</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => prefillAccount('mess@hostelhub.edu', 'Mess@123')}
            >
              <Text style={styles.demoButtonText}>Mess Incharge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => prefillAccount('hosteler@hostelhub.edu', 'Student@123')}
            >
              <Text style={styles.demoButtonText}>Hosteler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => prefillAccount('dayscholar@hostelhub.edu', 'Student@123')}
            >
              <Text style={styles.demoButtonText}>Day Scholar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Alert Box */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Login Form Card */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institutional Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. rollnumber@hostelhub.edu"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.showHideButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link to Register */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New student? </Text>
          <TouchableOpacity onPress={onNavigateRegister}>
            <Text style={styles.registerLink}>Register Student Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  demoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  demoHeader: {
    ...typography.caption,
    color: colors.accentLight,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  demoButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    width: '48%',
    alignItems: 'center',
  },
  demoButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showHideButton: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  showHideText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.white,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.primaryLight,
  },
});
