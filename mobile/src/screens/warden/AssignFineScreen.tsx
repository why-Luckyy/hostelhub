import React, { useState, useEffect } from 'react';
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

interface AssignFineScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface StudentOption {
  id: string; // studentProfileId
  rollNumber: string;
  name: string;
}

const COMMON_REASONS = [
  'Late entry into hostel after curfew hours',
  'Unauthorized use of heavy electrical appliances (heater/iron)',
  'Hostel room / common area property damage',
  'Noise violation during silent study hours',
  'Failure to return mess utensils / plates',
];

const PRESET_AMOUNTS = [100, 250, 500, 1000];

export const AssignFineScreen: React.FC<AssignFineScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const [studentProfileId, setStudentProfileId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await apiClient.get('/allocations?isActive=true');
      if (res.data?.data) {
        const uniqueStudents: { [id: string]: StudentOption } = {};
        res.data.data.forEach((alloc: any) => {
          if (alloc.studentProfile?.id) {
            uniqueStudents[alloc.studentProfile.id] = {
              id: alloc.studentProfile.id,
              rollNumber: alloc.studentProfile.rollNumber,
              name: `${alloc.studentProfile.firstName} ${alloc.studentProfile.lastName}`,
            };
          }
        });
        setStudents(Object.values(uniqueStudents));
      }
    } catch (err) {
      console.log('Notice loading allocated students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectStudent = (s: StudentOption) => {
    setStudentProfileId(s.id);
  };

  const handleSubmit = async () => {
    if (!studentProfileId.trim()) {
      Alert.alert('Validation Error', 'Please select or enter a valid Student Profile ID.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid fine amount greater than ₹0.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Validation Error', 'Reason must be at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/fines', {
        studentProfileId: studentProfileId.trim(),
        amount: numericAmount,
        reason: reason.trim(),
      });

      Alert.alert(
        'Fine Issued',
        `Disciplinary fine of ₹${numericAmount.toFixed(2)} has been recorded on the student's record and status is UNPAID.`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to issue fine.';
      Alert.alert('Issue Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === studentProfileId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Fine</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Student Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Select Student Resident *</Text>
          {loadingStudents ? (
            <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 10 }} />
          ) : students.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.studentsRow}
            >
              {students.map((s) => {
                const isSelected = s.id === studentProfileId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.studentChip, isSelected && styles.studentChipActive]}
                    onPress={() => handleSelectStudent(s)}
                  >
                    <Text style={[styles.studentChipName, isSelected && styles.studentChipNameActive]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.studentChipRoll, isSelected && styles.studentChipRollActive]}>
                      {s.rollNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Direct Student Profile ID input */}
          <Text style={[styles.subLabel, { marginTop: spacing.xs }]}>
            Or specify Student Profile ID directly:
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)"
            placeholderTextColor={colors.textMuted}
            value={studentProfileId}
            onChangeText={setStudentProfileId}
            autoCapitalize="none"
          />
          {selectedStudent && (
            <Text style={styles.selectedStudentNotice}>
              Selected: {selectedStudent.name} ({selectedStudent.rollNumber})
            </Text>
          )}
        </View>

        {/* Fine Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Fine Amount (₹ INR) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 500"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <View style={styles.presetRow}>
            {PRESET_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.presetChip, amount === String(amt) && styles.presetChipActive]}
                onPress={() => setAmount(String(amt))}
              >
                <Text style={[styles.presetText, amount === String(amt) && styles.presetTextActive]}>
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reason / Violation */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Reason for Disciplinary Fine *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the disciplinary infraction in detail..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            maxLength={500}
          />
          <Text style={styles.subLabel}>Common infractions (tap to apply):</Text>
          <View style={styles.commonReasonsCol}>
            {COMMON_REASONS.map((r, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.reasonOption}
                onPress={() => setReason(r)}
              >
                <Text style={styles.reasonOptionText}>• {r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Assign Fine to Student</Text>
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
  subLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  studentsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  studentChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  studentChipName: {
    color: colors.text,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  studentChipNameActive: {
    color: colors.white,
  },
  studentChipRoll: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  studentChipRollActive: {
    color: colors.white,
    opacity: 0.8,
  },
  selectedStudentNotice: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginTop: 2,
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
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  presetChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  presetTextActive: {
    color: colors.white,
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
    minHeight: 100,
  },
  commonReasonsCol: {
    gap: 4,
    marginTop: 4,
  },
  reasonOption: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  reasonOptionText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.danger,
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
