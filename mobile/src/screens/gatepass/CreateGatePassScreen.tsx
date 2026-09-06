import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';
import { apiClient } from '../../api/client';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export const CreateGatePassScreen: React.FC<Props> = ({ onSuccess, onBack }) => {
  // Default start to today, end to tomorrow
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(now.toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(tomorrow.toISOString().slice(0, 16));
  const [destination, setDestination] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!destination.trim() || !emergencyContact.trim() || !reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in destination, emergency contact, and reason.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Invalid Date', 'Please enter valid ISO date-time strings (YYYY-MM-DDTHH:mm).');
      return;
    }

    if (end <= start) {
      Alert.alert('Date Range Error', 'End date must be strictly after start date.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/leave-requests', {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        destination: destination.trim(),
        emergencyContact: emergencyContact.trim(),
        reason: reason.trim(),
      });
      Alert.alert('Success', 'Gate-pass request submitted successfully for Warden review!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit gate-pass request.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply Gate Pass</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Destination / Travel Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Home, City Central Library"
            placeholderTextColor={colors.textMuted}
            value={destination}
            onChangeText={setDestination}
          />

          <Text style={styles.fieldLabel}>Start Date & Time (ISO format)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={colors.textMuted}
            value={startDate}
            onChangeText={setStartDate}
          />

          <Text style={styles.fieldLabel}>End Date & Time (Expected Return)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={colors.textMuted}
            value={endDate}
            onChangeText={setEndDate}
          />

          <Text style={styles.fieldLabel}>Emergency Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +919876543210"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />

          <Text style={styles.fieldLabel}>Reason for Gate Pass</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="State the purpose of your leave or gate pass request"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Gate Pass Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '700',
  },
});
