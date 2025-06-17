# TODO App Design System

## Overview
This design system provides a comprehensive set of styles, components, and utilities for building a modern, accessible TODO application with fancy visual effects.

## Core Files

- **design-system.css** - Complete CSS framework with design tokens, components, and utilities
- **style-guide.html** - Interactive style guide with live examples
- **todo-icons.svg** - Custom SVG icon sprite for the application

## Design Principles

### 1. **Modern & Vibrant**
- Gradient-based color system
- Smooth animations and transitions
- Interactive particle effects
- Clean, minimalist aesthetic

### 2. **Accessible**
- WCAG 2.1 AA compliant
- Full keyboard navigation
- Screen reader optimized
- High contrast mode support

### 3. **Responsive**
- Mobile-first approach
- Touch-friendly targets (44x44px minimum)
- Flexible layouts
- Adaptive typography

### 4. **Themeable**
- Light/dark theme support
- CSS custom properties
- Runtime theme switching
- System preference detection

## Design Tokens

### Colors
```css
/* Primary Palette */
--color-primary-500: #0ea5e9;  /* Main brand color */
--color-primary-600: #0284c7;  /* Hover states */

/* Accent Colors */
--color-accent-purple: #8b5cf6;
--color-accent-pink: #ec4899;
--color-accent-green: #10b981;
--color-accent-orange: #f97316;
```

### Typography
```css
/* Font Sizes */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

### Spacing (8px base)
```css
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-4: 1rem;      /* 16px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
```

## Component Usage

### Buttons
```html
<!-- Primary Button -->
<button class="btn btn-primary">Add Task</button>

<!-- Icon Button -->
<button class="btn btn-icon" aria-label="Edit">
  <svg><use href="#icon-edit"/></svg>
</button>

<!-- Button with loading state -->
<button class="btn btn-primary" disabled>
  <div class="spinner"></div>
  Loading...
</button>
```

### Form Inputs
```html
<div class="input-group">
  <label class="input-label" for="task-name">Task Name</label>
  <input type="text" id="task-name" class="input" placeholder="Enter task...">
  <span class="input-helper">Add a descriptive name</span>
</div>
```

### TODO Items
```html
<div class="todo-item">
  <span class="todo-priority high"></span>
  <div class="todo-checkbox"></div>
  <span class="todo-text">Complete design system</span>
  <button class="btn btn-ghost btn-icon btn-sm" aria-label="Edit">
    <svg><use href="#icon-edit"/></svg>
  </button>
</div>
```

### Cards
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Today's Tasks</h3>
  </div>
  <div class="card-body">
    <!-- Content -->
  </div>
</div>
```

## Animation Effects

### Particle System
```javascript
import { particleSystem } from './utils/particle-effects.js';

// Create particle burst on task completion
particleSystem.createBurst(x, y, {
  colors: ['#10b981', '#34d399'],
  count: 30
});

// Show success animation
particleSystem.createSuccessAnimation(element);

// Confetti celebration
particleSystem.createConfettiRain();
```

### CSS Animations
- Hover effects with transform and shadows
- Skeleton loading states with shimmer
- Modal slide-in animations
- Toast notifications slide-in
- Ripple effects on buttons

## Accessibility Features

### Keyboard Navigation
- `Tab` / `Shift+Tab` - Navigate through focusable elements
- `Enter` / `Space` - Activate buttons
- `Escape` - Close modals and dialogs
- `Alt+M` - Skip to main content
- `?` - Show keyboard shortcuts help

### Screen Reader Support
```html
<!-- Visually hidden content -->
<span class="sr-only">Task completed</span>

<!-- ARIA labels for icons -->
<button aria-label="Delete task">
  <svg><use href="#icon-trash"/></svg>
</button>

<!-- Live regions for announcements -->
<div aria-live="polite" aria-atomic="true">
  Task successfully added
</div>
```

### Focus Management
- Clear focus indicators (2px outline)
- Focus trap in modals
- Skip links for navigation
- Proper focus restoration

## Theme Switching

### JavaScript API
```javascript
import { themeManager } from './utils/theme-manager.js';

// Toggle theme
themeManager.toggleTheme();

// Set specific theme
themeManager.setTheme('dark');

// Listen for theme changes
themeManager.onThemeChange((theme) => {
  console.log('Theme changed to:', theme);
});
```

### HTML Toggle
```html
<div class="theme-toggle" data-theme-toggle>
  <div class="theme-toggle-slider">
    <svg class="theme-icon-light"><use href="#icon-sun"/></svg>
    <svg class="theme-icon-dark"><use href="#icon-moon"/></svg>
  </div>
</div>
```

## Performance Considerations

1. **CSS Custom Properties** - Runtime theme switching without reloading
2. **SVG Sprite** - Single file for all icons
3. **GPU Acceleration** - Transform and opacity for animations
4. **Reduced Motion** - Respects user preferences
5. **Lazy Loading** - Components loaded on demand

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Getting Started

1. Include the CSS file:
```html
<link rel="stylesheet" href="./styles/design-system.css">
```

2. Include the icon sprite:
```html
<object data="./assets/icons/todo-icons.svg" type="image/svg+xml"></object>
```

3. Initialize utilities:
```javascript
import { particleSystem } from './utils/particle-effects.js';
import { themeManager } from './utils/theme-manager.js';
import { a11y } from './utils/accessibility.js';
```

4. View the style guide:
Open `style-guide.html` in your browser for interactive examples.

## Contributing

When adding new components:
1. Follow existing naming conventions
2. Ensure WCAG AA compliance
3. Add examples to style guide
4. Test in both light/dark themes
5. Verify keyboard navigation
6. Check reduced motion behavior