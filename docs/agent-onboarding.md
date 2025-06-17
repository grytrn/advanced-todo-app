# New Agent Onboarding Guide

Welcome to the Multi-Agent Development Team! This guide will help you get up to speed quickly.

## 🎯 Day 1: Orientation

### Morning: Understanding the System

- [ ] **Read CLAUDE.md** completely (30 mins)
  - This is your operating manual
  - Pay special attention to the coordination protocols
  
- [ ] **Review Agent Roles** (15 mins)
  - Read `@agent-roles` to understand all team members
  - Identify your role and responsibilities
  
- [ ] **Check Current Status** (15 mins)
  - Read `@current-work` to see who's doing what
  - Review `@blockers` to understand dependencies
  - Check `TODO.md` for upcoming work

### Afternoon: Environment Setup

- [ ] **Clone and Setup** (30 mins)
  ```bash
  git clone <repository>
  cd <project>
  npm run install:all
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  ```

- [ ] **Verify Development Environment** (20 mins)
  ```bash
  # Start services
  npm run dev
  
  # Run tests
  npm run test
  
  # Check linting
  npm run lint
  ```

- [ ] **Configure Git for Agent Work** (10 mins)
  ```bash
  # Set your agent name
  git config user.name "@yourrole-01"
  git config user.email "yourrole-01@agent.local"
  
  # Install git hooks
  cp scripts/git-hooks/* .git/hooks/
  chmod +x .git/hooks/*
  ```

- [ ] **Review Tech Stack** (20 mins)
  - Read `@tech-stack` for technology decisions
  - Understand the rationale behind choices

## 📝 Day 2: First Task

### Morning: Pick Your First Task

- [ ] **Select a Simple Task** (10 mins)
  - Look in `TODO.md` for tasks marked "good first task"
  - Or pick a small bug fix
  - Verify no one else is working on it in `@current-work`

- [ ] **Create Your Branch** (5 mins)
  ```bash
  git checkout -b feature/[role]-[description]
  # Example: feature/backend-fix-validation
  ```

- [ ] **Update Status** (5 mins)
  ```bash
  echo "[$(date +%Y-%m-%d %H:%M)] @yourrole-01: ⏳ Working on [task description] | feature/[branch]" >> @current-work
  ```

- [ ] **Check File Ownership** (5 mins)
  - Review `@assignments.lock`
  - Ensure you're not stepping on another agent's work

### Afternoon: Implementation

- [ ] **Follow Conventions** (continuous)
  - Read `@conventions` for project standards
  - Use the established patterns
  - Ask questions in `@blockers` if stuck

- [ ] **Write Tests First** (TDD)
  - Minimum 80% coverage
  - 100% for critical paths

- [ ] **Commit Regularly** (every 1-2 hours)
  ```bash
  git add .
  git commit -m "feat(scope): description
  
  Detailed explanation
  
  [WIP]"
  ```

## 🤝 Day 3: Integration

### Morning: Complete First Task

- [ ] **Run All Checks**
  ```bash
  npm run validate  # Runs lint, typecheck, and tests
  ```

- [ ] **Update Documentation**
  - Add code comments
  - Update relevant .md files
  - Update `@api-contracts` if you added endpoints

- [ ] **Final Commit**
  ```bash
  git commit -m "feat(scope): implement feature
  
  - List what you did
  - Mention any decisions
  
  [COMPLETE]
  Handoff: @next-agent needs to implement UI"
  ```

### Afternoon: Handoff Process

- [ ] **Update Coordination Files**
  ```bash
  # Mark your work complete
  echo "[$(date +%Y-%m-%d %H:%M)] @yourrole-01: ✅ Completed [task]" >> @current-work
  
  # Unblock next agent if applicable
  echo "[$(date +%Y-%m-%d %H:%M)] @next-agent: ✅ Unblocked - [task] complete" >> @blockers
  ```

- [ ] **Create Pull Request**
  - Use the agent handoff template
  - Fill out all sections thoroughly
  - Tag the next agent

- [ ] **Update Your Context**
  - Create/update `@agent-context/yourrole-01.md`
  - Document decisions and learnings

## 🚀 Week 1 Goals

By the end of your first week, you should:

- [ ] Complete 2-3 small tasks
- [ ] Successfully hand off work to another agent
- [ ] Review another agent's PR
- [ ] Contribute to `@agent-context/shared-decisions.md`
- [ ] Run the agent metrics: `node scripts/agent-metrics.js`

## 💡 Pro Tips

### Communication
- **Over-communicate** in your first week
- Update `@current-work` at least daily
- Use descriptive commit messages
- Document your thought process

### Code Quality
- Never use `any` types
- No `console.log` (use proper logging)
- Handle all error cases
- Write tests for edge cases

### Coordination
- Check `@blockers` before starting work
- Update files atomically to avoid conflicts
- Use the post-commit hooks for automation
- Pull frequently to stay synchronized

### When Stuck
1. Re-read relevant sections of CLAUDE.md
2. Check `@agent-context/shared-decisions.md`
3. Look for similar patterns in the codebase
4. Add a question to `@blockers` with context

## 📊 Success Metrics

You'll know you're succeeding when:
- Your PRs pass all checks on first try
- Other agents can pick up your handoffs smoothly
- Your code coverage is consistently >80%
- You're unblocking more than you're blocking

## 🔍 Common Pitfalls

### Avoid These Mistakes
1. **Working on locked files** - Always check `@assignments.lock`
2. **Forgetting to update status** - Use git hooks
3. **Skipping tests** - They will catch you in CI
4. **Not documenting decisions** - Future you will thank you
5. **Working in isolation** - This is a team effort

## 📚 Additional Resources

- Architecture Decision Records: `/docs/adr/`
- API Documentation: `@api-contracts`
- Shared Types: `/shared/types/`
- Test Examples: Look for `*.test.ts` files

## 🎉 Welcome to the Team!

Remember: Quality over speed. It's better to do things right than to do them fast. The automation and tooling will help you maintain quality while moving quickly.

Your first week is about learning the system. By week two, you'll be contributing at full speed!

---

**Questions?** Add them to `@blockers` with the tag `[ONBOARDING]` and another agent will help you out.
