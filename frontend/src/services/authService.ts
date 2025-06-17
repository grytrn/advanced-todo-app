import { apiClient, type ApiResponse } from './api'

interface LoginRequest {
  email: string
  password: string
}

interface SignupRequest {
  email: string
  password: string
  name: string
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    avatar?: string
  }
}

interface MeResponse {
  user: {
    id: string
    email: string
    name: string
    avatar?: string
  }
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data)
    const authData = response.data.data
    
    // Store the access token
    localStorage.setItem('access_token', authData.accessToken)
    
    return authData
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data)
    const authData = response.data.data
    
    // Store the access token
    localStorage.setItem('access_token', authData.accessToken)
    
    return authData
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Clear the access token regardless
      localStorage.removeItem('access_token')
    }
  },

  async getMe(): Promise<MeResponse> {
    const response = await apiClient.get<ApiResponse<MeResponse>>('/auth/me')
    return response.data.data
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh')
    const authData = response.data.data
    
    // Store the new access token
    localStorage.setItem('access_token', authData.accessToken)
    
    return authData
  },
}