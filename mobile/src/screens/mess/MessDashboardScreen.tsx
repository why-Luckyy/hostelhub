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
import { MessDashboardData, MealType } from '../../types';

interface MessDashboardScreenProps {
  onBack: () => void;
  onNavigateMenu?: () => void;
  onNavigateFeedback?: () => void;
}

const MEALS_ORDER: Array<{ type: MealType; label: string; icon: string; color: string }> = [
  { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅', color: colors.warning },
  { type: 'LUNCH', label: 'Lunch', icon: '🍛', color: colors.success },
  { type: 'SNACKS', label: 'Snacks', icon: '☕', color: colors.accent },
  { type: 'DINNER', label: 'Dinner', icon: '🍲', color: colors.primaryLight },
];

export const MessDashboardScreen: React.FC<MessDashboardScreenProps> = ({
  onBack,
  onNavigateMenu,
  onNavigateFeedback,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<MessDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/mess/analytics/dashboard');
      if (res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load mess analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mess Meal Forecasting</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {/* Quick Actions Row */}
        <View style={styles.actionNavRow}>
          {onNavigateMenu ? (
            <TouchableOpacity style={styles.navActionCard} onPress={onNavigateMenu}>
              <Text style={styles.navActionIcon}>📝</Text>
              <Text style={styles.navActionTitle}>Menu Editor</Text>
              <Text style={styles.navActionSub}>Manage weekly items</Text>
            </TouchableOpacity>
          ) : null}

          {onNavigateFeedback ? (
            <TouchableOpacity style={styles.navActionCard} onPress={onNavigateFeedback}>
              <Text style={styles.navActionIcon}>⭐</Text>
              <Text style={styles.navActionTitle}>Student Feedback</Text>
              <Text style={styles.navActionSub}>Review quality & ratings</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Calculating expected meal analytics...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : dashboardData ? (
          <View style={styles.contentBody}>
            {/* Overview Banner */}
            <View style={[styles.overviewCard, shadows.card]}>
              <View>
                <Text style={styles.overviewTitle}>Today's Automated Forecast</Text>
                <Text style={styles.overviewDate}>
                  {dashboardData.today.dayOfWeek} • {dashboardData.today.date}
                </Text>
              </View>
              <View style={styles.residentPill}>
                <Text style={styles.residentPillLabel}>Active Residents</Text>
                <Text style={styles.residentPillValue}>{dashboardData.today.totalEligibleResidents}</Text>
              </View>
            </View>

            {/* Meal Cards Grid */}
            <Text style={styles.sectionHeader}>Meal Forecasts to Prepare</Text>
            <View style={styles.mealsGrid}>
              {MEALS_ORDER.map((m) => {
                const breakdown = dashboardData.today.breakdown[m.type];
                return (
                  <View key={m.type} style={[styles.mealCard, shadows.card]}>
                    <View style={styles.mealCardTop}>
                      <View style={styles.mealTitleRow}>
                        <Text style={styles.mealIcon}>{m.icon}</Text>
                        <Text style={styles.mealLabel}>{m.label}</Text>
                      </View>
                      <View style={[styles.expectedPill, { borderColor: m.color }]}>
                        <Text style={[styles.expectedPillValue, { color: m.color }]}>
                          {breakdown?.expectedMeals ?? 0}
                        </Text>
                        <Text style={styles.expectedPillUnit}>meals</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Breakdown Details */}
                    <View style={styles.breakdownRow}>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Residents</Text>
                        <Text style={styles.breakdownValue}>{breakdown?.residentEligible ?? 0}</Text>
                      </View>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>On Leave</Text>
                        <Text style={[styles.breakdownValue, { color: colors.danger }]}>
                          -{breakdown?.onLeave ?? 0}
                        </Text>
                      </View>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Approved Guests</Text>
                        <Text style={[styles.breakdownValue, { color: colors.accentLight }]}>
                          +{breakdown?.guestMeals ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Satisfaction Summary Card */}
            <View style={[styles.satisfactionCard, shadows.card]}>
              <Text style={styles.satisfactionTitle}>🌟 Student Satisfaction Metrics</Text>
              <Text style={styles.satisfactionSub}>
                Based on {dashboardData.satisfaction.totalFeedbacks} student ratings
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>★ {dashboardData.satisfaction.averageRating}</Text>
                  <Text style={styles.statLabel}>Overall Score</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>🍲 {dashboardData.satisfaction.averageFoodQuality}</Text>
                  <Text style={styles.statLabel}>Taste & Quality</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>🧼 {dashboardData.satisfaction.averageCleanliness}</Text>
                  <Text style={styles.statLabel}>Hygiene Score</Text>
                </View>
              </View>
            </View>

            {/* 7-Day Trend Projection */}
            <View style={[styles.trendCard, shadows.card]}>
              <Text style={styles.trendTitle}>📅 7-Day Meal Preparation Projection</Text>
              <Text style={styles.trendSub}>Anticipated daily dining counts accounting for scheduled leaves</Text>

              <View style={styles.trendTable}>
                <View style={styles.trendHeaderRow}>
                  <Text style={[styles.trendColHeader, { flex: 2 }]}>Day</Text>
                  <Text style={styles.trendColHeader}>🌅 Breakfast</Text>
                  <Text style={styles.trendColHeader}>🍛 Lunch</Text>
                  <Text style={styles.trendColHeader}>🍲 Dinner</Text>
                </View>

                {dashboardData.weeklyTrend.map((day, idx) => (
                  <View key={day.date} style={[styles.trendRow, idx % 2 === 1 && styles.trendRowAlt]}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.trendDayText}>{day.dayOfWeek.slice(0, 3)}</Text>
                      <Text style={styles.trendDateText}>{day.date.slice(5)}</Text>
                    </View>
                    <Text style={styles.trendValueText}>{day.breakfast}</Text>
                    <Text style={styles.trendValueText}>{day.lunch}</Text>
                    <Text style={styles.trendValueText}>{day.dinner}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
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
  actionNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  navActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  navActionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
  },
  navActionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
  errorBox: {
    backgroundColor: `${colors.danger}15`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    marginVertical: spacing.lg,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  contentBody: {
    gap: spacing.lg,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTitle: {
    ...typography.h3,
    color: colors.text,
  },
  overviewDate: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    marginTop: 2,
  },
  residentPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  residentPillLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  residentPillValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: 1,
  },
  sectionHeader: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  mealsGrid: {
    gap: spacing.sm,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealIcon: {
    fontSize: 24,
  },
  mealLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  expectedPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  expectedPillValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  expectedPillUnit: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  breakdownValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  satisfactionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  satisfactionTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  satisfactionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.h3,
    color: colors.warning,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  trendSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  trendTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  trendHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  trendColHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trendRowAlt: {
    backgroundColor: `${colors.surfaceLight}40`,
  },
  trendDayText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  trendDateText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  trendValueText: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
});
