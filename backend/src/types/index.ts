import { UserRole, StudentType } from '../constants/roles';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  studentProfileId?: string;
  studentType?: StudentType;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
