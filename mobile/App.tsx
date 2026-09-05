import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from './src/constants/theme';

export default function App() {
  const foundationChecks = [
    { label: 'Mobile Architecture', desc: 'Expo + TypeScript + SecureStore Ready', status: 'Ready' },
    { label: 'Backend API Service', desc: 'Express + Prisma + Layered Architecture', status: 'Ready' },
    { label: 'PostgreSQL Models', desc: '17 Relational Models & Integrity Enums', status: 'Ready' },
    { label: 'Role-Based Access (RBAC)', desc: 'Student (Hosteler/Day), Warden, Mess Incharge', status: 'Ready' },
    { label: 'Git & Version Control', desc: 'Connected to GitHub Remote Repository', status: 'Ready' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>PHASE 1 FOUNDATION</Text>
          </View>
          <Text style={styles.title}>HostelHub</Text>
          <Text style={styles.subtitle}>
            Smart Hostel & Campus Management System
          </Text>
        </View>

        {/* Foundation Card */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeader}>System Foundation Status</Text>
          <Text style={styles.cardDescription}>
            The technical architecture and database foundations are verified and ready for Phase 2 implementation.
          </Text>

          <View style={styles.divider} />

          {foundationChecks.map((item, index) => (
            <View key={index} style={styles.checkRow}>
              <View style={styles.statusIndicator} />
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <Text style={styles.checkDesc}>{item.desc}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Learning & Mentorship Note */}
        <View style={styles.mentorCard}>
          <Text style={styles.mentorTitle}>🎓 Engineering Mentorship Note</Text>
          <Text style={styles.mentorText}>
            We build incrementally: <Text style={styles.highlight}>Plan → Implement → Test → Review → Commit</Text>.
            The core architecture separates concerns cleanly: the mobile app handles presentation and secure token storage, while the backend strictly enforces RBAC permissions and business calculations.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            HostelHub v1.0.0 • University Software Engineering Project
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  badgePill: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  badgePillText: {
    color: colors.primaryLight,
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  checkTextContainer: {
    flex: 1,
  },
  checkLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.text,
  },
  checkDesc: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  statusBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  mentorCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginBottom: spacing.xl,
  },
  mentorTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.accentLight,
    marginBottom: spacing.xs,
  },
  mentorText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  highlight: {
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
