# Agent Handoff Pull Request

**From Agent**: @<!-- your agent name -->
**To Agent**: @<!-- next agent name or 'none' -->
**Feature Branch**: <!-- branch name -->

## 📋 Completion Checklist

### Code Quality
- [ ] All tests pass (`npm run test`)
- [ ] Lint passes with zero warnings (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Test coverage >= 80% (100% for auth/payment paths)
- [ ] No `console.log` statements
- [ ] No `any` types in TypeScript
- [ ] Error handling implemented for all edge cases

### Documentation
- [ ] Code comments added for complex logic
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] ADR created for architectural decisions (if applicable)

### Agent Coordination
- [ ] Updated `@current-work` with completion status
- [ ] Updated `@api-contracts` (if new endpoints added)
- [ ] Resolved related entries in `@blockers`
- [ ] Updated `@assignments.lock` (if taking new ownership)
- [ ] Added decisions to `@agent-context/shared-decisions.md` (if applicable)

## 🎯 What's Done

### Summary
<!-- Brief description of what was implemented -->

### Technical Details
<!-- List key technical changes -->
- 
- 
- 

### API Changes (if applicable)
<!-- List any new or modified endpoints -->
```
POST /api/v1/...
GET /api/v1/...
```

### Database Changes (if applicable)
<!-- Describe any schema changes or migrations -->

## 🚀 What's Next

### For Next Agent
<!-- Clear instructions for the next agent -->
1. 
2. 
3. 

### Prerequisites
<!-- What the next agent needs before starting -->
- [ ] 
- [ ] 

### Useful Context
<!-- Any context that would help the next agent -->

## ⚠️ Known Issues

<!-- List any known issues or limitations -->
- 
- 

## 🧪 Testing Instructions

### How to Test
1. 
2. 
3. 

### Expected Behavior
<!-- What should happen when testing -->

### Edge Cases to Verify
- [ ] 
- [ ] 

## 📸 Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## 🔗 Related Issues/PRs

<!-- Link to related issues or PRs -->
- Closes #
- Related to #

## 💬 Questions for Review

<!-- Any specific questions for reviewers or next agent -->
- 
- 

---

**Handoff Notes**: <!-- Any additional context for smooth handoff -->
