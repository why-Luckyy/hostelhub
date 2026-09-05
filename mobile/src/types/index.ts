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
