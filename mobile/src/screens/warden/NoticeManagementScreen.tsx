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
import { Notice, NoticeCategory } from '../../types';

interface NoticeManagementScreenProps {
  onBack: () => void;
  onNavigateCreate: () => void;
  onNavigateEdit: (notice: Notice) => void;
}

export const NoticeManagementScreen: React.FC<NoticeManagementScreenProps> = ({
  onBack,
  onNavigateCreate,
  onNavigateEdit,
}) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/notices');
      if (res.data?.data) {
        setNotices(res.data.data);
      }
    } catch (error) {
      console.log('Error loading warden notices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotices();
  };

  const handleDelete = (notice: Notice) => {
    Alert.alert(
      'Delete Notice',
      `Are you sure you want to delete "${notice.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(notice.id);
            try {
              await apiClient.delete(`/notices/${notice.id}`);
              Alert.alert('Notice Deleted', 'The notice has been removed.');
              loadNotices();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete notice.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (notice: Notice) => {
    try {
      await apiClient.put(`/notices/${notice.id}`, {
        isPinned: !notice.isPinned,
      });
      loadNotices();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to toggle pinned status.');
    }
  };

  const getCategoryColor = (category: NoticeCategory) => {
    switch (category) {
      case 'URGENT':
        return colors.danger;
      case 'HOSTEL':
        return colors.primaryLight;
      case 'MESS':
        return colors.warning;
      case 'EVENT':
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
        <Text style={styles.headerTitle}>Notice Board</Text>
        <TouchableOpacity style={styles.createButton} onPress={onNavigateCreate}>
          <Text style={styles.createButtonText}>+ Publish</Text>
        </TouchableOpacity>
      </View>

      {/* Notice List */}
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
        ) : notices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Notices Published</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Publish" button above to create an announcement for students.
            </Text>
          </View>
        ) : (
          notices.map((notice) => {
            const dateStr = new Date(notice.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <View
                key={notice.id}
                style={[
                  styles.noticeCard,
                  shadows.card,
                  notice.isPinned && styles.pinnedCard,
                ]}
              >
                {/* Meta header */}
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: `${getCategoryColor(notice.category)}22` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: getCategoryColor(notice.category) },
                      ]}
                    >
                      {notice.category}
                    </Text>
                  </View>

                  <View style={styles.audienceBadge}>
                    <Text style={styles.audienceBadgeText}>
                      Audience: {notice.targetAudience}
                    </Text>
                  </View>

                  {notice.isPinned && (
                    <View style={styles.pinnedBadge}>
                      <Text style={styles.pinnedBadgeText}>📌 PINNED</Text>
                    </View>
                  )}
                </View>

                {/* Title & Body */}
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeContent} numberOfLines={4}>
                  {notice.content}
                </Text>

                <Text style={styles.dateText}>Published on {dateStr}</Text>

                {/* Actions Toolbar */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.pinToggleBtn}
                    onPress={() => handleTogglePin(notice)}
                  >
                    <Text style={styles.pinToggleText}>
                      {notice.isPinned ? 'Unpin' : '📌 Pin to Top'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.editDeleteGroup}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => onNavigateEdit(notice)}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(notice)}
                      disabled={deletingId === notice.id}
                    >
                      {deletingId === notice.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
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
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  createButtonText: {
    color: colors.white,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinnedCard: {
    borderColor: colors.accent,
    backgroundColor: '#162238',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  audienceBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  audienceBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  pinnedBadge: {
    backgroundColor: `${colors.accent}22`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pinnedBadgeText: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  noticeTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  noticeContent: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pinToggleBtn: {
    paddingVertical: spacing.xs,
  },
  pinToggleText: {
    color: colors.accent,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  editDeleteGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    backgroundColor: `${colors.danger}15`,
  },
  deleteBtnText: {
    color: colors.danger,
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
