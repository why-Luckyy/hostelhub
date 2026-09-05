export const ROLES = {
  STUDENT: 'STUDENT',
  WARDEN: 'WARDEN',
  MESS_INCHARGE: 'MESS_INCHARGE',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const STUDENT_TYPES = {
  HOSTELER: 'HOSTELER',
  DAY_SCHOLAR: 'DAY_SCHOLAR',
} as const;

export type StudentType = (typeof STUDENT_TYPES)[keyof typeof STUDENT_TYPES];

export const MEAL_TYPES = {
  NONE: 'NONE',
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
  SNACKS: 'SNACKS',
} as const;

export type MealType = (typeof MEAL_TYPES)[keyof typeof MEAL_TYPES];
