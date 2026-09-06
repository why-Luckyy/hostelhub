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
import { Notice, NoticeCategory } from '../../types';

interface NoticesScreenProps {
  onBack: () => void;
}

const CATEGORIES: Array<{ key: 'ALL' | NoticeCategory; label: string }> = [
  { key: 'ALL', label: 'All Notices' },
  { key: 'URGENT', label: '🚨 Urgent' },
  { key: 'HOSTEL', label: '🏢 Hostel' },
  { key: 'MESS', label: '🍽️ Mess' },
  { key: 'EVENT', label: '🎉 Events' },
  { key: 'GENERAL', label: '📢 General' },
];

export const NoticesScreen: React.FC<NoticesScreenProps> = ({ onBack }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NoticeCategory>('ALL');

  useEffect(() => {
    loadNotices();
  }, [selectedCategory]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const url =
        selectedCategory === 'ALL'
          ? '/notices'
          : `/notices?category=${selectedCategory}`;
      const res = await apiClient.get(url);
      if (res.data?.data) {
        setNotices(res.data.data);
      }
    } catch (error) {
      console.log('Error loading notices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotices();
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

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'HOSTELERS':
        return '🏠 Hostelers Only';
      case 'DAY_SCHOLARS':
        return '🚶 Day Scholars Only';
      default:
        return '👥 All Students';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notice Board</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadNotices}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.chip,
                selectedCategory === cat.key && styles.chipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat.key && styles.chipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notices List */}
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
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No Notices Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'ALL'
                ? 'There are no active notices published at this moment.'
                : `No notices found in category "${selectedCategory}".`}
            </Text>
          </View>
        ) : (
          notices.map((notice) => {
            const formattedDate = new Date(notice.createdAt).toLocaleDateString('en-IN', {
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
                {/* Pinned Badge */}
                {notice.isPinned && (
                  <View style={styles.pinnedBanner}>
                    <Text style={styles.pinnedBannerText}>📌 PINNED ANNOUNCEMENT</Text>
                  </View>
                )}

                {/* Badges Row */}
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
                      {getAudienceLabel(notice.targetAudience)}
                    </Text>
                  </View>
                </View>

                {/* Title & Content */}
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeContent}>{notice.content}</Text>

                {/* Footer with date & publisher */}
                <View style={styles.noticeFooter}>
                  <Text style={styles.footerDate}>📅 {formattedDate}</Text>
                  {notice.publishedBy && (
                    <Text style={styles.footerAuthor}>
                      By {notice.publishedBy.role === 'WARDEN' ? 'Warden Office' : notice.publishedBy.email}
                    </Text>
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
  chipsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
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
  pinnedBanner: {
    backgroundColor: `${colors.accent}25`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  pinnedBannerText: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  noticeTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  noticeContent: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerDate: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  footerAuthor: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
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
