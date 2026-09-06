import React, { useState, useEffect } from 'react';
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
import { GuestRequest, MealType } from '../../types';

interface Props {
  onBack: () => void;
}

export const GuestRequestScreen: React.FC<Props> = ({ onBack }) => {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form inputs
  const todayStr = new Date().toISOString().slice(0, 10);
  const [guestName, setGuestName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [visitDate, setVisitDate] = useState(todayStr);
  const [requestedMeal, setRequestedMeal] = useState<MealType>('NONE');
  const [numberOfGuests, setNumberOfGuests] = useState('1');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/guest-requests/my-requests');
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.log('Error loading guest requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!guestName.trim() || !relationship.trim() || !visitDate.trim() || !reason.trim()) {
      Alert.alert('Missing Info', 'Please fill in all guest details and reason.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/guest-requests', {
        guestName: guestName.trim(),
        relationship: relationship.trim(),
        visitDate: visitDate.trim(),
        requestedMeal,
        numberOfGuests: parseInt(numberOfGuests, 10) || 1,
        reason: reason.trim(),
      });
      Alert.alert('Success', 'Guest visit request submitted successfully.');
      setShowForm(false);
      setGuestName('');
      setRelationship('');
      setReason('');
      loadRequests();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit guest request.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'APPROVED') return colors.success;
    if (status === 'REJECTED') return colors.danger;
    return colors.warning;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guest Requests</Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setShowForm((prev) => !prev)}
        >
          <Text style={styles.toggleBtnText}>{showForm ? 'View List' : '+ Request'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Guest Pass Request</Text>

            <Text style={styles.fieldLabel}>Guest Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.textMuted}
              value={guestName}
              onChangeText={setGuestName}
            />

            <Text style={styles.fieldLabel}>Relationship to Student</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Father, Mother, Friend"
              placeholderTextColor={colors.textMuted}
              value={relationship}
              onChangeText={setRelationship}
            />

            <Text style={styles.fieldLabel}>Visit Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={visitDate}
              onChangeText={setVisitDate}
            />

            <Text style={styles.fieldLabel}>Number of Guests (1 - 5)</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={numberOfGuests}
              onChangeText={setNumberOfGuests}
            />

            <Text style={styles.fieldLabel}>Guest Dining / Meal Request</Text>
            <View style={styles.mealOptionsRow}>
              {(['NONE', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as MealType[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealChip, requestedMeal === m && styles.mealChipActive]}
                  onPress={() => setRequestedMeal(m)}
                >
                  <Text style={[styles.mealChipText, requestedMeal === m && styles.mealChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Reason for Visit</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Purpose of visit"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Guest Request</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Submitted Guest Requests</Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : requests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No guest requests submitted yet.</Text>
              </View>
            ) : (
              requests.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.guestNameText}>👤 {r.guestName}</Text>
                    <Text style={[styles.statusBadge, { color: getStatusColor(r.status) }]}>
                      {r.status}
                    </Text>
                  </View>

                  <Text style={styles.metaText}>
                    Relationship: {r.relationship} • Guests: {r.numberOfGuests}
                  </Text>
                  <Text style={styles.metaText}>
                    Visit Date: {new Date(r.visitDate).toLocaleDateString()} • Meal: {r.requestedMeal}
                  </Text>
                  <Text style={styles.reasonText}>Reason: {r.reason}</Text>

                  {r.passNumber ? (
                    <View style={styles.passBox}>
                      <Text style={styles.passLabel}>Issued Pass Number:</Text>
                      <Text style={styles.passValue}>{r.passNumber}</Text>
                    </View>
                  ) : null}

                  {r.remarks ? (
                    <Text style={styles.remarksText}>Remarks: {r.remarks}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
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
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  toggleBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  toggleBtnText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
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
    height: 70,
    textAlignVertical: 'top',
  },
  mealOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mealChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mealChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mealChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  guestNameText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    ...typography.caption,
    fontWeight: '700',
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  passBox: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  passValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
  },
  remarksText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: 4,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
});
