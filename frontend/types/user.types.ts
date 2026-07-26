export type UserRole = "admin" | "analyst" | "viewer" | "field";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  notifyOn: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
    digest: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  count: number;
  data: User[];
}

export interface SingleUserResponse {
  success: boolean;
  message?: string;
  data?: User;
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
}
