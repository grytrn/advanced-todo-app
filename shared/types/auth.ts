// Shared type definitions for authentication

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  success: true;
  data: {
    user: User;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: true;
  data: {
    message: string;
  };
}

export interface MeResponse {
  success: true;
  data: {
    user: User;
  };
}

export interface AuthError {
  success: false;
  error: {
    code: 'INVALID_CREDENTIALS' | 'EMAIL_EXISTS' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND' | 'USER_INACTIVE';
    message: string;
  };
}

// JWT Token payloads
export interface AccessTokenPayload {
  id: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
  type: 'refresh';
}