# 🚀 Advanced TODO Application

A modern, full-featured TODO application built with React, Fastify, and PostgreSQL. Features real-time collaboration, offline support, advanced authentication, and multiple view modes.

## 🌟 Live Demo

- **Frontend**: [https://todo-app-advanced.vercel.app](https://todo-app-advanced.vercel.app) *(Coming Soon)*
- **Backend API**: [https://todo-api.onrender.com](https://todo-api.onrender.com) *(Coming Soon)*

## 🚀 Quick Deploy

### One-Click Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/grytrn/advanced-todo-app)

The app includes a `render.yaml` blueprint for one-click deployment with PostgreSQL and Redis. [See deployment guide](./docs/RENDER_DEPLOYMENT.md)

## ✨ Features

### Core Features
- ✅ **Task Management**: Create, update, delete, and organize tasks
- 📁 **Categories & Tags**: Organize tasks with categories and flexible tagging
- 🎯 **Priority Levels**: Set task priorities (Low, Medium, High, Urgent)
- 📅 **Due Dates & Reminders**: Schedule tasks with due dates and get reminders
- 🔄 **Drag & Drop**: Reorder tasks with smooth drag-and-drop
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile

### Advanced Features
- 🔐 **Advanced Authentication**
  - Email/Password with verification
  - OAuth (Google, GitHub)
  - Two-Factor Authentication (2FA)
  - API Key authentication
  - Session management across devices
  
- 🚀 **Real-Time Collaboration**
  - Live updates via WebSocket
  - User presence indicators
  - Activity feed
  - Real-time notifications
  
- 📊 **Multiple View Modes**
  - List View (traditional)
  - Kanban Board
  - Calendar View
  - Timeline View
  
- 💾 **Offline Support**
  - Work offline with service workers
  - Automatic sync when back online
  - Conflict resolution
  
- 📤 **Export & Import**
  - Export to PDF, CSV, JSON, Markdown, iCal
  - Scheduled exports
  - Custom templates
  
- 🎨 **Customization**
  - Dark/Light theme
  - Custom theme creator
  - Keyboard shortcuts
  - Command palette (Cmd+K)

### Productivity Features
- ⏱️ **Pomodoro Timer**: Built-in timer for focused work
- 🎯 **Focus Mode**: Minimize distractions
- 📈 **Analytics Dashboard**: Track your productivity
- 🔄 **Bulk Operations**: Manage multiple tasks at once
- 📋 **Templates**: Save and reuse task templates
- ⌨️ **Keyboard Shortcuts**: Navigate without mouse

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast builds
- **Zustand** for state management
- **TanStack Query** for server state
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Socket.io Client** for real-time
- **Workbox** for offline support

### Backend
- **Fastify** for high-performance API
- **Prisma** ORM with PostgreSQL
- **Redis** for caching and sessions
- **Socket.io** for WebSocket
- **Bull** for job queues
- **Puppeteer** for PDF generation
- **JWT** with refresh tokens
- **Bcrypt** for password hashing

### Infrastructure
- **Docker** for containerization
- **GitHub Actions** for CI/CD
- **Vercel** for frontend hosting
- **Render.com** for backend hosting
- **PostgreSQL** database
- **Redis** for caching
- **Sentry** for error tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/todo-app-advanced.git
cd todo-app-advanced
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your values
```

4. **Start services with Docker**
```bash
docker compose up -d
```

5. **Run database migrations**
```bash
cd backend && npx prisma migrate deploy
```

6. **Start development servers**
```bash
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📖 API Documentation

### Authentication Endpoints
```
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login with email/password
POST   /api/v1/auth/refresh      # Refresh access token
POST   /api/v1/auth/logout       # Logout user
GET    /api/v1/auth/me           # Get current user
POST   /api/v1/auth/verify-email # Verify email address
POST   /api/v1/auth/reset-password # Reset password
POST   /api/v1/auth/enable-2fa   # Enable 2FA
POST   /api/v1/auth/verify-2fa   # Verify 2FA code
```

### Todo Endpoints
```
GET    /api/v1/todos            # List todos (paginated)
GET    /api/v1/todos/:id        # Get single todo
POST   /api/v1/todos            # Create todo
PATCH  /api/v1/todos/:id        # Update todo
DELETE /api/v1/todos/:id        # Delete todo
POST   /api/v1/todos/reorder    # Reorder todos
```

### Category & Tag Endpoints
```
GET    /api/v1/categories       # List categories
POST   /api/v1/categories       # Create category
PATCH  /api/v1/categories/:id   # Update category
DELETE /api/v1/categories/:id   # Delete category

GET    /api/v1/tags            # List tags
POST   /api/v1/tags            # Create tag
DELETE /api/v1/tags/:id        # Delete tag
```

### Export Endpoints
```
POST   /api/v1/export          # Export todos
GET    /api/v1/export/jobs     # List export jobs
GET    /api/v1/export/:id      # Download export
```

## 🧪 Testing

### Run all tests
```bash
npm run test
```

### Run specific test suites
```bash
npm run test:backend    # Backend tests
npm run test:frontend   # Frontend tests
npm run test:e2e       # End-to-end tests
```

### Coverage reports
```bash
npm run test:coverage
```

## 🚀 Deployment

### Deploy to Production

1. **Backend (Render.com)**
   - Connect your GitHub repository
   - Set environment variables from `.env.production`
   - Deploy using `render.yaml` configuration

2. **Frontend (Vercel)**
   - Import your GitHub repository
   - Set environment variables from `.env.production`
   - Deploy automatically on push

### Environment Variables

See `.env.production` files in both `backend/` and `frontend/` directories for required production environment variables.

## 📱 Mobile Apps

Mobile apps are planned for future releases:
- React Native for iOS/Android
- Push notifications
- Biometric authentication
- Offline-first architecture

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built by a team of specialized AI agents
- Inspired by modern productivity tools
- Thanks to all open-source contributors

## 📞 Support

- 📧 Email: support@todoapp.com
- 💬 Discord: [Join our community](https://discord.gg/todoapp)
- 📖 Docs: [Documentation](https://docs.todoapp.com)

---

Made with ❤️ by the Multi-Agent Development Team