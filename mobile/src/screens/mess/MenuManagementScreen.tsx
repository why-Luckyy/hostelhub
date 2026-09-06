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
import { MessMenu, DayOfWeek, MealType } from '../../types';

interface MenuManagementScreenProps {
  onBack: () => void;
}

const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
  { key: 'SUNDAY', label: 'Sunday' },
];

const MEAL_SLOTS: Array<{ type: MealType; label: string; icon: string }> = [
  { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅' },
  { type: 'LUNCH', label: 'Lunch', icon: '🍛' },
  { type: 'SNACKS', label: 'Snacks & Tea', icon: '☕' },
  { type: 'DINNER', label: 'Dinner', icon: '🍲' },
];

export const MenuManagementScreen: React.FC<MenuManagementScreenProps> = ({ onBack }) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');
  const [loading, setLoading] = useState<boolean>(true);
  const [groupedMenu, setGroupedMenu] = useState<Record<string, MessMenu[]>>({});

  // Active edit state
  const [editingMeal, setEditingMeal] = useState<MealType | null>(null);
  const [editItems, setEditItems] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/mess/menu');
      if (res.data?.data?.groupedByDay) {
        setGroupedMenu(res.data.data.groupedByDay);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load mess menus.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (mealType: MealType, existing?: MessMenu) => {
    setEditingMeal(mealType);
    setEditItems(existing ? existing.items : '');
    setEditNotes(existing?.specialNotes || '');
  };

  const cancelEdit = () => {
    setEditingMeal(null);
    setEditItems('');
    setEditNotes('');
  };

  const handleSave = async (mealType: MealType) => {
    if (!editItems.trim()) {
      Alert.alert('Validation Error', 'Please specify the food items for this meal.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post('/mess/menu', {
        dayOfWeek: selectedDay,
        mealType,
        items: editItems.trim(),
        specialNotes: editNotes.trim() || undefined,
      });

      if (res.data?.success) {
        Alert.alert('Success', `Configured recurring ${mealType} menu for ${selectedDay}.`);
        cancelEdit();
        fetchMenus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save menu entry.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (menuId: string, mealType: MealType) => {
    Alert.alert(
      'Delete Menu Slot',
      `Are you sure you want to remove the recurring ${mealType} menu for ${selectedDay}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/mess/menu/${menuId}`);
              Alert.alert('Deleted', 'Menu entry removed.');
              fetchMenus();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete menu.');
            }
          },
        },
      ]
    );
  };

  const currentDayMeals = groupedMenu[selectedDay] || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Menu Management</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Weekday Selector */}
      <View style={styles.daySelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
          {DAYS.map((d) => {
            const isSelected = selectedDay === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.dayChip, isSelected && styles.dayChipActive]}
                onPress={() => {
                  cancelEdit();
                  setSelectedDay(d.key);
                }}
              >
                <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle}>📅 Managing {selectedDay} Recurring Schedule</Text>
          <Text style={styles.bannerSub}>
            Updates persist indefinitely each week until changed.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading menu configuration...</Text>
          </View>
        ) : (
          <View style={styles.slotsList}>
            {MEAL_SLOTS.map((slot) => {
              const existing = currentDayMeals.find((m) => m.mealType === slot.type);
              const isEditing = editingMeal === slot.type;

              return (
                <View key={slot.type} style={[styles.slotCard, shadows.card]}>
                  <View style={styles.slotHeader}>
                    <View style={styles.slotTitleRow}>
                      <Text style={styles.slotIcon}>{slot.icon}</Text>
                      <Text style={styles.slotLabel}>{slot.label}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      {existing ? (
                        <View style={styles.configuredBadge}>
                          <Text style={styles.configuredBadgeText}>✓ Active</Text>
                        </View>
                      ) : (
                        <View style={styles.missingBadge}>
                          <Text style={styles.missingBadgeText}>Empty</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {isEditing ? (
                    <View style={styles.editForm}>
                      <Text style={styles.fieldLabel}>Items (comma-separated dishes)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editItems}
                        onChangeText={setEditItems}
                        placeholder="e.g. Masala Dosa, Sambar, Coconut Chutney, Coffee"
                        placeholderTextColor={colors.textMuted}
                        multiline
                      />

                      <Text style={styles.fieldLabel}>Special Notes (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="e.g. Ghee roast option available"
                        placeholderTextColor={colors.textMuted}
                      />

                      <View style={styles.formBtnRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                          onPress={() => handleSave(slot.type)}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <Text style={styles.saveBtnText}>Save Menu</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : existing ? (
                    <View>
                      <Text style={styles.itemsDisplay}>{existing.items}</Text>
                      {existing.specialNotes ? (
                        <Text style={styles.notesDisplay}>Note: {existing.specialNotes}</Text>
                      ) : null}

                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => startEdit(slot.type, existing)}
                        >
                          <Text style={styles.editBtnText}>✏️ Edit Menu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(existing.id, slot.type)}
                        >
                          <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySlotBox}>
                      <Text style={styles.emptySlotText}>No menu configured for this slot yet.</Text>
                      <TouchableOpacity
                        style={styles.configureBtn}
                        onPress={() => startEdit(slot.type)}
                      >
                        <Text style={styles.configureBtnText}>+ Add {slot.label} Menu</Text>
                      </TouchableOpacity>
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
  daySelectorContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
  },
  dayChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bannerInfo: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  bannerTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  bannerSub: {
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
  slotsList: {
    gap: spacing.md,
  },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotIcon: {
    fontSize: 22,
  },
  slotLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  badgeRow: {},
  configuredBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  configuredBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  missingBadge: {
    backgroundColor: `${colors.textMuted}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  missingBadgeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  itemsDisplay: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
  },
  notesDisplay: {
    ...typography.caption,
    color: colors.accentLight,
    marginTop: 4,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  editBtnText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: `${colors.danger}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: `${colors.danger}30`,
  },
  deleteBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  emptySlotBox: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptySlotText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  configureBtn: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  configureBtnText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  editForm: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.bodyMedium,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  cancelBtnText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '700',
  },
});
