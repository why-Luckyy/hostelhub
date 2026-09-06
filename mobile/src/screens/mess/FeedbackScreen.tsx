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
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { MessFeedback, MealType } from '../../types';

interface FeedbackScreenProps {
  onBack: () => void;
}

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'SUBMIT' | 'HISTORY'>('SUBMIT');

  // Form State
  const [mealDate, setMealDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [rating, setRating] = useState<number>(4);
  const [foodQualityRating, setFoodQualityRating] = useState<number>(4);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(4);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // History State
  const [myFeedbacks, setMyFeedbacks] = useState<MessFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get('/mess/feedback/my-feedback');
      if (res.data?.data) {
        setMyFeedbacks(res.data.data);
      }
    } catch (err: any) {
      console.log('Failed to fetch personal feedback history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!mealDate.trim()) {
      Alert.alert('Validation Error', 'Meal date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/mess/feedback', {
        mealDate,
        mealType,
        rating,
        foodQualityRating,
        cleanlinessRating,
        comment: comment.trim() || undefined,
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Thank you! Your feedback has been recorded.', [
          {
            text: 'View History',
            onPress: () => {
              setActiveTab('HISTORY');
              setComment('');
            },
          },
          { text: 'OK', onPress: () => setComment('') },
        ]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit feedback.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    value: number,
    onChange: (val: number) => void,
    label: string,
    icon: string
  ) => {
    return (
      <View style={styles.ratingRow}>
        <View style={styles.ratingLabelCol}>
          <Text style={styles.ratingIcon}>{icon}</Text>
          <Text style={styles.ratingLabel}>{label}</Text>
        </View>
        <View style={styles.starsGroup}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onChange(star)}
              style={styles.starButton}
            >
              <Text style={[styles.starIcon, star <= value && styles.starActive]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.ratingScore}>{value}/5</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mess Dining Feedback</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SUBMIT' && styles.tabItemActive]}
          onPress={() => setActiveTab('SUBMIT')}
        >
          <Text style={[styles.tabText, activeTab === 'SUBMIT' && styles.tabTextActive]}>
            ✍️ Submit Feedback
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            📜 My Reviews
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'SUBMIT' ? (
          <View style={styles.formContainer}>
            {/* Meal Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date of Meal (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={mealDate}
                onChangeText={setMealDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Meal Type Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Select Meal</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((m) => {
                  const isSelected = mealType === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealTypeButton, isSelected && styles.mealTypeButtonActive]}
                      onPress={() => setMealType(m)}
                    >
                      <Text style={[styles.mealTypeText, isSelected && styles.mealTypeTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Rating Pickers */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.sectionHeading}>Rate Your Experience</Text>
              {renderStarRating(rating, setRating, 'Overall Experience', '⭐')}
              <View style={styles.cardDivider} />
              {renderStarRating(foodQualityRating, setFoodQualityRating, 'Food Quality & Taste', '🍲')}
              <View style={styles.cardDivider} />
              {renderStarRating(cleanlinessRating, setCleanlinessRating, 'Dining Hall Hygiene', '🧼')}
            </View>

            {/* Comment */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Comments & Suggestions (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder="Share constructive feedback for the mess incharge..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Dining Feedback</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {loadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primaryLight} />
                <Text style={styles.loadingText}>Fetching your reviews...</Text>
              </View>
            ) : myFeedbacks.length > 0 ? (
              myFeedbacks.map((fb) => (
                <View key={fb.id} style={[styles.card, shadows.card]}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewMeal}>{fb.mealType}</Text>
                      <Text style={styles.reviewDate}>{fb.mealDate.slice(0, 10)}</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>★ {fb.rating} / 5</Text>
                    </View>
                  </View>

                  <View style={styles.subRatingsRow}>
                    <Text style={styles.subRatingItem}>🍲 Taste: {fb.foodQualityRating}/5</Text>
                    <Text style={styles.subRatingItem}>🧼 Hygiene: {fb.cleanlinessRating}/5</Text>
                  </View>

                  {fb.comment ? (
                    <Text style={styles.reviewComment}>"{fb.comment}"</Text>
                  ) : (
                    <Text style={styles.noCommentText}>No written comment provided.</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No feedback submitted yet.</Text>
                <Text style={styles.emptySub}>Your reviews help improve hostel food quality and hygiene.</Text>
              </View>
            )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabItemActive: {
    borderBottomColor: colors.primaryLight,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formContainer: {
    gap: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    ...typography.bodyMedium,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mealTypeButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeButtonActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryLight,
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mealTypeTextActive: {
    color: colors.primaryLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  ratingLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  ratingIcon: {
    fontSize: 18,
  },
  ratingLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  starsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 3,
  },
  starIcon: {
    fontSize: 22,
    color: colors.surfaceLight,
  },
  starActive: {
    color: colors.warning,
  },
  ratingScore: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    minWidth: 26,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.white,
  },
  historyContainer: {
    gap: spacing.md,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  reviewMeal: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  scoreBadge: {
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderColor: colors.warning,
    borderWidth: 1,
  },
  scoreBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
  },
  subRatingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  subRatingItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  reviewComment: {
    ...typography.bodyMedium,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  noCommentText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyBox: {
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
