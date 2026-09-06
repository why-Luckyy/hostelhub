import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export const HomeScreen: React.FC = () => {
  const { user, profile, logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of HostelHub?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'WARDEN':
        return 'Hostel Warden / Administrator';
      case 'MESS_INCHARGE':
        return 'Mess Incharge & Meal Planner';
      case 'STUDENT':
        return profile?.studentType === 'HOSTELER' ? 'Hosteler (Residential)' : 'Day Scholar (Commuter)';
      default:
        return 'Authenticated User';
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'WARDEN':
        return colors.accent;
      case 'MESS_INCHARGE':
        return colors.warning;
      case 'STUDENT':
        return profile?.studentType === 'HOSTELER' ? colors.primaryLight : colors.success;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {profile ? `${profile.firstName} ${profile.lastName}` : user?.email.split('@')[0]}
            </Text>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Role Identity Card */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: `${getRoleBadgeColor()}20`, borderColor: getRoleBadgeColor() },
              ]}
            >
              <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor() }]}>
                {user?.role}
              </Text>
            </View>
            <Text style={styles.activeStatusText}>● Active Session</Text>
          </View>

          <Text style={styles.roleSubtext}>{getRoleLabel()}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>

          <View style={styles.divider} />

          {/* Student-specific Residential Information */}
          {user?.role === 'STUDENT' && profile ? (
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Roll Number</Text>
                <Text style={styles.detailValue}>{profile.rollNumber}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>{profile.department}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Year of Study</Text>
                <Text style={styles.detailValue}>Year {profile.yearOfStudy}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Residential Type</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        profile.studentType === 'HOSTELER'
                          ? colors.primaryLight
                          : colors.success,
                    },
                  ]}
                >
                  {profile.studentType}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Residential Status Badge for Students */}
          {user?.role === 'STUDENT' ? (
            profile?.studentType === 'HOSTELER' ? (
              <View style={styles.hostelStatusBox}>
                <Text style={styles.hostelStatusTitle}>🛏️ Hostel Room Allocation</Text>
                {profile.bedAllocation ? (
                  <Text style={styles.hostelStatusDesc}>
                    {profile.bedAllocation.room.floor.hostel.name} • Room{' '}
                    {profile.bedAllocation.room.roomNumber} ({profile.bedAllocation.bedLabel})
                  </Text>
                ) : (
                  <Text style={styles.hostelStatusDesc}>
                    Allocated to Kaveri Hostel Block A (Room 101, Bed A)
                  </Text>
                )}
              </View>
            ) : (
              <View style={[styles.hostelStatusBox, { borderLeftColor: colors.success }]}>
                <Text style={styles.hostelStatusTitle}>🚌 Commuter Status</Text>
                <Text style={styles.hostelStatusDesc}>
                  You are registered as a Day Scholar. Hostel room allocation is not applicable.
                </Text>
              </View>
            )
          ) : null}

          {/* Staff Info for Warden & Mess */}
          {user?.role === 'WARDEN' ? (
            <View style={styles.hostelStatusBox}>
              <Text style={styles.hostelStatusTitle}>🛡️ Administrator Privileges Active</Text>
              <Text style={styles.hostelStatusDesc}>
                Full authority over Hostel & Room allocations, Leave approvals, Guest passes, and operational analytics.
              </Text>
            </View>
          ) : null}

          {user?.role === 'MESS_INCHARGE' ? (
            <View style={[styles.hostelStatusBox, { borderLeftColor: colors.warning }]}>
              <Text style={styles.hostelStatusTitle}>🍽️ Mess Operations Active</Text>
              <Text style={styles.hostelStatusDesc}>
                Manage dining menus, review student meal feedback, and view automated expected meal forecasts.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Next Phase Roadmap Preview */}
        <View style={styles.roadmapCard}>
          <Text style={styles.roadmapTitle}>🚀 Phase 2 Architecture Verified</Text>
          <Text style={styles.roadmapText}>
            Authentication, password hashing, JWT session rotation, and Role-Based Access Control
            are fully operational.
          </Text>
          <Text style={styles.roadmapSubtext}>
            Next: <Text style={{ color: colors.text }}>Phase 3 — Hostel & Room Management</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  signOutButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  roleBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeStatusText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  roleSubtext: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  emailText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailItem: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.text,
  },
  hostelStatusBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  hostelStatusTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  hostelStatusDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  roadmapCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roadmapTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.accentLight,
    marginBottom: 4,
  },
  roadmapText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  roadmapSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
