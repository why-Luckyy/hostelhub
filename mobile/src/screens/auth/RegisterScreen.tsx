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

interface RegisterScreenProps {
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();

  // Form State
  const [studentType, setStudentType] = useState<'HOSTELER' | 'DAY_SCHOLAR'>('HOSTELER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('1');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    // Basic validation
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !rollNumber.trim() ||
      !email.trim() ||
      !password ||
      !phone.trim() ||
      !department.trim() ||
      !guardianName.trim() ||
      !guardianPhone.trim()
    ) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      studentType,
      department: department.trim(),
      yearOfStudy: parseInt(yearOfStudy, 10) || 1,
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
    };

    const result = await register(payload);
    setIsSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Registration Complete! 🎉',
        'Your student account has been created successfully. You can now log in.',
        [{ text: 'Go to Login', onPress: onNavigateLogin }]
      );
    } else {
      setErrorMessage(result.message || 'Registration failed. Please review your details.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onNavigateLogin} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Student Registration</Text>
          <Text style={styles.subtitle}>Create your official HostelHub account</Text>
        </View>

        {/* Error Notification */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. Core Residential Classification Selector */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>1. Residential Classification</Text>
          <Text style={styles.sectionSubtitle}>
            Please select whether you reside in the university hostel or commute from home.
          </Text>

          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                studentType === 'HOSTELER' && styles.typeOptionSelected,
              ]}
              onPress={() => setStudentType('HOSTELER')}
            >
              <Text style={styles.typeOptionIcon}>🛏️</Text>
              <Text
                style={[
                  styles.typeOptionTitle,
                  studentType === 'HOSTELER' && styles.typeOptionTitleSelected,
                ]}
              >
                Hosteler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                studentType === 'DAY_SCHOLAR' && styles.typeOptionSelected,
              ]}
              onPress={() => setStudentType('DAY_SCHOLAR')}
            >
              <Text style={styles.typeOptionIcon}>🚌</Text>
              <Text
                style={[
                  styles.typeOptionTitle,
                  studentType === 'DAY_SCHOLAR' && styles.typeOptionTitleSelected,
                ]}
              >
                Day Scholar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper info text */}
          <View style={styles.infoPill}>
            <Text style={styles.infoPillText}>
              {studentType === 'HOSTELER'
                ? '✅ Eligible for hostel room & bed allocation, hostel leave, and guest passes.'
                : 'ℹ️ Campus commuter. You can view campus notices and mess menus, but cannot be assigned a hostel room.'}
            </Text>
          </View>
        </View>

        {/* 2. Personal & Account Details */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>2. Personal & Account Details</Text>

          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.xs }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Aman"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Sharma"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institutional Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="aman.sharma@hostelhub.edu"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password * (Min 8 chars, 1 uppercase, 1 number)</Text>
            <TextInput
              style={styles.input}
              placeholder="Secure password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Student Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9876543210"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* 3. Academic Information */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>3. Academic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Roll / Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2024CS042"
              placeholderTextColor={colors.textMuted}
              value={rollNumber}
              onChangeText={setRollNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: spacing.xs }]}>
              <Text style={styles.label}>Department / Major *</Text>
              <TextInput
                style={styles.input}
                placeholder="Computer Science"
                placeholderTextColor={colors.textMuted}
                value={department}
                onChangeText={setDepartment}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={styles.label}>Year (1-5) *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={yearOfStudy}
                onChangeText={setYearOfStudy}
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
          </View>
        </View>

        {/* 4. Guardian / Emergency Contact */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>4. Guardian & Emergency Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Guardian / Parent Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rajesh Sharma"
              placeholderTextColor={colors.textMuted}
              value={guardianName}
              onChangeText={setGuardianName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Guardian Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9876543211"
              placeholderTextColor={colors.textMuted}
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Create Student Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
    paddingTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark,
  },
  typeOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeOptionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeOptionTitleSelected: {
    color: colors.white,
  },
  infoPill: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  infoPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  nameRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.white,
  },
  bottomPadding: {
    height: 40,
  },
});
