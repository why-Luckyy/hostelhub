import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { MessStaff, MessStaffRole } from '../../types';

interface MessStaffManagementScreenProps {
  onBack: () => void;
  readOnly?: boolean;
}

const ROLES: { label: string; value: MessStaffRole | 'ALL' }[] = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'Cooks', value: 'COOK' },
  { label: 'Servers', value: 'SERVER' },
  { label: 'Cleaning', value: 'CLEANING_STAFF' },
  { label: 'Food Transfer', value: 'FOOD_TRANSFER' },
  { label: 'Other', value: 'OTHER' },
];

export const MessStaffManagementScreen: React.FC<MessStaffManagementScreenProps> = ({
  onBack,
  readOnly = false,
}) => {
  const [staffList, setStaffList] = useState<MessStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<MessStaffRole | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MessStaffRole>('COOK');
  const [phone, setPhone] = useState('');
  const [expectedStartTime, setExpectedStartTime] = useState('06:30');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [selectedRole]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedRole !== 'ALL') params.role = selectedRole;
      const res = await apiClient.get('/mess/staff', { params });
      setStaffList(res.data.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch staff directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setName('');
    setRole('COOK');
    setPhone('');
    setExpectedStartTime('06:30');
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (staff: MessStaff) => {
    setEditingStaffId(staff.id);
    setName(staff.name);
    setRole(staff.role);
    setPhone(staff.phone || '');
    setExpectedStartTime(staff.expectedStartTime);
    setIsModalVisible(true);
  };

  const handleSaveStaff = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter staff name.');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(expectedStartTime.trim())) {
      Alert.alert('Validation Error', 'Expected start time must be in 24-hour HH:mm format (e.g., 06:30).');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStaffId) {
        await apiClient.put(`/mess/staff/${editingStaffId}`, {
          name: name.trim(),
          role,
          phone: phone.trim() || null,
          expectedStartTime: expectedStartTime.trim(),
        });
        Alert.alert('Success', 'Staff details updated.');
      } else {
        await apiClient.post('/mess/staff', {
          name: name.trim(),
          role,
          phone: phone.trim() || null,
          expectedStartTime: expectedStartTime.trim(),
        });
        Alert.alert('Success', 'Staff member enrolled successfully.');
      }
      setIsModalVisible(false);
      fetchStaff();
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.message || 'Failed to save staff record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: MessStaff) => {
    const newStatus = !staff.isActive;
    Alert.alert(
      newStatus ? 'Activate Staff' : 'Deactivate Staff',
      `Are you sure you want to mark ${staff.name} as ${newStatus ? 'active' : 'inactive'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await apiClient.patch(`/mess/staff/${staff.id}/status`, { isActive: newStatus });
              fetchStaff();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mess Staff Directory</Text>
        {!readOnly ? (
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
            <Text style={styles.addBtnText}>+ Enroll</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by staff name or phone..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Role Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.chip, selectedRole === r.value && styles.chipActive]}
              onPress={() => setSelectedRole(r.value)}
            >
              <Text style={[styles.chipText, selectedRole === r.value && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Staff Cards */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredStaff.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👨‍🍳</Text>
            <Text style={styles.emptyTitle}>No Staff Members Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try changing your search keywords.' : 'Enroll kitchen workers to track daily attendance.'}
            </Text>
          </View>
        ) : (
          filteredStaff.map((staff) => (
            <View
              key={staff.id}
              style={[
                styles.staffCard,
                shadows.card,
                !staff.isActive && { opacity: 0.6, borderColor: colors.border },
              ]}
            >
              <View style={styles.staffHeader}>
                <View>
                  <Text style={styles.staffName}>{staff.name}</Text>
                  <Text style={styles.staffRole}>{staff.role.replace('_', ' ')}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    staff.isActive ? styles.badgeActive : styles.badgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      staff.isActive ? styles.textActive : styles.textInactive,
                    ]}
                  >
                    {staff.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.staffDetails}>
                <Text style={styles.detailItem}>
                  ⏰ Shift Start: <Text style={styles.boldText}>{staff.expectedStartTime}</Text>
                </Text>
                {staff.phone ? (
                  <Text style={styles.detailItem}>
                    📞 Phone: <Text style={styles.boldText}>{staff.phone}</Text>
                  </Text>
                ) : null}
              </View>

              {!readOnly ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenEditModal(staff)}
                  >
                    <Text style={styles.actionBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      staff.isActive ? styles.deactivateBtn : styles.activateBtn,
                    ]}
                    onPress={() => handleToggleStatus(staff)}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        staff.isActive ? { color: colors.danger } : { color: colors.success },
                      ]}
                    >
                      {staff.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.modal]}>
            <Text style={styles.modalTitle}>
              {editingStaffId ? 'Edit Staff Profile' : 'Enroll Mess Worker'}
            </Text>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Role *</Text>
            <View style={styles.roleGrid}>
              {(['COOK', 'SERVER', 'CLEANING_STAFF', 'FOOD_TRANSFER', 'OTHER'] as MessStaffRole[]).map(
                (r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleSelectChip, role === r && styles.roleSelectActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text
                      style={[styles.roleSelectText, role === r && styles.roleSelectTextActive]}
                    >
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.inputLabel}>Expected Shift Start (24h HH:mm) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="06:30"
              placeholderTextColor={colors.textSecondary}
              value={expectedStartTime}
              onChangeText={setExpectedStartTime}
            />

            <Text style={styles.inputLabel}>Contact Phone (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveStaff}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {editingStaffId ? 'Save Changes' : 'Enroll Worker'}
                  </Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  backButtonText: { color: colors.primary, fontSize: typography.bodyMedium.fontSize, fontWeight: '600' },
  headerTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.bodySmall.fontSize },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.xs },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    paddingVertical: spacing.sm,
  },
  clearSearch: { color: colors.textSecondary, fontSize: 16, padding: spacing.xs },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: typography.bodySmall.fontSize, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  staffCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  staffName: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  staffRole: { fontSize: typography.bodySmall.fontSize, color: colors.primaryLight, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: colors.success },
  textInactive: { color: colors.danger },
  staffDetails: { marginVertical: spacing.sm },
  detailItem: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, marginBottom: 3 },
  boldText: { color: colors.text, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  deactivateBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  activateBtn: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  actionBtnText: { fontSize: typography.bodySmall.fontSize, fontWeight: '600', color: colors.text },
  emptyCard: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xl },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.sm },
  emptyTitle: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  emptySubtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    marginBottom: spacing.md,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  roleSelectChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleSelectActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleSelectText: { fontSize: typography.caption.fontSize, color: colors.textSecondary, fontWeight: '600' },
  roleSelectTextActive: { color: colors.white },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  modalCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  modalSubmitText: { color: colors.white, fontWeight: '700' },
});
