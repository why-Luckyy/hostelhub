import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { ComplaintCategory, ComplaintPriority } from '../../types';

interface CreateComplaintScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORIES: Array<{ key: ComplaintCategory; label: string; icon: string }> = [
  { key: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { key: 'PLUMBING', label: 'Plumbing', icon: '🚰' },
  { key: 'CARPENTRY', label: 'Carpentry', icon: '🔨' },
  { key: 'CLEANLINESS', label: 'Cleanliness', icon: '🧹' },
  { key: 'INTERNET', label: 'Internet / Wi-Fi', icon: '📶' },
  { key: 'MESS', label: 'Mess & Food', icon: '🍽️' },
  { key: 'OTHER', label: 'Other Issue', icon: '📝' },
];

const PRIORITIES: Array<{ key: ComplaintPriority; label: string; color: string }> = [
  { key: 'LOW', label: 'Low', color: colors.textSecondary },
  { key: 'MEDIUM', label: 'Medium', color: colors.accent },
  { key: 'HIGH', label: 'High', color: colors.warning },
  { key: 'URGENT', label: 'Urgent', color: colors.danger },
];

export const CreateComplaintScreen: React.FC<CreateComplaintScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('ELECTRICAL');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please provide a brief title for your complaint.');
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert('Validation Error', 'Title must be at least 3 characters.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please describe the issue in detail.');
      return;
    }
    if (description.trim().length < 5) {
      Alert.alert('Validation Error', 'Description must be at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/complaints', {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      });

      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted to the Warden office. Status is PENDING.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to submit complaint. Please try again.';
      Alert.alert('Submission Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File a Complaint</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryCard,
                category === cat.key && styles.categoryCardSelected,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={styles.categoryCardIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryCardLabel,
                  category === cat.key && styles.categoryCardLabelSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Priority Level</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.priorityPill,
                priority === p.key && {
                  backgroundColor: `${p.color}30`,
                  borderColor: p.color,
                },
              ]}
              onPress={() => setPriority(p.key)}
            >
              <Text
                style={[
                  styles.priorityPillText,
                  priority === p.key && { color: p.color, fontWeight: '700' },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Issue Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Tube light flickering in room 204"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />

        <Text style={styles.sectionHeader}>Detailed Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the problem, when it started, and any specific details for the maintenance team..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Complaint (PENDING)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCardSelected: {
    backgroundColor: `${colors.primary}25`,
    borderColor: colors.primaryLight,
  },
  categoryCardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryCardLabelSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...typography.bodyMedium,
  },
  textArea: {
    minHeight: 110,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '700',
  },
});
