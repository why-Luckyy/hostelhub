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
import { Complaint, ComplaintStatus } from '../../types';

interface ComplaintsScreenProps {
  onBack: () => void;
  onNavigateCreate: () => void;
}

export const ComplaintsScreen: React.FC<ComplaintsScreenProps> = ({
  onBack,
  onNavigateCreate,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | ComplaintStatus>('ALL');

  useEffect(() => {
    loadComplaints();
  }, [activeFilter]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const url =
        activeFilter === 'ALL'
          ? '/complaints/my-complaints'
          : `/complaints/my-complaints?status=${activeFilter}`;
      const res = await apiClient.get(url);
      if (res.data?.data) {
        setComplaints(res.data.data);
      }
    } catch (error) {
      console.log('Error loading complaints:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ELECTRICAL':
        return '⚡';
      case 'PLUMBING':
        return '🚰';
      case 'CARPENTRY':
        return '🔨';
      case 'CLEANLINESS':
        return '🧹';
      case 'INTERNET':
        return '📶';
      case 'MESS':
        return '🍽️';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    return status === 'SOLVED' ? colors.success : colors.warning;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <TouchableOpacity style={styles.newButton} onPress={onNavigateCreate}>
          <Text style={styles.newButtonText}>+ Raise</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabRow}>
        {(['ALL', 'PENDING', 'SOLVED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeFilter === tab && styles.tabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.tabText, activeFilter === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadComplaints();
            }}
            tintColor={colors.primaryLight}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading complaints...</Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No complaints found</Text>
            <Text style={styles.emptyDesc}>
              {activeFilter === 'ALL'
                ? "You have not submitted any complaints yet. Use the '+ Raise' button to file an issue."
                : `No complaints with status "${activeFilter}".`}
            </Text>
          </View>
        ) : (
          complaints.map((c) => (
            <View key={c.id} style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryIcon}>{getCategoryIcon(c.category)}</Text>
                  <Text style={styles.categoryText}>{c.category}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: `${getStatusColor(c.status)}20`,
                      borderColor: getStatusColor(c.status),
                    },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(c.status) }]}>
                    ● {c.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.complaintTitle}>{c.title}</Text>
              <Text style={styles.complaintDesc}>{c.description}</Text>

              {c.status === 'SOLVED' && c.resolutionNotes ? (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>✓ Warden Resolution Notes:</Text>
                  <Text style={styles.resolutionText}>{c.resolutionNotes}</Text>
                  {c.resolvedAt ? (
                    <Text style={styles.resolvedDate}>
                      Resolved on: {new Date(c.resolvedAt).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>Priority: {c.priority}</Text>
                <Text style={styles.metaText}>
                  Filed: {new Date(c.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
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
  newButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  newButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentLight,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  complaintTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  complaintDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  resolutionBox: {
    backgroundColor: `${colors.success}15`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    marginBottom: spacing.sm,
  },
  resolutionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  resolutionText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 18,
  },
  resolvedDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
