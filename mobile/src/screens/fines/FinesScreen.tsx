import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { Fine, FineStatus } from '../../types';

interface FinesScreenProps {
  onBack: () => void;
}

export const FinesScreen: React.FC<FinesScreenProps> = ({ onBack }) => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | FineStatus>('ALL');

  useEffect(() => {
    loadFines();
  }, [statusFilter]);

  const loadFines = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === 'ALL'
          ? '/fines/my-fines'
          : `/fines/my-fines?status=${statusFilter}`;
      const res = await apiClient.get(url);
      if (res.data?.data) {
        setFines(res.data.data);
      }
    } catch (error) {
      console.log('Error loading fines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFines();
  };

  // Metrics summary
  const unpaidTotal = fines
    .filter((f) => f.status === 'UNPAID')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const paidTotal = fines
    .filter((f) => f.status === 'PAID')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Fines & Dues</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadFines}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Highlights */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, shadows.card]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Outstanding Dues</Text>
            <Text style={[styles.summaryValue, { color: unpaidTotal > 0 ? colors.danger : colors.success }]}>
              ₹{unpaidTotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Settled</Text>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>
              ₹{paidTotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['ALL', 'UNPAID', 'PAID'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.tabActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.tabTextActive]}>
              {tab === 'ALL' ? 'All Fines' : tab}
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
        {/* Notice Info */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            ℹ️ Fine dues must be settled in person at the Warden Office. Once paid, the Warden records the payment and marks the status as PAID.
          </Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : fines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>No Fines on Record</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'ALL'
                ? 'You have zero disciplinary fines recorded on your student account.'
                : `You have no fines with status "${statusFilter}".`}
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
                <View style={styles.fineHeader}>
                  <View>
                    <Text style={styles.fineAmount}>₹{Number(fine.amount).toFixed(2)}</Text>
                    <Text style={styles.assignedDate}>Issued on {assignedDate}</Text>
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
                        {
                          color: fine.status === 'PAID' ? colors.success : colors.danger,
                        },
                      ]}
                    >
                      {fine.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason / Violation:</Text>
                  <Text style={styles.reasonText}>{fine.reason}</Text>
                </View>

                <View style={styles.fineFooter}>
                  {fine.status === 'PAID' && paidDate ? (
                    <Text style={styles.paidInfoText}>✅ Settled on {paidDate}</Text>
                  ) : (
                    <Text style={styles.unpaidInfoText}>⚠️ Pending settlement at Warden Office</Text>
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
  refreshBtn: {
    padding: spacing.xs,
    width: 32,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '600',
  },
  summaryContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: typography.h2.fontSize,
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
  infoBanner: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  infoBannerText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
  },
  fineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
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
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reasonBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  reasonLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: 2,
  },
  reasonText: {
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: 20,
  },
  fineFooter: {
    paddingTop: spacing.xs,
  },
  paidInfoText: {
    color: colors.success,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  unpaidInfoText: {
    color: colors.warning,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
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
