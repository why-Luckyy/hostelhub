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
import { MessMenu, MealType, DayOfWeek } from '../../types';

interface TodayMenuScreenProps {
  onBack: () => void;
  onNavigateWeekly?: () => void;
}

interface TodayMenuResponse {
  date: string;
  dayOfWeek: DayOfWeek;
  meals: {
    BREAKFAST: MessMenu | null;
    LUNCH: MessMenu | null;
    SNACKS: MessMenu | null;
    DINNER: MessMenu | null;
  };
  totalMealsFound: number;
}

const MEAL_CONFIGS: Array<{
  type: MealType;
  label: string;
  icon: string;
  time: string;
  accentColor: string;
}> = [
  { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅', time: '07:30 AM - 09:30 AM', accentColor: colors.warning },
  { type: 'LUNCH', label: 'Lunch', icon: '🍛', time: '12:30 PM - 02:30 PM', accentColor: colors.success },
  { type: 'SNACKS', label: 'Snacks & Tea', icon: '☕', time: '04:30 PM - 05:30 PM', accentColor: colors.accent },
  { type: 'DINNER', label: 'Dinner', icon: '🍲', time: '07:30 PM - 09:30 PM', accentColor: colors.primaryLight },
];

export const TodayMenuScreen: React.FC<TodayMenuScreenProps> = ({ onBack, onNavigateWeekly }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [menuData, setMenuData] = useState<TodayMenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayMenu();
  }, []);

  const fetchTodayMenu = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/mess/menu/today');
      if (res.data?.data) {
        setMenuData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dining menu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayMenu();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Today's Dining Menu</Text>
        {onNavigateWeekly ? (
          <TouchableOpacity style={styles.weeklyButton} onPress={onNavigateWeekly}>
            <Text style={styles.weeklyButtonText}>Weekly 📅</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {/* Date & Day Banner */}
        <View style={[styles.dayBanner, shadows.card]}>
          <View>
            <Text style={styles.dayText}>{menuData?.dayOfWeek || 'TODAY'}</Text>
            <Text style={styles.dateText}>{menuData?.date || new Date().toISOString().slice(0, 10)}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>🔄 Active Recurring</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Fetching today's meals...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTodayMenu}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mealList}>
            {MEAL_CONFIGS.map((config) => {
              const meal = menuData?.meals[config.type as keyof typeof menuData.meals];
              return (
                <View key={config.type} style={[styles.mealCard, shadows.card]}>
                  {/* Meal Header */}
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTitleRow}>
                      <Text style={styles.mealIcon}>{config.icon}</Text>
                      <View>
                        <Text style={styles.mealLabel}>{config.label}</Text>
                        <Text style={styles.mealTime}>{config.time}</Text>
                      </View>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: `${config.accentColor}20`, borderColor: config.accentColor }]}>
                      <Text style={[styles.typeBadgeText, { color: config.accentColor }]}>{config.type}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Meal Items */}
                  {meal ? (
                    <View>
                      <Text style={styles.itemsText}>{meal.items}</Text>
                      {meal.specialNotes ? (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>✨ Special Note:</Text>
                          <Text style={styles.notesText}>{meal.specialNotes}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.emptyMealBox}>
                      <Text style={styles.emptyMealText}>No menu configured for this meal slot yet.</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
  weeklyButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
  },
  weeklyButtonText: {
    ...typography.caption,
    color: colors.accentLight,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dayBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayText: {
    ...typography.h2,
    color: colors.primaryLight,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: `${colors.success}20`,
    borderColor: colors.success,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
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
  mealList: {
    gap: spacing.md,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealHeader: {
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
    fontSize: 26,
  },
  mealLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  mealTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  itemsText: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
  },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  notesLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 2,
  },
  notesText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyMealBox: {
    paddingVertical: spacing.sm,
  },
  emptyMealText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
