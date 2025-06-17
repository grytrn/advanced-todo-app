# Smart Agent Handoff System

## Overview

The Smart Agent Handoff System automates the coordination between agents when work is passed from one to another. It uses GitHub Actions to detect handoffs and automatically:

- Creates GitHub issues for the receiving agent
- Updates coordination files (`@current-work`, `@blockers`, `@handoffs.log`)
- Sends notifications to configured channels
- Tracks handoff metrics
- Maintains a blocker summary

## How It Works

### 1. Automatic Detection

The system detects handoffs through:

- **Commit messages** containing `Handoff: @agent-name`
- **Pull Request bodies** containing `To Agent: @agent-name`
- **Manual triggers** using the handoff script

### 2. Automated Actions

When a handoff is detected:

1. **Issue Creation**: A GitHub issue is created with:
   - Clear handoff context
   - Links to relevant commits/PRs
   - Next steps for the receiving agent
   - Appropriate labels

2. **File Updates**: Coordination files are automatically updated:
   - `@current-work` - Status changes for both agents
   - `@blockers` - Resolved if "unblock" is mentioned
   - `@handoffs.log` - Handoff history tracking

3. **Notifications**: Alerts sent to configured channels:
   - Slack
   - Discord
   - Email (when configured)

4. **Metrics**: Updates agent performance metrics

## Usage

### Method 1: Commit Message Handoff

Include `Handoff: @agent-name` in your commit message:

```bash
git commit -m "feat(backend): complete auth API implementation

- JWT tokens with refresh
- Rate limiting added
- Full test coverage

Handoff: @frontend-01
Next: Implement auth UI components"
```

### Method 2: Pull Request Handoff

Use the `agent_handoff.md` PR template:

```markdown
**From Agent**: @backend-01
**To Agent**: @frontend-01
**Feature Branch**: feature/backend-auth

## What's Done
Auth API implementation complete...
```

### Method 3: Manual Handoff Script

Use the interactive handoff script:

```bash
# Basic usage
./scripts/handoff.sh @frontend-01 "Auth API complete, ready for UI"

# Or use npm
npm run handoff @frontend-01 "Auth API complete"
```

The script will:
- Update all coordination files
- Create a properly formatted commit
- Guide you through the handoff process

## Configuration

Edit `.github/agent-handoff-config.yml` to customize:

```yaml
# Enable/disable features
handoff_issues: true
update_coordination_files: true
blocker_summary: true

# Map agents to GitHub users
agent_github_mapping:
  "@backend-01": "johndoe"
  "@frontend-01": "janedoe"

# Configure notifications
notifications:
  slack:
    enabled: true
    webhook_url: "${SLACK_WEBHOOK_URL}"
```

## Notifications

### Slack Integration

1. Create a Slack webhook URL
2. Add to repository secrets: `SLACK_WEBHOOK_URL`
3. Enable in config file

### Discord Integration

1. Create a Discord webhook URL
2. Add to repository secrets: `DISCORD_WEBHOOK_URL`
3. Enable in config file

## Blocker Management

The system automatically:
- Tracks active blockers
- Creates/updates a summary issue when blockers exist
- Resolves blockers when "unblock" is mentioned in handoffs

## Best Practices

### For Clear Handoffs

1. **Be Specific**: Clearly state what's done and what's next
2. **Reference Resources**: Link to relevant docs, PRs, or issues
3. **Update Context**: Ensure your agent context file is current
4. **Resolve Blockers**: Explicitly mention if you're unblocking someone

### Commit Message Format

```
feat(scope): complete task description

[Detailed changes]

Handoff: @next-agent
Unblocks: @next-agent (if applicable)
Next: Clear description of next steps
Docs: Updated @api-contracts, README
```

### PR Handoff Format

Use the provided template and fill in all sections:
- What's done
- What's next
- Known issues
- Questions for next agent

## Troubleshooting

### Issue Not Created

Check:
- GitHub Actions are enabled
- Commit is pushed to main/develop
- Handoff pattern matches exactly
- Repository has issues enabled

### Files Not Updated

Check:
- GitHub Actions has write permissions
- Files exist in repository
- No merge conflicts

### Notifications Not Sent

Check:
- Webhook URLs are configured
- Secrets are set in repository
- Config file enables notifications

## Advanced Features

### Custom Labels

The system automatically creates and applies labels:
- `handoff` - All handoff issues
- `agent-coordination` - Coordination tasks
- `{agent-name}` - Agent-specific labels
- `blocker` - Blocker-related issues

### Handoff Metrics

View handoff patterns with:
```bash
npm run agent:metrics
```

This shows:
- Handoff frequency between agents
- Average handoff completion time
- Common handoff patterns

### Automation Rules

Configure behavior in `agent-handoff-config.yml`:

```yaml
rules:
  auto_close_completed_handoffs: true
  handoff_timeout_hours: 48
  require_handoff_acceptance: false
```

## Examples

### Backend to Frontend Handoff

```bash
# Complete your work
git add .
git commit -m "feat(backend): implement user profile API

- GET/PUT /api/v1/users/:id
- Avatar upload to S3
- 100% test coverage

Handoff: @frontend-01
Next: Create profile UI components
Docs: Updated @api-contracts"

git push origin feature/backend-profile
```

### Unblocking Another Agent

```bash
git commit -m "fix(backend): resolve auth token issue

Fixes race condition in token refresh

Handoff: @frontend-01
Unblocks: @frontend-01
Next: Can now implement auto-refresh in UI"
```

### Multi-Agent Handoff

```bash
./scripts/handoff.sh @test-01 "Feature complete, ready for testing"
# Then in commit message:
# "Also needs review from @arch-01 for security"
```

## Benefits

1. **No Lost Handoffs**: Every handoff creates a trackable issue
2. **Clear Status**: Always know who's working on what
3. **Automatic Updates**: No manual file editing needed
4. **Audit Trail**: Complete history of all handoffs
5. **Reduced Friction**: Smooth transitions between agents

## Future Enhancements

- Integration with project management tools
- Automatic PR assignment based on handoffs
- Handoff templates for common scenarios
- Mobile notifications
- Dashboard for handoff visualization
