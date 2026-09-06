import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { Fine, FineStatus } from '../../types';

interface FineManagementScreenProps {
  onBack: () => void;
  onNavigateAssign: () => void;
}

export const FineManagementScreen: React.FC<FineManagementScreenProps> = ({
  onBack,
  onNavigateAssign,
}) => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | FineStatus>('UNPAID');
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    loadFines();
  }, [statusFilter]);

  const loadFines = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === 'ALL'
          ? '/fines'
          : `/fines?status=${statusFilter}`;
      const res = await apiClient.get(url);
      if (res.data?.data) {
        setFines(res.data.data);
      }
    } catch (error) {
      console.log('Error loading warden fines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFines();
  };

  const handleMarkAsPaid = (fine: Fine) => {
    if (fine.status === 'PAID') {
      Alert.alert('Notice', 'This fine is already recorded as PAID.');
      return;
    }

    const studentName = fine.studentProfile
      ? `${fine.studentProfile.firstName} ${fine.studentProfile.lastName} (${fine.studentProfile.rollNumber})`
      : 'Student';

    Alert.alert(
      'Confirm Settlement',
      `Record payment of ₹${Number(fine.amount).toFixed(2)} received from ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Paid',
          style: 'default',
          onPress: async () => {
            setMarkingId(fine.id);
            try {
              await apiClient.patch(`/fines/${fine.id}/status`, {
                status: 'PAID',
              });
              Alert.alert('Payment Recorded', 'Fine has been marked as PAID.');
              loadFines();
            } catch (err: any) {
              Alert.alert('Update Error', err?.response?.data?.message || 'Failed to update fine status.');
            } finally {
              setMarkingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fine Records</Text>
        <TouchableOpacity style={styles.assignButton} onPress={onNavigateAssign}>
          <Text style={styles.assignButtonText}>+ Issue</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['UNPAID', 'PAID', 'ALL'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.tabActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.tabTextActive]}>
              {tab === 'UNPAID' ? '⚠️ Unpaid Dues' : tab === 'PAID' ? '✅ Paid / Cleared' : 'All Records'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fines List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : fines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>No Fines Found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'UNPAID'
                ? 'There are no unpaid student fines on record.'
                : `No fines found matching filter "${statusFilter}".`}
            </Text>
          </View>
        ) : (
          fines.map((fine) => {
            const assignedDate = new Date(fine.assignedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const paidDate = fine.paidAt
              ? new Date(fine.paidAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;

            return (
              <View key={fine.id} style={[styles.fineCard, shadows.card]}>
                {/* Header row: amount + status badge */}
                <View style={styles.fineHeaderRow}>
                  <View>
                    <Text style={styles.fineAmount}>₹{Number(fine.amount).toFixed(2)}</Text>
                    <Text style={styles.assignedDate}>Issued: {assignedDate}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          fine.status === 'PAID' ? `${colors.success}22` : `${colors.danger}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: fine.status === 'PAID' ? colors.success : colors.danger },
                      ]}
                    >
                      {fine.status}
                    </Text>
                  </View>
                </View>

                {/* Student Info */}
                {fine.studentProfile && (
                  <View style={styles.studentInfoBox}>
                    <Text style={styles.studentInfoText}>
                      👤 {fine.studentProfile.firstName} {fine.studentProfile.lastName} ({fine.studentProfile.rollNumber})
                    </Text>
                    <Text style={styles.studentSubtext}>
                      Dept: {fine.studentProfile.department}
                    </Text>
                  </View>
                )}

                {/* Violation Reason */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Disciplinary Reason:</Text>
                  <Text style={styles.reasonText}>{fine.reason}</Text>
                </View>

                {/* Footer and Actions */}
                <View style={styles.footerRow}>
                  {fine.status === 'PAID' && paidDate ? (
                    <Text style={styles.settledText}>✅ Payment settled on {paidDate}</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => handleMarkAsPaid(fine)}
                      disabled={markingId === fine.id}
                    >
                      {markingId === fine.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.markPaidBtnText}>✓ Mark as Paid</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
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
  assignButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  assignButtonText: {
    color: colors.white,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  fineAmount: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
  },
  assignedDate: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  studentInfoBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  studentInfoText: {
    color: colors.text,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  studentSubtext: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  reasonBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  reasonLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: 2,
  },
  reasonText: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: 20,
  },
  footerRow: {
    paddingTop: spacing.xs,
    alignItems: 'flex-end',
  },
  settledText: {
    color: colors.success,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  markPaidBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  markPaidBtnText: {
    color: colors.white,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    textAlign: 'center',
    lineHeight: 20,
  },
});
