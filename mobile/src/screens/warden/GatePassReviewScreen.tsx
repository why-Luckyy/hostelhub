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
import { LeaveRequest } from '../../types';

interface Props {
  onBack: () => void;
}

export const GatePassReviewScreen: React.FC<Props> = ({ onBack }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [remarksMap, setRemarksMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/leave-requests?status=PENDING');
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.log('Error loading pending leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const remarks = remarksMap[id] || '';
    if (status === 'REJECTED' && !remarks.trim()) {
      Alert.alert('Remarks Required', 'Please provide a reason or remarks when rejecting a gate-pass request.');
      return;
    }

    setReviewingId(id);
    try {
      await apiClient.patch(`/leave-requests/${id}/review`, {
        status,
        remarks: remarks.trim() || undefined,
      });
      Alert.alert('Reviewed', `Gate-pass request has been ${status.toLowerCase()}.`);
      loadPending();
    } catch (err: any) {
      Alert.alert('Review Error', err.response?.data?.message || 'Failed to review request.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Gate Passes</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadPending}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtext}>There are currently no pending gate-pass or leave requests to review.</Text>
          </View>
        ) : (
          requests.map((r) => {
            const startStr = new Date(r.startDate).toLocaleDateString();
            const endStr = new Date(r.endDate).toLocaleDateString();

            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.studentName}>
                    {r.studentProfile?.firstName} {r.studentProfile?.lastName}
                  </Text>
                  <Text style={styles.rollBadge}>{r.studentProfile?.rollNumber}</Text>
                </View>

                <Text style={styles.destinationText}>📍 Destination: {r.destination}</Text>
                <Text style={styles.dateText}>📅 Dates: {startStr} — {endStr}</Text>
                <Text style={styles.contactText}>📞 Emergency Contact: {r.emergencyContact}</Text>
                <Text style={styles.reasonText}>Reason: {r.reason}</Text>

                {/* Remarks Input */}
                <Text style={styles.remarkLabel}>Warden Remarks / Decision Notes:</Text>
                <TextInput
                  style={styles.remarkInput}
                  placeholder="Optional for approval; required for rejection"
                  placeholderTextColor={colors.textMuted}
                  value={remarksMap[r.id] || ''}
                  onChangeText={(val) => setRemarksMap({ ...remarksMap, [r.id]: val })}
                />

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleReview(r.id, 'APPROVED')}
                    disabled={reviewingId === r.id}
                  >
                    {reviewingId === r.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve Gate Pass</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReview(r.id, 'REJECTED')}
                    disabled={reviewingId === r.id}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  refreshBtn: {
    paddingVertical: spacing.xs,
  },
  refreshBtnText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  studentName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  rollBadge: {
    ...typography.caption,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  destinationText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contactText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.text,
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  remarkLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  remarkInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  approveBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  rejectBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  rejectBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
});
