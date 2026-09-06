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

