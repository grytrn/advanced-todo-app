# TODO App Frontend

A modern, feature-rich TODO application built with React, TypeScript, and Vite.

## Features

- 🎨 Beautiful UI with glass morphism effects
- 🌓 Dark/Light theme switching
- 📝 Rich text editor for todo descriptions
- 🏷️ Categories and tags support
- 🔍 Search and filter functionality
- 📊 Dashboard with statistics
- 🎯 Drag and drop to reorder tasks
- 📱 PWA support for offline usage
- ✨ Smooth animations with Framer Motion
- 🔒 Secure authentication flow

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Framer Motion** - Animations
- **@dnd-kit** - Drag and drop
- **Tiptap** - Rich text editor
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── store/         # Zustand stores
├── services/      # API services
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
└── styles/        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Lint code
- `npm run typecheck` - Type check code

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000
VITE_PUBLIC_URL=http://localhost:3000
```

## UI Components

### Core Components
- **Layout** - Main app layout with sidebar
- **Header** - Top navigation with search and user menu
- **Sidebar** - Navigation menu with categories
- **ProtectedRoute** - Route protection wrapper

### Todo Components
- **TodoCard** - Individual todo item with drag handle
- **TodoModal** - Create/edit todo form
- **FilterBar** - Filtering and sorting controls

### Pages
- **LoginPage** - User authentication
- **SignupPage** - User registration
- **DashboardPage** - Overview and statistics
- **TodosPage** - Main todo list
- **SettingsPage** - User preferences
- **NotFoundPage** - 404 error page

## State Management

The app uses Zustand for state management with three main stores:

1. **authStore** - Authentication state and user data
2. **themeStore** - Theme preferences (dark/light)
3. **todoStore** - Todos, categories, and filters

## Styling

- Tailwind CSS for utility-first styling
- Custom theme with primary and accent colors
- Glass morphism effects for modern look
- Responsive design for all screen sizes
- Custom animations and transitions

## Testing

Tests are written using Vitest and React Testing Library:

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT