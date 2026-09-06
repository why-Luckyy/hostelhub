import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { LeaveRequest } from '../../types';

interface Props {
  onNavigateApply: () => void;
  onBack: () => void;
}

export const GatePassScreen: React.FC<Props> = ({ onNavigateApply, onBack }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/leave-requests/my-requests');
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err: any) {
      console.log('Error loading leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Gate Pass', 'Are you sure you want to cancel this pending gate-pass request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(id);
          try {
            await apiClient.post(`/leave-requests/${id}/cancel`);
            Alert.alert('Cancelled', 'Gate pass request cancelled.');
            loadRequests();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to cancel request.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { color: colors.success, bg: colors.successLight };
      case 'REJECTED':
        return { color: colors.danger, bg: colors.dangerLight };
      case 'CANCELLED':
        return { color: colors.textMuted, bg: colors.surfaceLight };
      default:
        return { color: colors.warning, bg: colors.warningLight };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Gate Passes</Text>
        <TouchableOpacity style={styles.applyButton} onPress={onNavigateApply}>
          <Text style={styles.applyButtonText}>+ Apply</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyText}>No gate-pass or leave requests found.</Text>
              <TouchableOpacity style={styles.applyPromptBtn} onPress={onNavigateApply}>
                <Text style={styles.applyPromptBtnText}>Submit New Gate Pass</Text>
              </TouchableOpacity>
            </View>
          ) : (
            requests.map((item) => {
              const badge = getStatusBadge(item.status);
              const startDateStr = new Date(item.startDate).toLocaleDateString();
              const endDateStr = new Date(item.endDate).toLocaleDateString();

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.destinationText}>📍 {item.destination}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.dateRangeText}>
                    📅 {startDateStr} — {endDateStr}
                  </Text>
                  <Text style={styles.reasonText} numberOfLines={2}>
                    Reason: {item.reason}
                  </Text>
                  <Text style={styles.contactText}>
                    Emergency Contact: {item.emergencyContact}
                  </Text>

                  {item.remarks ? (
                    <View style={styles.remarksBox}>
                      <Text style={styles.remarksLabel}>Warden Remarks:</Text>
                      <Text style={styles.remarksValue}>{item.remarks}</Text>
                    </View>
                  ) : null}

                  {item.status === 'PENDING' ? (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                    >
                      {cancellingId === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Text style={styles.cancelBtnText}>Cancel Request</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: spacing.sm,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  applyButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  applyPromptBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  applyPromptBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  destinationText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  dateRangeText: {
    ...typography.bodySmall,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  remarksBox: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
  },
  remarksLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  remarksValue: {
    ...typography.bodySmall,
    color: colors.text,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
});
