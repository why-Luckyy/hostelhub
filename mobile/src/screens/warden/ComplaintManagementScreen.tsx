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
  Modal,
  RefreshControl,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { Complaint, ComplaintStatus } from '../../types';

interface ComplaintManagementScreenProps {
  onBack: () => void;
}

export const ComplaintManagementScreen: React.FC<ComplaintManagementScreenProps> = ({
  onBack,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus>('PENDING');

  // Modal state for resolving complaint
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === 'ALL'
          ? '/complaints'
          : `/complaints?status=${statusFilter}`;
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

  const onRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  const openResolveModal = (complaint: Complaint) => {
    if (complaint.status === 'SOLVED') {
      Alert.alert('Notice', 'This complaint has already been solved and cannot be modified.');
      return;
    }
    setSelectedComplaint(complaint);
    setResolutionNotes('');
  };

  const handleResolveSubmit = async () => {
    if (!selectedComplaint) return;
    setResolving(true);
    try {
      await apiClient.patch(`/complaints/${selectedComplaint.id}/resolve`, {
        resolutionNotes: resolutionNotes.trim() || undefined,
      });

      Alert.alert('Success', 'Complaint has been marked as SOLVED.');
      setSelectedComplaint(null);
      setResolutionNotes('');
      loadComplaints();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to resolve complaint.';
      Alert.alert('Resolution Error', msg);
    } finally {
      setResolving(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return colors.danger;
      case 'HIGH':
        return colors.warning;
      case 'MEDIUM':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaint Management</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadComplaints}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['PENDING', 'SOLVED', 'ALL'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.tabActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.tabTextActive]}>
              {tab === 'PENDING' ? '⏳ Pending' : tab === 'SOLVED' ? '✅ Solved' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Complaints List */}
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
        ) : complaints.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>No Complaints Found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'PENDING'
                ? 'Great news! There are no pending complaints requiring warden review.'
                : `No complaints found with filter "${statusFilter}".`}
            </Text>
          </View>
        ) : (
          complaints.map((c) => {
            const dateStr = new Date(c.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const resolvedDate = c.resolvedAt
              ? new Date(c.resolvedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;

            return (
              <View key={c.id} style={[styles.complaintCard, shadows.card]}>
                {/* Meta Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.categoryContainer}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(c.category)}</Text>
                    <Text style={styles.categoryText}>{c.category}</Text>
                  </View>

                  <View style={styles.badgeGroup}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { borderColor: getPriorityColor(c.priority) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(c.priority) },
                        ]}
                      >
                        {c.priority}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            c.status === 'SOLVED'
                              ? `${colors.success}22`
                              : `${colors.warning}22`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              c.status === 'SOLVED'
                                ? colors.success
                                : colors.warning,
                          },
                        ]}
                      >
                        {c.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Student Info Box */}
                {c.studentProfile && (
                  <View style={styles.studentInfoBox}>
                    <Text style={styles.studentInfoText}>
                      👤 {c.studentProfile.firstName} {c.studentProfile.lastName} ({c.studentProfile.rollNumber}) • {c.studentProfile.department}
                    </Text>
                  </View>
                )}

                {/* Complaint Title & Description */}
                <Text style={styles.complaintTitle}>{c.title}</Text>
                <Text style={styles.complaintDesc}>{c.description}</Text>

                {/* Resolution Details if Solved */}
                {c.status === 'SOLVED' && (
                  <View style={styles.resolvedInfoBox}>
                    <Text style={styles.resolvedInfoTitle}>
                      ✅ Solved {resolvedDate ? `on ${resolvedDate}` : ''}
                    </Text>
                    {c.resolutionNotes && (
                      <Text style={styles.resolvedNotesText}>
                        Notes: "{c.resolutionNotes}"
                      </Text>
                    )}
                  </View>
                )}

                {/* Footer and Actions */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.dateText}>Reported on {dateStr}</Text>

                  {c.status === 'PENDING' && (
                    <TouchableOpacity
                      style={styles.solveButton}
                      onPress={() => openResolveModal(c)}
                    >
                      <Text style={styles.solveButtonText}>✓ Mark Solved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Resolve Modal */}
      <Modal
        visible={!!selectedComplaint}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedComplaint(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadows.modal]}>
            <Text style={styles.modalTitle}>Resolve Complaint</Text>
            <Text style={styles.modalSubtitle}>
              {selectedComplaint?.title} ({selectedComplaint?.category})
            </Text>

            <Text style={styles.inputLabel}>Resolution Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Electrician visited and repaired wiring in Room 204."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              maxLength={500}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedComplaint(null)}
                disabled={resolving}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleResolveSubmit}
                disabled={resolving}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Mark as Solved</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  complaintCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  studentInfoBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginVertical: spacing.xs,
  },
  studentInfoText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  complaintTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  complaintDesc: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  resolvedInfoBox: {
    backgroundColor: `${colors.success}15`,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.success}35`,
    marginBottom: spacing.sm,
  },
  resolvedInfoTitle: {
    color: colors.success,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
    marginBottom: 2,
  },
  resolvedNotesText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontStyle: 'italic',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  solveButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  solveButtonText: {
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: colors.accent,
    fontSize: typography.bodySmall.fontSize,
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    padding: spacing.sm,
    fontSize: typography.bodyMedium.fontSize,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: spacing.lg,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    minWidth: 130,
  },
  modalSubmitBtnText: {
    color: colors.white,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '700',
  },
});
