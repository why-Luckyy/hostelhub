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
import { Notice, NoticeCategory, AudienceType } from '../../types';

interface CreateEditNoticeScreenProps {
  initialNotice?: Notice | null;
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORIES: NoticeCategory[] = ['GENERAL', 'HOSTEL', 'MESS', 'URGENT', 'EVENT'];
const AUDIENCES: Array<{ key: AudienceType; label: string }> = [
  { key: 'ALL', label: 'All Students' },
  { key: 'HOSTELERS', label: 'Hostelers Only' },
  { key: 'DAY_SCHOLARS', label: 'Day Scholars Only' },
];

export const CreateEditNoticeScreen: React.FC<CreateEditNoticeScreenProps> = ({
  initialNotice,
  onBack,
  onSuccess,
}) => {
  const isEditing = !!initialNotice;

  const [title, setTitle] = useState(initialNotice?.title || '');
  const [content, setContent] = useState(initialNotice?.content || '');
  const [category, setCategory] = useState<NoticeCategory>(
    initialNotice?.category || 'GENERAL'
  );
  const [targetAudience, setTargetAudience] = useState<AudienceType>(
    initialNotice?.targetAudience || 'ALL'
  );
  const [isPinned, setIsPinned] = useState<boolean>(initialNotice?.isPinned || false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Validation Error', 'Title must be at least 3 characters.');
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      Alert.alert('Validation Error', 'Content must be at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && initialNotice) {
        await apiClient.put(`/notices/${initialNotice.id}`, {
          title: title.trim(),
          content: content.trim(),
          category,
          targetAudience,
          isPinned,
        });
        Alert.alert('Notice Updated', 'The notice has been updated successfully.', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        await apiClient.post('/notices', {
          title: title.trim(),
          content: content.trim(),
          category,
          targetAudience,
          isPinned,
        });
        Alert.alert('Notice Published', 'The announcement is now visible to students.', [
          { text: 'OK', onPress: onSuccess },
        ]);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save notice.';
      Alert.alert('Save Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Notice' : 'Publish Notice'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notice Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notice Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Annual Hostel Maintenance & Inspection"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Audience */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Target Audience</Text>
          <View style={styles.chipsRow}>
            {AUDIENCES.map((aud) => (
              <TouchableOpacity
                key={aud.key}
                style={[styles.chip, targetAudience === aud.key && styles.chipActive]}
                onPress={() => setTargetAudience(aud.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    targetAudience === aud.key && styles.chipTextActive,
                  ]}
                >
                  {aud.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pin Announcement Toggle */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Priority Pinning</Text>
          <TouchableOpacity
            style={[styles.pinToggle, isPinned && styles.pinToggleActive]}
            onPress={() => setIsPinned(!isPinned)}
          >
            <Text style={styles.pinToggleIcon}>{isPinned ? '📌' : '⚪'}</Text>
            <View style={styles.pinToggleTextCol}>
              <Text style={styles.pinToggleTitle}>
                {isPinned ? 'Pinned to top of student feed' : 'Regular Announcement'}
              </Text>
              <Text style={styles.pinToggleDesc}>
                Pinned notices appear at the very top with highlighted accent border.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notice Content *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter the full text of the announcement for students..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
            maxLength={5000}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Save Changes' : 'Publish Announcement'}
            </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backButtonText: {
    color: colors.primaryLight,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    padding: spacing.md,
    fontSize: typography.bodyMedium.fontSize,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinToggleActive: {
    borderColor: colors.accent,
    backgroundColor: '#162238',
  },
  pinToggleIcon: {
    fontSize: 24,
  },
  pinToggleTextCol: {
    flex: 1,
  },
  pinToggleTitle: {
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '700',
  },
  pinToggleDesc: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    padding: spacing.md,
    fontSize: typography.bodyMedium.fontSize,
    textAlignVertical: 'top',
    minHeight: 140,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
  },
});
