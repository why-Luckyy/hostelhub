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
import { MessFeedback, MealType } from '../../types';

interface FeedbackOverviewScreenProps {
  onBack: () => void;
}

const FILTER_MEALS: Array<{ key: MealType | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All Meals' },
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'SNACKS', label: 'Snacks' },
  { key: 'DINNER', label: 'Dinner' },
];

export const FeedbackOverviewScreen: React.FC<FeedbackOverviewScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<MealType | 'ALL'>('ALL');
  const [feedbacks, setFeedbacks] = useState<MessFeedback[]>([]);
  const [summary, setSummary] = useState<{
    totalCount: number;
    averageRating: number;
    averageFoodQuality: number;
    averageCleanliness: number;
  }>({
    totalCount: 0,
    averageRating: 0,
    averageFoodQuality: 0,
    averageCleanliness: 0,
  });

  useEffect(() => {
    fetchFeedbacks();
  }, [selectedFilter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const url =
        selectedFilter === 'ALL'
          ? '/mess/feedback?limit=50'
          : `/mess/feedback?mealType=${selectedFilter}&limit=50`;

      const res = await apiClient.get(url);
      if (res.data?.data) {
        setFeedbacks(res.data.data.feedbacks || []);
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch (err: any) {
      console.log('Failed to fetch feedback overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedbacks();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Student Dining Feedback</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {/* Summary Card */}
        <View style={[styles.summaryCard, shadows.card]}>
          <Text style={styles.summaryTitle}>Student Satisfaction Index</Text>
          <Text style={styles.summarySub}>
            Overall aggregate based on {summary.totalCount} student responses
          </Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>★ {summary.averageRating}</Text>
              <Text style={styles.scoreLabel}>Overall Score</Text>
            </View>

            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.success }]}>
                🍲 {summary.averageFoodQuality}
              </Text>
              <Text style={styles.scoreLabel}>Taste & Quality</Text>
            </View>

            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.accentLight }]}>
                🧼 {summary.averageCleanliness}
              </Text>
              <Text style={styles.scoreLabel}>Cleanliness</Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {FILTER_MEALS.map((f) => {
            const isSelected = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedFilter(f.key)}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading feedback reviews...</Text>
          </View>
        ) : feedbacks.length > 0 ? (
          <View style={styles.feedbackList}>
            {feedbacks.map((fb) => (
              <View key={fb.id} style={[styles.feedbackCard, shadows.card]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.studentName}>
                      {fb.studentProfile
                        ? `${fb.studentProfile.firstName} ${fb.studentProfile.lastName}`
                        : 'Student Reviewer'}
                    </Text>
                    <Text style={styles.studentMeta}>
                      Roll: {fb.studentProfile?.rollNumber || 'N/A'} • {fb.studentProfile?.studentType || 'HOSTELER'}
                    </Text>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>★ {fb.rating} / 5</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.mealBadge}>{fb.mealType}</Text>
                  <Text style={styles.dateBadge}>Meal Date: {fb.mealDate.slice(0, 10)}</Text>
                </View>

                <View style={styles.subScoresRow}>
                  <Text style={styles.subScoreText}>🍲 Food Quality: {fb.foodQualityRating}/5</Text>
                  <Text style={styles.subScoreText}>🧼 Hygiene: {fb.cleanlinessRating}/5</Text>
                </View>

                {fb.comment ? (
                  <View style={styles.commentBox}>
                    <Text style={styles.commentText}>"{fb.comment}"</Text>
                  </View>
                ) : (
                  <Text style={styles.noCommentText}>No written comment submitted.</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No feedback entries found</Text>
            <Text style={styles.emptySub}>
              {selectedFilter === 'ALL'
                ? 'No student feedback has been submitted yet.'
                : `No reviews found for ${selectedFilter}.`}
            </Text>
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  summarySub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreValue: {
    ...typography.h3,
    color: colors.warning,
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  filterPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  loadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  feedbackList: {
    gap: spacing.md,
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  studentName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
  },
  studentMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ratingBadge: {
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  ratingBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  mealBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentLight,
  },
  dateBadge: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  subScoresRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  subScoreText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commentBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
  },
  commentText: {
    ...typography.bodySmall,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  noCommentText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
