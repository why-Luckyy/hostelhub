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
  Modal,
  RefreshControl,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { PresenceSummary, CampusPresenceLog } from '../../types';

interface CampusPresenceDashboardScreenProps {
  onBack: () => void;
}

export const CampusPresenceDashboardScreen: React.FC<CampusPresenceDashboardScreenProps> = ({
  onBack,
}) => {
  const [summary, setSummary] = useState<PresenceSummary | null>(null);
  const [students, setStudents] = useState<CampusPresenceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INSIDE' | 'OUTSIDE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Geofence Edit Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [geoName, setGeoName] = useState<string>('');
  const [geoLat, setGeoLat] = useState<string>('');
  const [geoLon, setGeoLon] = useState<string>('');
  const [geoRadius, setGeoRadius] = useState<string>('');
  const [savingGeofence, setSavingGeofence] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = '/presence/students';
      if (activeFilter !== 'ALL') {
        url += `?isInside=${activeFilter === 'INSIDE'}`;
      }

      const [summaryRes, studentsRes] = await Promise.all([
        apiClient.get('/presence/summary'),
        apiClient.get(url),
      ]);

      if (summaryRes.data?.data) {
        setSummary(summaryRes.data.data);
      }
      if (studentsRes.data?.data) {
        setStudents(studentsRes.data.data);
      }
    } catch (error) {
      console.log('Error loading presence dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openGeofenceModal = () => {
    if (summary?.activeGeofence) {
      setGeoName(summary.activeGeofence.name);
      setGeoLat(String(summary.activeGeofence.latitude));
      setGeoLon(String(summary.activeGeofence.longitude));
      setGeoRadius(String(summary.activeGeofence.radiusMeters));
    }
    setModalVisible(true);
  };

  const handleSaveGeofence = async () => {
    const latNum = parseFloat(geoLat);
    const lonNum = parseFloat(geoLon);
    const radiusNum = parseFloat(geoRadius);

    if (!geoName.trim() || geoName.trim().length < 3) {
      Alert.alert('Validation Error', 'Geofence name must be at least 3 characters.');
      return;
    }
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      Alert.alert('Validation Error', 'Latitude must be between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      Alert.alert('Validation Error', 'Longitude must be between -180 and 180.');
      return;
    }
    if (isNaN(radiusNum) || radiusNum <= 0) {
      Alert.alert('Validation Error', 'Radius must be a positive number in meters.');
      return;
    }

    setSavingGeofence(true);
    try {
      if (summary?.activeGeofence?.id) {
        await apiClient.put(`/presence/geofence/${summary.activeGeofence.id}`, {
          name: geoName.trim(),
          latitude: latNum,
          longitude: lonNum,
          radiusMeters: radiusNum,
          isActive: true,
        });
      } else {
        await apiClient.post('/presence/geofence', {
          name: geoName.trim(),
          latitude: latNum,
          longitude: lonNum,
          radiusMeters: radiusNum,
          isActive: true,
        });
      }

      Alert.alert('Success', 'Campus Geofence configuration updated.');
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Could not update geofence.');
    } finally {
      setSavingGeofence(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const roll = s.studentProfile?.rollNumber.toLowerCase() || '';
    const name = `${s.studentProfile?.firstName} ${s.studentProfile?.lastName}`.toLowerCase();
    const dept = s.studentProfile?.department?.toLowerCase() || '';
    return roll.includes(q) || name.includes(q) || dept.includes(q);
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Presence</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

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
        {/* Metric Summary Grid */}
        {summary && (
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricIcon}>🟢</Text>
              <Text style={[styles.metricNumber, { color: colors.success }]}>
                {summary.insideCount}
              </Text>
              <Text style={styles.metricLabel}>Inside Campus</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricIcon}>🔴</Text>
              <Text style={[styles.metricNumber, { color: colors.danger }]}>
                {summary.outsideCount}
              </Text>
              <Text style={styles.metricLabel}>Outside Campus</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricIcon}>📋</Text>
              <Text style={[styles.metricNumber, { color: colors.accent }]}>
                {summary.verifiedCount}
              </Text>
              <Text style={styles.metricLabel}>Total Verified</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricIcon}>👥</Text>
              <Text style={[styles.metricNumber, { color: colors.textSecondary }]}>
                {summary.totalRegisteredStudents}
              </Text>
              <Text style={styles.metricLabel}>Registered</Text>
            </View>
          </View>
        )}

        {/* Geofence Configuration Banner */}
        {summary?.activeGeofence && (
          <View style={[styles.geofenceCard, shadows.card]}>
            <View style={styles.geofenceHeaderRow}>
              <View>
                <Text style={styles.geofenceTitle}>📍 {summary.activeGeofence.name}</Text>
                <Text style={styles.geofenceSub}>
                  Center: {Number(summary.activeGeofence.latitude).toFixed(4)}° N, {Number(summary.activeGeofence.longitude).toFixed(4)}° E
                </Text>
                <Text style={styles.geofenceRadius}>
                  Radius: {summary.activeGeofence.radiusMeters} m
                </Text>
              </View>

              <TouchableOpacity style={styles.editGeofenceBtn} onPress={openGeofenceModal}>
                <Text style={styles.editGeofenceBtnText}>⚙️ Configure</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section Title */}
        <Text style={styles.sectionHeading}>Student Presence Log</Text>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search student by name, roll number, dept..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {(['ALL', 'INSIDE', 'OUTSIDE'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeFilter === tab && styles.tabActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text style={[styles.tabText, activeFilter === tab && styles.tabTextActive]}>
                {tab === 'ALL' ? 'All Verified' : tab === 'INSIDE' ? '🟢 Inside Campus' : '🔴 Outside Campus'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Students List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginVertical: 30 }} />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Presence Records Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No student matching "${searchQuery}" found in current presence logs.`
                : 'No students have checked in under this filter.'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((log) => {
            const timeStr = new Date(log.recordedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = new Date(log.recordedAt).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
            });

            return (
              <View key={log.id} style={[styles.studentCard, shadows.card]}>
                <View style={styles.studentInfoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.studentName}>
                      {log.studentProfile?.firstName} {log.studentProfile?.lastName}
                    </Text>
                    <View
                      style={[
                        styles.studentTypeBadge,
                        {
                          backgroundColor:
                            log.studentProfile?.studentType === 'HOSTELER'
                              ? `${colors.primaryLight}22`
                              : `${colors.accent}22`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.studentTypeText,
                          {
                            color:
                              log.studentProfile?.studentType === 'HOSTELER'
                                ? colors.primaryLight
                                : colors.accent,
                          },
                        ]}
                      >
                        {log.studentProfile?.studentType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.studentMeta}>
                    Roll: {log.studentProfile?.rollNumber} • {log.studentProfile?.department}
                  </Text>
                  <Text style={styles.distanceText}>
                    Distance: {log.calculatedDistance} m from campus center
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  <View
                    style={[
                      styles.presenceBadge,
                      {
                        backgroundColor:
                          log.isInside ? `${colors.success}22` : `${colors.danger}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presenceBadgeText,
                        { color: log.isInside ? colors.success : colors.danger },
                      ]}
                    >
                      {log.isInside ? 'INSIDE' : 'OUTSIDE'}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{timeStr}</Text>
                  <Text style={styles.dateText}>{dateStr}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Geofence Configuration Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadows.modal]}>
            <Text style={styles.modalTitle}>Configure Campus Geofence</Text>
            <Text style={styles.modalSub}>
              Update the circular campus perimeter boundary used for presence verification.
            </Text>

            <Text style={styles.inputLabel}>Campus / Zone Name *</Text>
            <TextInput
              style={styles.textInput}
              value={geoName}
              onChangeText={setGeoName}
              placeholder="e.g. Main University Campus"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.latLonRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Latitude (-90 to 90) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={geoLat}
                  onChangeText={setGeoLat}
                  keyboardType="numeric"
                  placeholder="12.9716"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Longitude (-180 to 180) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={geoLon}
                  onChangeText={setGeoLon}
                  keyboardType="numeric"
                  placeholder="77.5946"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Perimeter Radius (Meters) *</Text>
            <TextInput
              style={styles.textInput}
              value={geoRadius}
              onChangeText={setGeoRadius}
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={savingGeofence}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveGeofence}
                disabled={savingGeofence}
              >
                {savingGeofence ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Geofence</Text>
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
    fontWeight: '600',
  },
  geofenceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  geofenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  geofenceTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
  },
  geofenceSub: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  geofenceRadius: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginTop: 2,
  },
  editGeofenceBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editGeofenceBtnText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    padding: spacing.md,
    fontSize: typography.bodyMedium.fontSize,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentInfoCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  studentName: {
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '700',
  },
  studentTypeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  studentTypeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  studentMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  distanceText: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  presenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  presenceBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  timeText: {
    color: colors.text,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    marginTop: 2,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
  },
  modalSub: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    padding: spacing.sm,
    fontSize: typography.bodyMedium.fontSize,
  },
  latLonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    minWidth: 120,
    alignItems: 'center',
  },
  modalSaveText: {
    color: colors.white,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '700',
  },
});
