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
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { PresenceStatusResponse, CampusPresenceLog } from '../../types';

interface CampusPresenceScreenProps {
  onBack: () => void;
}

export const CampusPresenceScreen: React.FC<CampusPresenceScreenProps> = ({ onBack }) => {
  const [statusData, setStatusData] = useState<PresenceStatusResponse | null>(null);
  const [history, setHistory] = useState<CampusPresenceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadStatusAndHistory();
  }, []);

  const loadStatusAndHistory = async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        apiClient.get('/presence/my-status'),
        apiClient.get('/presence/my-history?limit=10'),
      ]);

      if (statusRes.data?.data) {
        setStatusData(statusRes.data.data);
      }
      if (historyRes.data?.data) {
        setHistory(historyRes.data.data);
      }
    } catch (error) {
      console.log('Error loading campus presence status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatusAndHistory();
  };

  const handleVerifyPresence = async () => {
    setVerifying(true);
    try {
      // 1. Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          'Location Disabled',
          'Device location services are turned off. Please enable GPS in your device settings to verify campus presence.'
        );
        setVerifying(false);
        return;
      }

      // 2. Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'HostelHub needs foreground location access to verify your campus presence. Please allow location permission in settings.'
        );
        setVerifying(false);
        return;
      }

      // 3. Obtain current coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = location.coords;

      // 4. Submit raw coordinates to backend for authoritative verification
      const res = await apiClient.post('/presence/verify', {
        latitude,
        longitude,
        accuracyMeters: accuracy || 15,
        clientTimestamp: new Date().toISOString(),
      });

      if (res.data?.data) {
        const result = res.data.data;
        Alert.alert(
          result.isInside ? 'Campus Presence Confirmed' : 'Outside Campus',
          result.isInside
            ? `Verified: You are currently INSIDE the university campus. Distance from campus center: ${result.calculatedDistance} m.`
            : `Verified: You are currently OUTSIDE the university campus. Distance from campus center: ${result.calculatedDistance} m.`
        );
      }

      loadStatusAndHistory();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        'Unable to verify campus presence. Please ensure you have an active GPS signal and internet connection.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setVerifying(false);
    }
  };

  const isInside = statusData?.status === 'INSIDE';
  const hasVerified = statusData?.hasVerified;
  const latest = statusData?.latestLog;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Presence</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadStatusAndHistory}>
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
        {/* Informational Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>
            ℹ️ Campus Presence verification uses GPS to confirm physical proximity to university campus grounds for residential management and campus safety. This does NOT constitute proof of classroom or lecture attendance.
          </Text>
        </View>

        {/* Current Presence Status Card */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginVertical: 30 }} />
        ) : (
          <View
            style={[
              styles.statusCard,
              shadows.card,
              hasVerified
                ? isInside
                  ? styles.cardInside
                  : styles.cardOutside
                : styles.cardUnverified,
            ]}
          >
            <View style={styles.statusHeaderRow}>
              <Text style={styles.statusIcon}>
                {hasVerified ? (isInside ? '🟢' : '🔴') : '⚪'}
              </Text>
              <View style={styles.statusTitleCol}>
                <Text style={styles.statusSubLabel}>Current Verified Presence</Text>
                <Text style={styles.statusMainLabel}>
                  {hasVerified
                    ? isInside
                      ? 'INSIDE CAMPUS'
                      : 'OUTSIDE CAMPUS'
                    : 'NOT YET VERIFIED TODAY'}
                </Text>
              </View>
            </View>

            {latest && (
              <View style={styles.metricsContainer}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Distance from campus center:</Text>
                  <Text style={styles.metricValue}>{latest.calculatedDistance} m</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Perimeter boundary offset:</Text>
                  <Text style={[styles.metricValue, { color: isInside ? colors.success : colors.warning }]}>
                    {isInside
                      ? `${latest.distanceFromBoundary} m inside perimeter`
                      : `${latest.distanceFromBoundary} m outside perimeter`}
                  </Text>
                </View>

                {latest.accuracyMeters && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>GPS Signal Accuracy:</Text>
                    <Text style={styles.metricValue}>±{Math.round(latest.accuracyMeters)} m</Text>
                  </View>
                )}

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Last Verified:</Text>
                  <Text style={styles.metricValue}>
                    {new Date(latest.recordedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    •{' '}
                    {new Date(latest.recordedAt).toLocaleDateString([], {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
            )}

            {statusData?.geofence && (
              <View style={styles.geofenceMetaBox}>
                <Text style={styles.geofenceMetaText}>
                  Zone: {statusData.geofence.name} (Radius: {statusData.geofence.radiusMeters} m)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Verification Action Button */}
        <TouchableOpacity
          style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
          onPress={handleVerifyPresence}
          disabled={verifying}
        >
          {verifying ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.verifyButtonText}>Obtaining GPS & Verifying...</Text>
            </View>
          ) : (
            <Text style={styles.verifyButtonText}>📍 Verify Campus Presence</Text>
          )}
        </TouchableOpacity>

        {/* History Header */}
        <View style={styles.historyHeaderRow}>
          <Text style={styles.sectionTitle}>Verification History</Text>
          <Text style={styles.historySubtext}>Recent check-in logs</Text>
        </View>

        {/* History List */}
        {history.length === 0 ? (
          <View style={styles.emptyHistoryBox}>
            <Text style={styles.emptyHistoryIcon}>📍</Text>
            <Text style={styles.emptyHistoryTitle}>No Presence Logs</Text>
            <Text style={styles.emptyHistorySub}>
              Tap the button above to perform your first GPS campus presence verification.
            </Text>
          </View>
        ) : (
          history.map((item) => {
            const timeStr = new Date(item.recordedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = new Date(item.recordedAt).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
            });

            return (
              <View key={item.id} style={[styles.historyCard, shadows.card]}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyStatusBadge}>
                    {item.isInside ? '🟢 Inside' : '🔴 Outside'}
                  </Text>
                  <Text style={styles.historyDistance}>
                    Distance: {item.calculatedDistance} m from center
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Text style={styles.historyTime}>{timeStr}</Text>
                  <Text style={styles.historyDate}>{dateStr}</Text>
                </View>
              </View>
            );
          })
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
  disclaimerBanner: {
    backgroundColor: `${colors.info}18`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.info}35`,
  },
  disclaimerText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInside: {
    borderColor: colors.success,
    backgroundColor: '#0F2520',
  },
  cardOutside: {
    borderColor: colors.danger,
    backgroundColor: '#261418',
  },
  cardUnverified: {
    borderColor: colors.border,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusIcon: {
    fontSize: 28,
  },
  statusTitleCol: {
    flex: 1,
  },
  statusSubLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusMainLabel: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
  },
  metricsContainer: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  geofenceMetaBox: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  geofenceMetaText: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
  },
  historySubtext: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyHistoryIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  emptyHistoryTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyHistorySub: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall.fontSize,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLeft: {
    gap: 4,
  },
  historyStatusBadge: {
    color: colors.text,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '700',
  },
  historyDistance: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyTime: {
    color: colors.text,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
