# Agent Context Directory

This directory maintains working memory for each agent between sessions, serving as a "second brain" for multi-agent coordination.

## Purpose
- **Preserve context** between Claude sessions (critical for AI agents)
- **Share understanding** between agents without re-explaining
- **Document work-in-progress** thoughts and explorations
- **Reduce re-reading overhead** by maintaining focused notes
- **Track decisions** and their rationale for future reference
- **Facilitate smooth handoffs** with complete context

## Directory Structure
```
@agent-context/
├── README.md              # This file
├── TEMPLATE.md           # Template for new agent context files
├── shared-decisions.md   # Cross-agent decisions log
├── arch-01.md           # System Architect's context
├── backend-01.md        # Backend Developer's context
├── frontend-01.md       # Frontend Developer's context
├── fullstack-01.md      # Full-Stack Developer's context
├── test-01.md           # QA Engineer's context
└── devops-01.md         # DevOps Engineer's context
```

## How to Use Your Context File

### Quick Start
```bash
# Use the interactive menu (recommended)
npm run agent:context
```

### 1. When Starting Work
```bash
# First, read your context file
cat @agent-context/{your-agent-name}.md

# Update your current focus
echo "\n## $(date +%Y-%m-%d) - Starting work on {feature}" >> @agent-context/{your-agent-name}.md
```

### 2. During Development
- **Save useful code snippets** that you might need again
- **Document decisions** with rationale
- **Note questions** for other agents
- **Track blockers** and dependencies
- **Record gotchas** and lessons learned

### 3. Before Handoff
- **Update your progress** in the context file
- **Document any unfinished work**
- **List questions or concerns**
- **Include helpful context** for the next agent

## Best Practices

### DO ✅
- Keep entries **dated** for chronological tracking
- Write in **markdown** for readability
- Include **code examples** that worked
- Document **why** decisions were made
- Update **immediately** when making decisions
- Cross-reference other agents with `@agent-name`
- Keep it **concise but complete**

### DON'T ❌
- Don't duplicate information from other files
- Don't let it become a general notebook
- Don't delete old entries (archive instead)
- Don't include sensitive information
- Don't forget to update before switching tasks

## Context File Sections

### Essential Sections
1. **Current Focus** - What you're working on now
2. **Work in Progress** - Detailed task breakdown
3. **Questions for Team** - Things you need clarified
4. **Technical Decisions** - Choices made and why
5. **Next Steps** - What comes after current work

### Optional Sections
- **Code Snippets & Patterns** - Reusable solutions
- **Performance Considerations** - Optimization notes
- **Security Considerations** - Security decisions
- **Testing Strategy** - Test approach and patterns
- **Learning Notes** - Discoveries and insights
- **Useful Commands** - Frequently used commands
- **Resources** - Helpful links and documentation

## Shared Decisions Log

Use `shared-decisions.md` for decisions that affect multiple agents:
- Architecture decisions
- API contracts
- Naming conventions
- Technology choices
- Process changes

## Example Workflow

### Agent Starting Work
```markdown
## 2025-01-15 - Starting Authentication Implementation

Picking up from @arch-01's design. JWT with refresh tokens approach.

Tasks:
- [ ] Create user model
- [ ] Implement password hashing
- [ ] Create JWT service
- [ ] Build auth endpoints

Questions:
- Should we implement account lockout? (for @arch-01)
- CORS settings needed? (for @frontend-01)
```

### Agent During Work
```markdown
### Discovered Issues
- Bcrypt is slow with default rounds, using 10 rounds
- Need to handle token refresh race conditions

### Useful Pattern
```typescript
// Token refresh with retry logic
const refreshWithRetry = async (attempts = 3) => {
  // Implementation that works well
};
```
```

### Agent Before Handoff
```markdown
### Handoff to @frontend-01

Auth API complete and tested:
- POST /api/v1/auth/register ✅
- POST /api/v1/auth/login ✅
- POST /api/v1/auth/refresh ✅
- POST /api/v1/auth/logout ✅

Notes for frontend:
- Refresh token in httpOnly cookie
- Access token in response body
- 401 on expired token (not 403)
- Rate limited to 5 requests/minute

See @api-contracts for full details.
```

## Manual Update Methods

### Using the Helper Script
```bash
# First time setup (make executable)
chmod +x scripts/update-context.sh

# Run directly
./scripts/update-context.sh

# Or use npm
npm run agent:context
```

### Command Line Updates
```bash
# Add a timestamped entry
echo "## $(date +%Y-%m-%d) - New decision" >> @agent-context/backend-01.md

# Add a decision with details
cat >> @agent-context/backend-01.md << EOF
## $(date +%Y-%m-%d) - API Rate Limiting
**Decision**: Implement rate limiting at 100 req/min per IP
**Rationale**: Prevent abuse while allowing legitimate usage
**Implementation**: Using Redis with sliding window
EOF

# Add a code snippet
cat >> @agent-context/frontend-01.md << 'EOF'
### Useful React Hook
```typescript
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
```
EOF
```

## Creating a New Agent Context

1. Copy the template:
```bash
cp @agent-context/TEMPLATE.md @agent-context/{new-agent-name}.md
```

2. Fill in the template sections

3. Add the agent to `@agent-roles`

## Tips for AI Agents (Claude)

1. **Always read your context file first** when starting a session
2. **Update immediately** after making decisions
3. **Reference other agents' contexts** when you have questions
4. **Use structured format** for easy scanning
5. **Include timestamps** for temporal context

## Maintenance

- **Weekly**: Review and archive old entries
- **Per Sprint**: Update shared decisions
- **Monthly**: Clean up completed items

Remember: Your context file is your persistent memory between sessions!
