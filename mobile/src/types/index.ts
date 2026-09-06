export type UserRole = 'STUDENT' | 'WARDEN' | 'MESS_INCHARGE';
export type StudentType = 'HOSTELER' | 'DAY_SCHOLAR';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentType: StudentType;
  department: string;
  yearOfStudy: number;
  guardianName: string;
  guardianPhone: string;
  isAllocated: boolean;
  bedAllocation?: {
    bedLabel: string;
    room: {
      roomNumber: string;
      floor: {
        floorName: string;
        hostel: {
          name: string;
          code: string;
        };
      };
    };
  };
}

export interface AuthState {
  user: User | null;
  profile: StudentProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type GuestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MealType = 'NONE' | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';

export interface LeaveRequest {
  id: string;
  studentProfileId: string;
  startDate: string;
  endDate: string;
  reason: string;
  destination: string;
  emergencyContact: string;
  status: LeaveStatus;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    studentType: StudentType;
    phone?: string;
    department?: string;
  };
  reviewedBy?: {
    id: string;
    email: string;
  };
}

export interface GuestPass {
  id: string;
  guestRequestId: string;
  passCode: string;
  validOn: string;
  isVerifiedAtGate: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  guestRequest?: GuestRequest;
}

export interface GuestRequest {
  id: string;
  hostStudentProfileId: string;
  guestName: string;
  relationship: string;
  visitDate: string;
  requestedMeal: MealType;
  numberOfGuests: number;
  reason: string;
  status: GuestStatus;
  passNumber?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  hostStudent?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    studentType: StudentType;
    phone?: string;
  };
  guestPass?: GuestPass | null;
}

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface MessMenu {
  id: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  items: string;
  specialNotes?: string | null;
  updatedByUserId?: string;
  updatedAt: string;
  updatedBy?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface MessFeedback {
  id: string;
  studentProfileId: string;
  mealDate: string;
  mealType: MealType;
  rating: number;
  foodQualityRating: number;
  cleanlinessRating: number;
  comment?: string | null;
  createdAt: string;
  studentProfile?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    studentType: StudentType;
  };
}

export interface ExpectedMealBreakdown {
  mealType: MealType;
  expectedMeals: number;
  residentEligible: number;
  onLeave: number;
  netResidents: number;
  guestMeals: number;
}

export interface MealAnalytics {
  date: string;
  dayOfWeek: DayOfWeek;
  totalEligibleResidents: number;
  breakdown: Record<string, ExpectedMealBreakdown>;
}

export interface MessDashboardData {
  today: MealAnalytics;
  satisfaction: {
    totalFeedbacks: number;
    averageRating: number;
    averageFoodQuality: number;
    averageCleanliness: number;
  };
  weeklyTrend: Array<{
    date: string;
    dayOfWeek: DayOfWeek;
    breakfast: number;
    lunch: number;
    dinner: number;
  }>;
}

// ----------------------------------------------------
// PHASE 6 TYPES: COMPLAINTS, NOTICES, FINES
// ----------------------------------------------------

export type ComplaintCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'CARPENTRY'
  | 'CLEANLINESS'
  | 'INTERNET'
  | 'MESS'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ComplaintStatus = 'PENDING' | 'SOLVED';

export interface Complaint {
  id: string;
  studentProfileId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: string;
    studentType: StudentType;
  };
}

export type NoticeCategory = 'GENERAL' | 'HOSTEL' | 'MESS' | 'URGENT' | 'EVENT';

export type AudienceType = 'ALL' | 'HOSTELERS' | 'DAY_SCHOLARS';

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  targetAudience: AudienceType;
  targetHostelId?: string | null;
  isPinned: boolean;
  publishedByAdminId: string;
  createdAt: string;
  updatedAt: string;
  publishedBy?: {
    id: string;
    email: string;
    role: UserRole;
  };
  targetHostel?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export type FineStatus = 'UNPAID' | 'PAID';

export interface Fine {
  id: string;
  studentProfileId: string;
  amount: string | number;
  reason: string;
  status: FineStatus;
  assignedByAdminId: string;
  assignedAt: string;
  paidAt?: string | null;
  updatedAt: string;
  studentProfile?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: string;
    studentType?: StudentType;
  };
  assignedBy?: {
    id: string;
    email: string;
    role?: UserRole;
  };
}

// ----------------------------------------------------
// PHASE 7 TYPES: CAMPUS PRESENCE & GEOFENCING
// ----------------------------------------------------

export interface CampusGeofence {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
}

export interface CampusPresenceLog {
  id: string;
  studentProfileId: string;
  latitude: number | string;
  longitude: number | string;
  accuracyMeters?: number | null;
  calculatedDistance: number;
  isInside: boolean;
  recordedAt: string;
  studentProfile?: {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: string;
    studentType?: StudentType;
  };
}

export interface PresenceVerificationResult {
  id: string;
  isInside: boolean;
  calculatedDistance: number;
  distanceFromBoundary: number;
  accuracyMeters?: number | null;
  recordedAt: string;
  geofence: {
    id: string;
    name: string;
    radiusMeters: number;
  };
}

export interface PresenceStatusResponse {
  hasVerified: boolean;
  status: 'INSIDE' | 'OUTSIDE' | null;
  latestLog?: {
    id: string;
    isInside: boolean;
    calculatedDistance: number;
    distanceFromBoundary: number;
    accuracyMeters?: number | null;
    recordedAt: string;
  } | null;
  geofence: {
    id: string;
    name: string;
    radiusMeters: number;
  };
}

export interface PresenceSummary {
  insideCount: number;
  outsideCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  totalRegisteredStudents: number;
  activeGeofence: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isActive: boolean;
  };
}



