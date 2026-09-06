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
import { MessMenu, DayOfWeek, MealType } from '../../types';

interface WeeklyMenuScreenProps {
  onBack: () => void;
  onNavigateToday?: () => void;
}

const DAYS: Array<{ key: DayOfWeek; label: string; short: string }> = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

const MEAL_TYPES: Array<{ type: MealType; label: string; icon: string }> = [
  { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅' },
  { type: 'LUNCH', label: 'Lunch', icon: '🍛' },
  { type: 'SNACKS', label: 'Snacks', icon: '☕' },
  { type: 'DINNER', label: 'Dinner', icon: '🍲' },
];

export const WeeklyMenuScreen: React.FC<WeeklyMenuScreenProps> = ({ onBack, onNavigateToday }) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [groupedMenu, setGroupedMenu] = useState<Record<string, MessMenu[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeeklyMenu();
  }, []);

  const fetchWeeklyMenu = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/mess/menu');
      if (res.data?.data?.groupedByDay) {
        setGroupedMenu(res.data.data.groupedByDay);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load weekly dining schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeeklyMenu();
  };

  const currentDayMeals = groupedMenu[selectedDay] || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Weekly Dining Schedule</Text>
        {onNavigateToday ? (
          <TouchableOpacity style={styles.todayButton} onPress={onNavigateToday}>
            <Text style={styles.todayButtonText}>Today 🍽️</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Weekday Selector Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.key;
            return (
              <TouchableOpacity
                key={day.key}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setSelectedDay(day.key)}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {day.short}
                </Text>
                <Text style={[styles.tabSubtext, isSelected && styles.tabSubtextActive]}>
                  {groupedMenu[day.key]?.length || 0} meals
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {/* Selected Day Banner */}
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>{selectedDay}</Text>
          <Text style={styles.selectedDaySub}>Configured recurring dining schedule</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading weekly schedule...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchWeeklyMenu}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mealCardsContainer}>
            {MEAL_TYPES.map((m) => {
              const item = currentDayMeals.find((entry) => entry.mealType === m.type);
              return (
                <View key={m.type} style={[styles.mealCard, shadows.card]}>
                  <View style={styles.mealCardHeader}>
                    <Text style={styles.mealIcon}>{m.icon}</Text>
                    <Text style={styles.mealTypeTitle}>{m.label}</Text>
                    <View style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{m.type}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  {item ? (
                    <View>
                      <Text style={styles.itemsContent}>{item.items}</Text>
                      {item.specialNotes ? (
                        <View style={styles.specialNotesCard}>
                          <Text style={styles.specialNotesHeading}>Chef's Note:</Text>
                          <Text style={styles.specialNotesBody}>{item.specialNotes}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.emptyNote}>No menu item configured for {m.label.toLowerCase()} on this day.</Text>
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
  todayButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
  },
  todayButtonText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    minWidth: 64,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  tabSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  tabSubtextActive: {
    color: colors.primaryLight,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  selectedDayHeader: {
    marginBottom: spacing.md,
  },
  selectedDayTitle: {
    ...typography.h2,
    color: colors.text,
  },
  selectedDaySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
  mealCardsContainer: {
    gap: spacing.md,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  mealTypeTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  typeTag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    ...typography.caption,
    color: colors.accentLight,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  itemsContent: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
  },
  specialNotesCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  specialNotesHeading: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentLight,
    marginBottom: 2,
  },
  specialNotesBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
