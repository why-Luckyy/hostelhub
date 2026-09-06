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
import { GuestRequest } from '../../types';

interface Props {
  onBack: () => void;
}

export const GuestReviewScreen: React.FC<Props> = ({ onBack }) => {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [remarksMap, setRemarksMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/guest-requests?status=PENDING');
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.log('Error loading pending guest requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const remarks = remarksMap[id] || '';
    if (status === 'REJECTED' && !remarks.trim()) {
      Alert.alert('Remarks Required', 'Please provide a reason or remarks when rejecting a guest visit request.');
      return;
    }

    setReviewingId(id);
    try {
      const res = await apiClient.patch(`/guest-requests/${id}/review`, {
        status,
        remarks: remarks.trim() || undefined,
      });
      const passCode = res.data?.data?.pass?.passCode;
      const alertMsg =
        status === 'APPROVED'
          ? `Guest request approved! Pass code ${passCode || ''} has been generated.`
          : 'Guest request rejected.';
      Alert.alert('Success', alertMsg);
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
        <Text style={styles.headerTitle}>Review Guest Requests</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadPending}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>No Pending Visitor Requests</Text>
            <Text style={styles.emptySubtext}>All submitted student guest requests have been reviewed.</Text>
          </View>
        ) : (
          requests.map((r) => {
            const visitDateStr = new Date(r.visitDate).toLocaleDateString();

            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.guestName}>Visitor: {r.guestName}</Text>
                  <Text style={styles.relationBadge}>{r.relationship}</Text>
                </View>

                <Text style={styles.studentHostText}>
                  Host Student: {r.hostStudent?.firstName} {r.hostStudent?.lastName} ({r.hostStudent?.rollNumber})
                </Text>
                <Text style={styles.metaText}>📅 Visit Date: {visitDateStr} • Guests: {r.numberOfGuests}</Text>
                <Text style={styles.metaText}>🍽️ Meal Option: {r.requestedMeal}</Text>
                <Text style={styles.reasonText}>Purpose: {r.reason}</Text>

                {/* Remarks Input */}
                <Text style={styles.remarkLabel}>Warden Remarks / Access Instructions:</Text>
                <TextInput
                  style={styles.remarkInput}
                  placeholder="Optional remarks"
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
                      <Text style={styles.approveBtnText}>Approve & Issue Pass</Text>
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
  guestName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  relationBadge: {
    ...typography.caption,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  studentHostText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 2,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.text,
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  remarkLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 2,
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
