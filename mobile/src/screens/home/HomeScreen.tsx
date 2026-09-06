import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

import { GatePassScreen } from '../gatepass/GatePassScreen';
import { CreateGatePassScreen } from '../gatepass/CreateGatePassScreen';
import { GuestRequestScreen } from '../guest/GuestRequestScreen';
import { GuestPassScreen } from '../guest/GuestPassScreen';
import { GatePassReviewScreen } from '../warden/GatePassReviewScreen';
import { GuestReviewScreen } from '../warden/GuestReviewScreen';

import { TodayMenuScreen } from '../mess/TodayMenuScreen';
import { WeeklyMenuScreen } from '../mess/WeeklyMenuScreen';
import { FeedbackScreen } from '../mess/FeedbackScreen';
import { MessDashboardScreen } from '../mess/MessDashboardScreen';
import { MenuManagementScreen } from '../mess/MenuManagementScreen';
import { FeedbackOverviewScreen } from '../mess/FeedbackOverviewScreen';

import { ComplaintsScreen } from '../complaints/ComplaintsScreen';
import { CreateComplaintScreen } from '../complaints/CreateComplaintScreen';
import { NoticesScreen } from '../notices/NoticesScreen';
import { FinesScreen } from '../fines/FinesScreen';
import { ComplaintManagementScreen } from '../warden/ComplaintManagementScreen';
import { NoticeManagementScreen } from '../warden/NoticeManagementScreen';
import { CreateEditNoticeScreen } from '../warden/CreateEditNoticeScreen';
import { FineManagementScreen } from '../warden/FineManagementScreen';
import { AssignFineScreen } from '../warden/AssignFineScreen';
import { Notice } from '../../types';

type ActiveScreen =
  | 'HOME'
  | 'GATE_PASS'
  | 'CREATE_GATE_PASS'
  | 'GUEST_REQUEST'
  | 'GUEST_PASS'
  | 'WARDEN_GATE_PASS_REVIEW'
  | 'WARDEN_GUEST_REVIEW'
  | 'TODAY_MENU'
  | 'WEEKLY_MENU'
  | 'MESS_FEEDBACK'
  | 'MESS_DASHBOARD'
  | 'MENU_MANAGEMENT'
  | 'FEEDBACK_OVERVIEW'
  | 'COMPLAINTS'
  | 'CREATE_COMPLAINT'
  | 'NOTICES'
  | 'FINES'
  | 'WARDEN_COMPLAINTS'
  | 'WARDEN_NOTICES'
  | 'WARDEN_CREATE_EDIT_NOTICE'
  | 'WARDEN_FINES'
  | 'WARDEN_ASSIGN_FINE';

interface MyAllocationResponse {
  isAllocated: boolean;
  message: string;
  allocation?: {
    id: string;
    bedId: string;
    bedLabel: string;
    allocatedFrom: string;
    room: {
      id: string;
      roomNumber: string;
      roomType: string;
      floor: {
        id: string;
        floorNumber: number;
        floorName: string;
        hostel: {
          id: string;
          name: string;
          code: string;
        };
      };
    };
  } | null;
}

interface HostelSummary {
  id: string;
  name: string;
  code: string;
  genderAllowed: string;
  totalFloors: number;
  isActive: boolean;
  stats: {
    totalFloorsRecorded: number;
    totalRooms: number;
    totalCapacity: number;
    totalOccupancy: number;
    totalVacant: number;
    occupancyRate: number;
  };
}

