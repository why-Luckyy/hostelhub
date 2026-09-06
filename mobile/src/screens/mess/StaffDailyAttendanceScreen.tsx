import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import {
  DailyStaffAttendanceSummary,
  DailyStaffAttendanceItem,
  StaffAttendanceStatus,
} from '../../types';

interface StaffDailyAttendanceScreenProps {
  onBack: () => void;
  readOnly?: boolean;
}

export const StaffDailyAttendanceScreen: React.FC<StaffDailyAttendanceScreenProps> = ({
  onBack,
  readOnly = false,
}) => {
  const [data, setData] = useState<DailyStaffAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PRESENT' | 'LATE' | 'ABSENT'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Manual mark modal state
  const [markModalVisible, setMarkModalVisible] = useState(false);
  const [selectedStaffItem, setSelectedStaffItem] = useState<DailyStaffAttendanceItem | null>(null);
  const [markStatus, setMarkStatus] = useState<StaffAttendanceStatus>('ABSENT');
  const [remarks, setRemarks] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchTodayRoster();
  }, []);

  const fetchTodayRoster = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/mess/staff/attendance/today');
      setData(res.data.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load today staff roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = async (staffId: string) => {
    try {
      setActionLoadingId(staffId);
      const res = await apiClient.post('/mess/staff/attendance/check-in', {
        staffId,
      });
      const att = res.data.data;
      if (att.isLate) {
        Alert.alert('Late Arrival Recorded', `Staff checked in ${att.lateMinutes} mins late.`);
      } else {
        Alert.alert('Success', 'Staff checked in on time.');
      }
      fetchTodayRoster();
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.response?.data?.message || 'Unable to check in staff.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckOut = async (staffId: string) => {
    try {
      setActionLoadingId(staffId);
      await apiClient.post('/mess/staff/attendance/check-out', {
        staffId,
      });
      Alert.alert('Checked Out', 'Staff check-out time recorded.');
      fetchTodayRoster();
    } catch (err: any) {
      Alert.alert('Check-Out Failed', err.response?.data?.message || 'Unable to check out staff.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenMarkModal = (item: DailyStaffAttendanceItem) => {
    setSelectedStaffItem(item);
    setMarkStatus(item.attendance?.status || 'ABSENT');
    setRemarks(item.attendance?.remarks || '');
    setMarkModalVisible(true);
  };

  const handleSaveMarkAttendance = async () => {
    if (!selectedStaffItem) return;

    try {
      setMarking(true);
      await apiClient.post('/mess/staff/attendance/mark', {
        staffId: selectedStaffItem.staff.id,
        status: markStatus,
        remarks: remarks.trim() || null,
      });
      setMarkModalVisible(false);
      Alert.alert('Success', `Attendance recorded as ${markStatus}.`);
      fetchTodayRoster();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark attendance.');
    } finally {
      setMarking(false);
    }
  };

  const formatTimeStr = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  const records = data?.records || [];
  const filteredRecords = records.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return r.isPending;
    return r.attendance?.status === filter;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Daily Staff Attendance</Text>
          <Text style={styles.headerSub}>{data?.date || 'Today'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTodayRoster}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
            <Text style={styles.metricVal}>{data?.presentCount || 0}</Text>
            <Text style={styles.metricLabel}>On-Time</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
            <Text style={styles.metricVal}>{data?.lateCount || 0}</Text>
            <Text style={styles.metricLabel}>Late</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: colors.danger }]}>
            <Text style={styles.metricVal}>{data?.absentCount || 0}</Text>
            <Text style={styles.metricLabel}>Absent</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: colors.textSecondary }]}>
            <Text style={styles.metricVal}>{data?.pendingCount || 0}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[
            { label: `All (${records.length})`, val: 'ALL' },
            { label: `Pending (${data?.pendingCount || 0})`, val: 'PENDING' },
            { label: `Present (${data?.presentCount || 0})`, val: 'PRESENT' },
            { label: `Late (${data?.lateCount || 0})`, val: 'LATE' },
            { label: `Absent (${data?.absentCount || 0})`, val: 'ABSENT' },
          ].map((f) => (
            <TouchableOpacity
              key={f.val}
              style={[styles.chip, filter === f.val && styles.chipActive]}
              onPress={() => setFilter(f.val as any)}
            >
              <Text style={[styles.chipText, filter === f.val && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Staff Attendance List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Records In This View</Text>
            <Text style={styles.emptySubtitle}>All active staff match other filter criteria.</Text>
          </View>
        ) : (
          filteredRecords.map((item) => {
            const { staff, attendance, isPending } = item;
            const isProcessing = actionLoadingId === staff.id;

            return (
              <View key={staff.id} style={[styles.rosterCard, shadows.card]}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffRole}>{staff.role.replace('_', ' ')}</Text>
                  </View>

                  {/* Status Badge */}
                  {isPending ? (
                    <View style={[styles.badge, styles.badgePending]}>
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                        NOT CHECKED IN
                      </Text>
                    </View>
                  ) : attendance?.status === 'PRESENT' ? (
                    <View style={[styles.badge, styles.badgePresent]}>
                      <Text style={[styles.badgeText, { color: colors.success }]}>ON-TIME</Text>
                    </View>
                  ) : attendance?.status === 'LATE' ? (
                    <View style={[styles.badge, styles.badgeLate]}>
                      <Text style={[styles.badgeText, { color: colors.warning }]}>
                        LATE (+{attendance.lateMinutes}m)
                      </Text>
                    </View>
                  ) : attendance?.status === 'ABSENT' ? (
                    <View style={[styles.badge, styles.badgeAbsent]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>ABSENT</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgeHalfDay]}>
                      <Text style={[styles.badgeText, { color: colors.accent }]}>HALF DAY</Text>
                    </View>
                  )}
                </View>

                {/* Shift & Time Details */}
                <View style={styles.timeInfoGrid}>
                  <Text style={styles.timeInfoText}>
                    ⏰ Shift: <Text style={styles.boldText}>{staff.expectedStartTime}</Text>
                  </Text>
                  <Text style={styles.timeInfoText}>
                    🟢 In: <Text style={styles.boldText}>{formatTimeStr(attendance?.checkInTime)}</Text>
                  </Text>
                  <Text style={styles.timeInfoText}>
                    🔴 Out: <Text style={styles.boldText}>{formatTimeStr(attendance?.checkOutTime)}</Text>
                  </Text>
                </View>

                {attendance?.remarks ? (
                  <Text style={styles.remarksText}>💬 Note: {attendance.remarks}</Text>
                ) : null}

                {/* Supervisor Action Row */}
                {!readOnly ? (
                  <View style={styles.actionRow}>
                    {isPending ? (
                      <>
                        <TouchableOpacity
                          style={[styles.btn, styles.checkInBtn]}
                          onPress={() => handleQuickCheckIn(staff.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <Text style={styles.checkInBtnText}>✓ Check In</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btn, styles.markOtherBtn]}
                          onPress={() => handleOpenMarkModal(item)}
                          disabled={isProcessing}
                        >
                          <Text style={styles.markOtherBtnText}>Mark Absent / Other</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {!attendance?.checkOutTime &&
                        (attendance?.status === 'PRESENT' || attendance?.status === 'LATE') ? (
                          <TouchableOpacity
                            style={[styles.btn, styles.checkOutBtn]}
                            onPress={() => handleCheckOut(staff.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                              <Text style={styles.checkOutBtnText}>⏱️ Check Out</Text>
                            )}
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={[styles.btn, styles.editAttendanceBtn]}
                          onPress={() => handleOpenMarkModal(item)}
                          disabled={isProcessing}
                        >
                          <Text style={styles.editAttendanceBtnText}>Override / Note</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Manual Mark / Override Modal */}
      <Modal visible={markModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.modal]}>
            <Text style={styles.modalTitle}>
              Mark Attendance: {selectedStaffItem?.staff.name}
            </Text>

            <Text style={styles.inputLabel}>Select Status *</Text>
            <View style={styles.statusSelectRow}>
              {(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'] as StaffAttendanceStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusChip, markStatus === st && styles.statusChipActive]}
                  onPress={() => setMarkStatus(st)}
                >
                  <Text
                    style={[styles.statusChipText, markStatus === st && styles.statusChipTextActive]}
                  >
                    {st.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Supervisor Remarks (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="e.g. Medical leave approved / Early shift cover"
              placeholderTextColor={colors.textSecondary}
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMarkModalVisible(false)}
                disabled={marking}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveMarkAttendance}
                disabled={marking}
              >
                {marking ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Attendance</Text>
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
  headerTitle: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: typography.caption.fontSize, color: colors.textSecondary, marginTop: 2 },
  refreshBtn: { padding: spacing.xs },
  refreshText: { fontSize: 18 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderLeftWidth: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricVal: { fontSize: typography.bodyLarge.fontSize, fontWeight: '800', color: colors.text },
  metricLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  chipScroll: { marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: typography.bodySmall.fontSize, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  rosterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  staffName: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  staffRole: { fontSize: typography.bodySmall.fontSize, color: colors.primaryLight, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgePending: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  badgePresent: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeLate: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  badgeAbsent: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  badgeHalfDay: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  timeInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  timeInfoText: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary },
  boldText: { color: colors.text, fontWeight: '700' },
  remarksText: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, fontStyle: 'italic', marginBottom: spacing.xs },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.md },
  checkInBtn: { backgroundColor: colors.success },
  checkInBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.caption.fontSize },
  markOtherBtn: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  markOtherBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: typography.caption.fontSize },
  checkOutBtn: { backgroundColor: colors.primary },
  checkOutBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.caption.fontSize },
  editAttendanceBtn: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  editAttendanceBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: typography.caption.fontSize },
  emptyCard: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xl },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.sm },
  emptyTitle: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text, marginBottom: spacing.lg, textAlign: 'center' },
  inputLabel: { fontSize: typography.caption.fontSize, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  statusSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: typography.caption.fontSize, color: colors.textSecondary, fontWeight: '600' },
  statusChipTextActive: { color: colors.white },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  modalCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalSubmitBtn: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md },
  modalSubmitText: { color: colors.white, fontWeight: '700' },
});
