# @frontend-01 - Frontend Developer Context

## Current Focus
- Waiting for auth API endpoints from @backend-01
- Setting up component library structure
- Preparing auth UI components

## Work in Progress

### Component Library Setup
- [x] Base component structure
- [x] Tailwind configuration
- [x] Storybook setup (local)
- [ ] Form components (waiting for API)
- [ ] Auth flow components
- [ ] Error boundary setup
- [ ] Loading states

### UI/UX Decisions

#### Design System
```typescript
// theme/colors.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    900: '#7f1d1d'
  }
};
```

#### Component Architecture
```typescript
// components/Button/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

// Using compound components for complex UI
<Form>
  <Form.Field name="email" rules={{ required: true }}>
    <Form.Label>Email</Form.Label>
    <Form.Input type="email" />
    <Form.Error />
  </Form.Field>
</Form>
```

## State Management Plan

### Zustand Store Structure
```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// stores/uiStore.ts
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}
```

## API Integration Strategy

### Axios Configuration
```typescript
// services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  withCredentials: true // for cookies
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await useAuthStore.getState().refreshToken();
      // Retry original request
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Component Patterns

### Form Handling with React Hook Form
```typescript
const LoginForm = () => {
  const { login } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema)
  });
  
  const onSubmit = async (data: LoginDto) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

### Loading States Pattern
```typescript
// hooks/useAsyncState.ts
export const useAsyncState = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const execute = async (promise: Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await promise;
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, error, execute };
};
```

## Performance Optimizations

### Code Splitting Strategy
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));

// Lazy load heavy components
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
```

### Image Optimization
- Use WebP with fallbacks
- Implement lazy loading
- Responsive images with srcset
- CDN integration planned

## Accessibility Checklist
- [ ] Keyboard navigation working
- [ ] ARIA labels on interactive elements
- [ ] Focus management in modals
- [ ] Contrast ratios meet WCAG AA
- [ ] Screen reader tested
- [ ] Error messages associated with inputs

## Questions for Team

**For @backend-01**:
1. Will refresh tokens be in cookies or response body?
2. What's the format for validation errors?
3. Any specific CORS requirements?

**For @arch-01**:
1. PWA requirements?
2. Browser support matrix?
3. SEO requirements (SSR needed)?

**For @test-01**:
1. E2E test selectors convention?
2. Visual regression testing?

## Testing Strategy

### Unit Testing Components
```typescript
describe('Button', () => {
  it('should render with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-500');
  });
  
  it('should show loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});
```

## Blocked Tasks
1. **Auth UI Components**: Need API contract for login/register
2. **API Client Setup**: Need CORS configuration
3. **Error Handling**: Need error response format
4. **Protected Routes**: Need auth flow details

## Useful Resources
- [React Query vs Zustand](https://dev.to/franciscomendes10866/when-to-use-react-query-vs-zustand)
- [Tailwind Component Patterns](https://tailwindui.com/components)
- [React Hook Form with Zod](https://react-hook-form.com/get-started#SchemaValidation)
- [Vite Performance Tips](https://vitejs.dev/guide/performance.html)

## Next Steps (Once Unblocked)
1. Implement auth forms (login/register)
2. Create protected route wrapper
3. Add token refresh logic
4. Build user profile components
5. Implement logout flow
6. Add "Remember me" functionality
