# Frontend Agent Context

## Current Focus
Building a modern, beautiful TODO application with smooth UX using React 18 + Vite.

## Key Technical Decisions
- **Framework**: React 18 + Vite (as per @tech-stack)
- **State Management**: Zustand (lightweight, TypeScript-first)
- **Styling**: Tailwind CSS + CSS Modules for complex components
- **Component Library**: Building custom components with accessibility in mind
- **Routing**: React Router for SPA navigation with protected routes

## TODO App Component Structure Plan
1. **Core Components**:
   - TodoList (with react-window for virtualization)
   - TodoItem (inline editing with contenteditable)
   - TodoForm (with react-hook-form + zod validation)
   - CategorySelector (dropdown with icons)
   - TagManager (with react-select for autocomplete)
   - SearchBar (with lodash debounce)
   - FilterPanel (multiple filter options)
   - DatePicker (using react-datepicker)
   - UserMenu (avatar + dropdown)
   - ThemeToggle (light/dark mode)

2. **Layout Components**:
   - Header
   - Sidebar
   - MainLayout

3. **Pages**:
   - Home (Todo dashboard)
   - Login
   - Register
   - Profile
   - Settings

## Design Patterns
- Mobile-first responsive design
- Loading states with skeletons
- Error boundaries for graceful failures
- Optimistic UI updates
- Smooth animations with framer-motion

## Questions for Other Agents
- @backend: What's the exact shape of the Todo API endpoints?
- @backend: Will todos support real-time updates via WebSockets?

## Work Log
[2025-01-17] Starting frontend structure setup for TODO app