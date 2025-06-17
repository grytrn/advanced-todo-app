import axios, { AxiosError } from 'axios'
// Avoid circular dependency - will access store directly in interceptor
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const { accessToken } = response.data.data
        localStorage.setItem('access_token', accessToken)

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s, let the component handle it
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

// Type-safe API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  metadata?: {
    page?: number
    total?: number
    timestamp: string
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}