export const HomeScreen: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('HOME');
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [allocationData, setAllocationData] = useState<MyAllocationResponse | null>(null);
  const [hostels, setHostels] = useState<HostelSummary[]>([]);
  const [loadingPhase3, setLoadingPhase3] = useState<boolean>(false);

  useEffect(() => {
    loadPhase3Data();
  }, [user?.role]);

  const loadPhase3Data = async () => {
    if (!user) return;
    setLoadingPhase3(true);
    try {
      if (user.role === 'STUDENT') {
        const response = await apiClient.get('/allocations/my-allocation');
        if (response.data?.data) {
          setAllocationData(response.data.data);
        }
      } else if (user.role === 'WARDEN') {
        const response = await apiClient.get('/hostels');
        if (response.data?.data) {
          setHostels(response.data.data);
        }
      }
    } catch (error) {
      // Handled gracefully in UI state
      console.log('Phase 3 data load notice:', error);
    } finally {
      setLoadingPhase3(false);
    }
  };

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

  if (currentScreen === 'GATE_PASS') {
    return (
      <GatePassScreen
        onNavigateApply={() => setCurrentScreen('CREATE_GATE_PASS')}
        onBack={() => setCurrentScreen('HOME')}
      />
    );
  }

  if (currentScreen === 'CREATE_GATE_PASS') {
    return (
      <CreateGatePassScreen
        onSuccess={() => setCurrentScreen('GATE_PASS')}
        onBack={() => setCurrentScreen('GATE_PASS')}
      />
    );
  }

  if (currentScreen === 'GUEST_REQUEST') {
    return <GuestRequestScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'GUEST_PASS') {
    return <GuestPassScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'WARDEN_GATE_PASS_REVIEW') {
    return <GatePassReviewScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'WARDEN_GUEST_REVIEW') {
    return <GuestReviewScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'TODAY_MENU') {
    return (
      <TodayMenuScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateWeekly={() => setCurrentScreen('WEEKLY_MENU')}
      />
    );
  }

  if (currentScreen === 'WEEKLY_MENU') {
    return (
      <WeeklyMenuScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateToday={() => setCurrentScreen('TODAY_MENU')}
      />
    );
  }

  if (currentScreen === 'MESS_FEEDBACK') {
    return <FeedbackScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'MESS_DASHBOARD') {
    return (
      <MessDashboardScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateMenu={() => setCurrentScreen('MENU_MANAGEMENT')}
        onNavigateFeedback={() => setCurrentScreen('FEEDBACK_OVERVIEW')}
      />
    );
  }

  if (currentScreen === 'MENU_MANAGEMENT') {
    return <MenuManagementScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'FEEDBACK_OVERVIEW') {
    return <FeedbackOverviewScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'COMPLAINTS') {
    return (
      <ComplaintsScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateCreate={() => setCurrentScreen('CREATE_COMPLAINT')}
      />
    );
  }

  if (currentScreen === 'CREATE_COMPLAINT') {
    return (
      <CreateComplaintScreen
        onBack={() => setCurrentScreen('COMPLAINTS')}
        onSuccess={() => setCurrentScreen('COMPLAINTS')}
      />
    );
  }

  if (currentScreen === 'NOTICES') {
    return <NoticesScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'FINES') {
    return <FinesScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'WARDEN_COMPLAINTS') {
    return <ComplaintManagementScreen onBack={() => setCurrentScreen('HOME')} />;
  }

  if (currentScreen === 'WARDEN_NOTICES') {
    return (
      <NoticeManagementScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateCreate={() => {
          setEditingNotice(null);
          setCurrentScreen('WARDEN_CREATE_EDIT_NOTICE');
        }}
        onNavigateEdit={(notice) => {
          setEditingNotice(notice);
          setCurrentScreen('WARDEN_CREATE_EDIT_NOTICE');
        }}
      />
    );
  }

  if (currentScreen === 'WARDEN_CREATE_EDIT_NOTICE') {
    return (
      <CreateEditNoticeScreen
        initialNotice={editingNotice}
        onBack={() => setCurrentScreen('WARDEN_NOTICES')}
        onSuccess={() => setCurrentScreen('WARDEN_NOTICES')}
      />
    );
  }

  if (currentScreen === 'WARDEN_FINES') {
    return (
      <FineManagementScreen
        onBack={() => setCurrentScreen('HOME')}
        onNavigateAssign={() => setCurrentScreen('WARDEN_ASSIGN_FINE')}
      />
    );
  }

  if (currentScreen === 'WARDEN_ASSIGN_FINE') {
    return (
      <AssignFineScreen
        onBack={() => setCurrentScreen('WARDEN_FINES')}
        onSuccess={() => setCurrentScreen('WARDEN_FINES')}
      />
    );
  }

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

          {/* Student Profile Details */}
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

          {/* STUDENT: Phase 3 Allocation Status View */}
          {user?.role === 'STUDENT' ? (
            profile?.studentType === 'HOSTELER' ? (
              <View style={styles.hostelStatusBox}>
                <Text style={styles.hostelStatusTitle}>🛏️ Hostel & Bed Allocation</Text>
                {loadingPhase3 ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 8 }} />
                ) : allocationData?.isAllocated && allocationData.allocation ? (
                  <View style={styles.allocationDetailsBox}>
                    <Text style={styles.allocationPrimary}>
                      {allocationData.allocation.room.floor.hostel.name} ({allocationData.allocation.room.floor.hostel.code})
                    </Text>
                    <Text style={styles.allocationSub}>
                      Floor: {allocationData.allocation.room.floor.floorName} (Floor {allocationData.allocation.room.floor.floorNumber})
                    </Text>
                    <Text style={styles.allocationSub}>
                      Room: {allocationData.allocation.room.roomNumber} • {allocationData.allocation.room.roomType}
                    </Text>
                    <View style={styles.bedBadge}>
                      <Text style={styles.bedBadgeText}>
                        Assigned: {allocationData.allocation.bedLabel}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.unallocatedBox}>
                    <Text style={styles.unallocatedTitle}>No hostel bed currently assigned.</Text>
                    <Text style={styles.hostelStatusDesc}>
                      You are eligible for residential allocation. Please contact your Warden office for room assignment.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.hostelStatusBox, { borderLeftColor: colors.success }]}>
                <Text style={styles.hostelStatusTitle}>🚌 Commuter Student Status</Text>
                <Text style={styles.hostelStatusDesc}>
                  You are registered as a Day Scholar. Hostel bed allocation is not permitted for day scholars.
                </Text>
              </View>
            )
          ) : null}

          {/* WARDEN: Phase 3 Infrastructure & Occupancy Overview */}
          {user?.role === 'WARDEN' ? (
            <View style={styles.wardenSection}>
              <View style={styles.hostelStatusBox}>
                <Text style={styles.hostelStatusTitle}>🏢 Hostel Infrastructure Overview</Text>
                <Text style={styles.hostelStatusDesc}>
                  Warden Management: Hostels, Floors, Rooms, and Physical Beds.
                </Text>
              </View>

              {loadingPhase3 ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
              ) : hostels.length > 0 ? (
                hostels.map((h) => (
                  <View key={h.id} style={styles.hostelCard}>
                    <View style={styles.hostelHeaderRow}>
                      <Text style={styles.hostelNameText}>{h.name}</Text>
                      <Text style={styles.hostelCodeBadge}>{h.code}</Text>
                    </View>

                    <Text style={styles.hostelMetaText}>
                      Gender: {h.genderAllowed} • Total Floors: {h.totalFloors}
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statPill}>
                        <Text style={styles.statPillLabel}>Capacity</Text>
                        <Text style={styles.statPillValue}>{h.stats.totalCapacity}</Text>
                      </View>
                      <View style={styles.statPill}>
                        <Text style={styles.statPillLabel}>Occupied</Text>
                        <Text style={[styles.statPillValue, { color: colors.warning }]}>
                          {h.stats.totalOccupancy}
                        </Text>
                      </View>
                      <View style={styles.statPill}>
                        <Text style={styles.statPillLabel}>Vacant Beds</Text>
                        <Text style={[styles.statPillValue, { color: colors.success }]}>
                          {h.stats.totalVacant}
                        </Text>
                      </View>
                      <View style={styles.statPill}>
                        <Text style={styles.statPillLabel}>Occupancy</Text>
                        <Text style={styles.statPillValue}>{h.stats.occupancyRate}%</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No hostel buildings configured yet.</Text>
              )}
            </View>
          ) : null}

          {/* MESS INCHARGE Quick Overview */}
          {user?.role === 'MESS_INCHARGE' ? (
            <View style={[styles.hostelStatusBox, { borderLeftColor: colors.warning }]}>
              <Text style={styles.hostelStatusTitle}>🍽️ Mess Operations Active</Text>
              <Text style={styles.hostelStatusDesc}>
                Manage recurring dining menus, track student meal feedback, and monitor live meal preparation forecasts.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Phase 5 Mess & Dining Hub for Students */}
        {user?.role === 'STUDENT' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>🍽️ Mess & Dining Hub</Text>
            <Text style={styles.hubSubtitle}>
              Check daily meal schedule, explore the weekly menu, and share dining feedback.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('TODAY_MENU')}
              >
                <Text style={styles.actionCardIcon}>🍲</Text>
                <Text style={styles.actionCardTitle}>Today's Menu</Text>
                <Text style={styles.actionCardDesc}>Live 4-meal daily schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('WEEKLY_MENU')}
              >
                <Text style={styles.actionCardIcon}>📅</Text>
                <Text style={styles.actionCardTitle}>Weekly Schedule</Text>
                <Text style={styles.actionCardDesc}>Full Mon-Sun timetable</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('MESS_FEEDBACK')}
              >
                <Text style={styles.actionCardIcon}>⭐</Text>
                <Text style={styles.actionCardTitle}>Dining Feedback</Text>
                <Text style={styles.actionCardDesc}>Rate meals & food quality</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 5 Operations Hub for Mess Incharge */}
        {user?.role === 'MESS_INCHARGE' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>👨‍🍳 Mess Management Hub</Text>
            <Text style={styles.hubSubtitle}>
              Live meal forecasts, weekly recurring menu planning, and student dining quality reviews.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.warning }]}
                onPress={() => setCurrentScreen('MESS_DASHBOARD')}
              >
                <Text style={styles.actionCardIcon}>📊</Text>
                <Text style={styles.actionCardTitle}>Meal Forecast</Text>
                <Text style={styles.actionCardDesc}>Live expected counts & leaves</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.accent }]}
                onPress={() => setCurrentScreen('MENU_MANAGEMENT')}
              >
                <Text style={styles.actionCardIcon}>📋</Text>
                <Text style={styles.actionCardTitle}>Manage Menus</Text>
                <Text style={styles.actionCardDesc}>Recurring weekly schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.primaryLight }]}
                onPress={() => setCurrentScreen('FEEDBACK_OVERVIEW')}
              >
                <Text style={styles.actionCardIcon}>⭐</Text>
                <Text style={styles.actionCardTitle}>Student Feedback</Text>
                <Text style={styles.actionCardDesc}>Rating metrics & suggestions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 4 Gate Pass & Visitor Hub for Students */}
        {user?.role === 'STUDENT' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>🎫 Gate Pass & Visitor Hub</Text>
            <Text style={styles.hubSubtitle}>
              Request overnight leaves and manage visitor entry passes.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('GATE_PASS')}
              >
                <Text style={styles.actionCardIcon}>🎫</Text>
                <Text style={styles.actionCardTitle}>My Gate Passes</Text>
                <Text style={styles.actionCardDesc}>View & track leaves</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('CREATE_GATE_PASS')}
              >
                <Text style={styles.actionCardIcon}>📝</Text>
                <Text style={styles.actionCardTitle}>Apply Gate Pass</Text>
                <Text style={styles.actionCardDesc}>New leave request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('GUEST_REQUEST')}
              >
                <Text style={styles.actionCardIcon}>👥</Text>
                <Text style={styles.actionCardTitle}>Guest Requests</Text>
                <Text style={styles.actionCardDesc}>Request visitor entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('GUEST_PASS')}
              >
                <Text style={styles.actionCardIcon}>🎟️</Text>
                <Text style={styles.actionCardTitle}>Guest Passes</Text>
                <Text style={styles.actionCardDesc}>Active entry passes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 4 Gate Pass & Guest Review Hub for Warden */}
        {user?.role === 'WARDEN' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>📋 Gate Pass & Visitor Review Hub</Text>
            <Text style={styles.hubSubtitle}>
              Review pending student overnight leaves and issue official guest visitor passes.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.primaryLight }]}
                onPress={() => setCurrentScreen('WARDEN_GATE_PASS_REVIEW')}
              >
                <Text style={styles.actionCardIcon}>🎫</Text>
                <Text style={styles.actionCardTitle}>Review Gate Passes</Text>
                <Text style={styles.actionCardDesc}>Approve / Reject student leaves</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.accent }]}
                onPress={() => setCurrentScreen('WARDEN_GUEST_REVIEW')}
              >
                <Text style={styles.actionCardIcon}>🎟️</Text>
                <Text style={styles.actionCardTitle}>Review Guest Requests</Text>
                <Text style={styles.actionCardDesc}>Issue digital visitor passes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 6 Grievances, Notices & Discipline Hub for Students */}
        {user?.role === 'STUDENT' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>⚖️ Grievances, Notices & Discipline</Text>
            <Text style={styles.hubSubtitle}>
              Raise maintenance issues, view official campus notices, and track disciplinary records.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('COMPLAINTS')}
              >
                <Text style={styles.actionCardIcon}>📋</Text>
                <Text style={styles.actionCardTitle}>My Complaints</Text>
                <Text style={styles.actionCardDesc}>Track pending & solved issues</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('CREATE_COMPLAINT')}
              >
                <Text style={styles.actionCardIcon}>✍️</Text>
                <Text style={styles.actionCardTitle}>File Complaint</Text>
                <Text style={styles.actionCardDesc}>Report room or mess issue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('NOTICES')}
              >
                <Text style={styles.actionCardIcon}>📢</Text>
                <Text style={styles.actionCardTitle}>Notice Board</Text>
                <Text style={styles.actionCardDesc}>Announcements & alerts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setCurrentScreen('FINES')}
              >
                <Text style={styles.actionCardIcon}>💳</Text>
                <Text style={styles.actionCardTitle}>My Fines & Dues</Text>
                <Text style={styles.actionCardDesc}>View disciplinary records</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 6 Grievances, Notices & Discipline Hub for Warden */}
        {user?.role === 'WARDEN' ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.hubTitle}>⚖️ Grievance Redressal & Discipline Hub</Text>
            <Text style={styles.hubSubtitle}>
              Solve student complaints, publish campus notices, and manage disciplinary fines.
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.primaryLight }]}
                onPress={() => setCurrentScreen('WARDEN_COMPLAINTS')}
              >
                <Text style={styles.actionCardIcon}>📋</Text>
                <Text style={styles.actionCardTitle}>Manage Complaints</Text>
                <Text style={styles.actionCardDesc}>Review & mark complaints SOLVED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.accent }]}
                onPress={() => setCurrentScreen('WARDEN_NOTICES')}
              >
                <Text style={styles.actionCardIcon}>📢</Text>
                <Text style={styles.actionCardTitle}>Notice Board</Text>
                <Text style={styles.actionCardDesc}>Publish & manage announcements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.warning }]}
                onPress={() => setCurrentScreen('WARDEN_FINES')}
              >
                <Text style={styles.actionCardIcon}>💳</Text>
                <Text style={styles.actionCardTitle}>Fine Records</Text>
                <Text style={styles.actionCardDesc}>Review & record fine payments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: colors.danger }]}
                onPress={() => setCurrentScreen('WARDEN_ASSIGN_FINE')}
              >
                <Text style={styles.actionCardIcon}>⚠️</Text>
                <Text style={styles.actionCardTitle}>Issue Fine</Text>
                <Text style={styles.actionCardDesc}>Assign disciplinary fine</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Phase 6 Roadmap Banner */}
        <View style={styles.roadmapCard}>
          <Text style={styles.roadmapTitle}>⚖️ Phase 6 — Complaints, Notices & Fines Live</Text>
          <Text style={styles.roadmapText}>
            Strict single-direction complaint lifecycle (PENDING → SOLVED), official multi-audience notice board with priority pinning, and disciplinary fine tracking with in-app notifications and audit logging.
          </Text>
          <Text style={styles.roadmapSubtext}>
            HostelHub v1.0 • Comprehensive Campus Living Platform
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
    marginBottom: spacing.sm,
  },
  hostelStatusTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  hostelStatusDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  allocationDetailsBox: {
    marginTop: spacing.xs,
  },
  allocationPrimary: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  allocationSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bedBadge: {
    backgroundColor: colors.primaryDark,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  bedBadgeText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  unallocatedBox: {
    marginTop: 4,
  },
  unallocatedTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 2,
  },
  wardenSection: {
    marginTop: spacing.xs,
  },
  hostelCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hostelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  hostelNameText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
  },
  hostelCodeBadge: {
    ...typography.caption,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  hostelMetaText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statPillLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  statPillValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
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
  hubTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  hubSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  actionCardTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  actionCardDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
