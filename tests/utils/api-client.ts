import axios, { AxiosInstance } from 'axios';

export class TestApiClient {
  private client: AxiosInstance;
  private authToken?: string;

  constructor(baseURL: string = process.env.API_URL || 'http://localhost:8000') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Response interceptor for debugging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = undefined;
  }

  // Auth endpoints
  async register(data: any) {
    const response = await this.client.post('/api/v1/auth/register', data);
    return response.data;
  }

  async login(data: any) {
    const response = await this.client.post('/api/v1/auth/login', data);
    if (response.data.data?.accessToken) {
      this.setAuthToken(response.data.data.accessToken);
    }
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/v1/auth/logout');
    this.clearAuthToken();
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/api/v1/auth/me');
    return response.data;
  }

  // Todo endpoints
  async getTodos(params?: any) {
    const response = await this.client.get('/api/v1/todos', { params });
    return response.data;
  }

  async getTodo(id: string) {
    const response = await this.client.get(`/api/v1/todos/${id}`);
    return response.data;
  }

  async createTodo(data: any) {
    const response = await this.client.post('/api/v1/todos', data);
    return response.data;
  }

  async updateTodo(id: string, data: any) {
    const response = await this.client.patch(`/api/v1/todos/${id}`, data);
    return response.data;
  }

  async deleteTodo(id: string) {
    const response = await this.client.delete(`/api/v1/todos/${id}`);
    return response.data;
  }

  // User endpoints
  async getUsers(params?: any) {
    const response = await this.client.get('/api/v1/users', { params });
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/api/v1/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.client.patch(`/api/v1/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/api/v1/users/${id}`);
    return response.data;
  }
}