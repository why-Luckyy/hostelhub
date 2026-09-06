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

