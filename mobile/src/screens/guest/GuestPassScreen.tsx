import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { GuestPass } from '../../types';

interface Props {
  onBack: () => void;
}

export const GuestPassScreen: React.FC<Props> = ({ onBack }) => {
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPasses();
  }, []);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/guest-passes/my-passes');
      if (res.data?.data) {
        setPasses(res.data.data);
      }
    } catch (err) {
      console.log('Error loading guest passes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issued Guest Passes</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : passes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎟️</Text>
            <Text style={styles.emptyText}>No active guest passes issued.</Text>
            <Text style={styles.emptySubtext}>
              Once a Warden approves your guest request, an official entry pass code will appear here.
            </Text>
          </View>
        ) : (
          passes.map((p) => {
            const validDateStr = new Date(p.validOn).toLocaleDateString();

            return (
              <View key={p.id} style={styles.ticketCard}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketHeaderLabel}>CAMPUS VISITOR PASS</Text>
                  <View
                    style={[
                      styles.gateBadge,
                      { backgroundColor: p.isVerifiedAtGate ? colors.success : colors.warning },
                    ]}
                  >
                    <Text style={styles.gateBadgeText}>
                      {p.isVerifiedAtGate ? 'VERIFIED AT GATE' : 'PENDING ENTRY'}
                    </Text>
                  </View>
                </View>

                {/* Secure Pass Code Display */}
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>OFFICIAL PASS CODE</Text>
                  <Text style={styles.codeText}>{p.passCode}</Text>
                </View>

                <View style={styles.ticketDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>VISITOR</Text>
                    <Text style={styles.detailValue}>{p.guestRequest?.guestName || 'Guest'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>VALID ON</Text>
                    <Text style={styles.detailValue}>{validDateStr}</Text>
                  </View>
                </View>

                <View style={styles.ticketFooter}>
                  <Text style={styles.footerNote}>
                    Present this pass code to campus security at the main gate for verification upon arrival.
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ticketHeaderLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  gateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  codeContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeText: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
  },
  ticketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
  },
  ticketFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
