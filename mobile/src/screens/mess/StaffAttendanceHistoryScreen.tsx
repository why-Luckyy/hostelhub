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
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { StaffAttendance, MessStaffRole, StaffAttendanceStatus } from '../../types';

interface StaffAttendanceHistoryScreenProps {
  onBack: () => void;
}

export const StaffAttendanceHistoryScreen: React.FC<StaffAttendanceHistoryScreenProps> = ({
  onBack,
}) => {
  const [logs, setLogs] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Filters
  const [selectedRole, setSelectedRole] = useState<MessStaffRole | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StaffAttendanceStatus | 'ALL'>('ALL');
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('7D');

  useEffect(() => {
    fetchHistory();
    fetchSummary();
  }, [selectedRole, selectedStatus, timeRange]);

  const getDateRangeParams = () => {
    const params: any = {};
    const now = new Date();

    if (timeRange === '7D') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      params.startDate = past.toISOString().split('T')[0];
    } else if (timeRange === '30D') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      params.startDate = past.toISOString().split('T')[0];
    }

    if (selectedRole !== 'ALL') params.role = selectedRole;
    if (selectedStatus !== 'ALL') params.status = selectedStatus;

    return params;
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = getDateRangeParams();
      const res = await apiClient.get('/mess/staff/attendance/history', { params });
      setLogs(res.data.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch attendance history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = getDateRangeParams();
      const res = await apiClient.get('/mess/staff/attendance/summary', { params });
      setSummary(res.data.data);
    } catch {
      // Summary error fallback
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '--:--';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Attendance History</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Time Range Chips */}
        <View style={styles.timeRangeRow}>
          {(['7D', '30D', 'ALL'] as const).map((tr) => (
            <TouchableOpacity
              key={tr}
              style={[styles.rangeBtn, timeRange === tr && styles.rangeBtnActive]}
              onPress={() => setTimeRange(tr)}
            >
              <Text style={[styles.rangeText, timeRange === tr && styles.rangeTextActive]}>
                {tr === '7D' ? 'Last 7 Days' : tr === '30D' ? 'Last 30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        {summary ? (
          <View style={[styles.summaryCard, shadows.card]}>
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>Period Punctuality</Text>
              <Text style={styles.pctBadge}>{summary.onTimePercentage}% On-Time</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.sumVal}>{summary.totalRecords}</Text>
                <Text style={styles.sumLabel}>Total Logs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.sumVal, { color: colors.success }]}>
                  {summary.presentCount}
                </Text>
                <Text style={styles.sumLabel}>On-Time</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.sumVal, { color: colors.warning }]}>{summary.lateCount}</Text>
                <Text style={styles.sumLabel}>Late</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.sumVal, { color: colors.danger }]}>{summary.absentCount}</Text>
                <Text style={styles.sumLabel}>Absent</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[
            { label: 'All Statuses', val: 'ALL' },
            { label: 'Present', val: 'PRESENT' },
            { label: 'Late', val: 'LATE' },
            { label: 'Absent', val: 'ABSENT' },
            { label: 'Half Day', val: 'HALF_DAY' },
          ].map((s) => (
            <TouchableOpacity
              key={s.val}
              style={[styles.chip, selectedStatus === s.val && styles.chipActive]}
              onPress={() => setSelectedStatus(s.val as any)}
            >
              <Text style={[styles.chipText, selectedStatus === s.val && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Logs List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
            <Text style={styles.emptySubtitle}>No records match the chosen filter parameters.</Text>
          </View>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={[styles.logCard, shadows.card]}>
              <View style={styles.logHeader}>
                <View>
                  <Text style={styles.staffName}>{log.staff?.name || 'Staff'}</Text>
                  <Text style={styles.staffRole}>{log.staff?.role.replace('_', ' ')}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      log.status === 'PRESENT'
                        ? styles.badgePresent
                        : log.status === 'LATE'
                        ? styles.badgeLate
                        : styles.badgeAbsent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        log.status === 'PRESENT'
                          ? { color: colors.success }
                          : log.status === 'LATE'
                          ? { color: colors.warning }
                          : { color: colors.danger },
                      ]}
                    >
                      {log.status === 'LATE' ? `LATE (+${log.lateMinutes}m)` : log.status}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.logDetails}>
                <Text style={styles.detailText}>
                  🟢 In: <Text style={styles.boldText}>{formatTime(log.checkInTime)}</Text>
                </Text>
                <Text style={styles.detailText}>
                  🔴 Out: <Text style={styles.boldText}>{formatTime(log.checkOutTime)}</Text>
                </Text>
                <Text style={styles.detailText}>
                  ⏰ Shift: <Text style={styles.boldText}>{log.expectedStartTime || '06:30'}</Text>
                </Text>
              </View>

              {log.remarks ? <Text style={styles.remarks}>💬 {log.remarks}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
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
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  timeRangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rangeBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, fontWeight: '600' },
  rangeTextActive: { color: colors.white },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryTitle: { fontSize: typography.bodyMedium.fontSize, fontWeight: '700', color: colors.text },
  pctBadge: { fontSize: typography.caption.fontSize, fontWeight: '700', color: colors.success },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  sumVal: { fontSize: typography.bodyLarge.fontSize, fontWeight: '800', color: colors.text },
  sumLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
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
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  staffName: { fontSize: typography.bodyMedium.fontSize, fontWeight: '700', color: colors.text },
  staffRole: { fontSize: typography.bodySmall.fontSize, color: colors.primaryLight, fontWeight: '600' },
  headerRight: { alignItems: 'flex-end' },
  logDate: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgePresent: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeLate: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  badgeAbsent: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  statusText: { fontSize: 10, fontWeight: '700' },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  detailText: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary },
  boldText: { color: colors.text, fontWeight: '700' },
  remarks: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  emptyCard: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xl },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.sm },
  emptyTitle: { fontSize: typography.bodyLarge.fontSize, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: typography.bodySmall.fontSize, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});
