#!/bin/bash
# Manual handoff helper script
# Usage: ./scripts/handoff.sh @next-agent "Task description"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 @next-agent \"Task description\"${NC}"
    echo -e "Example: $0 @frontend-01 \"Auth API complete, ready for UI\""
    exit 1
fi

NEXT_AGENT=$1
TASK=$2
CURRENT_AGENT=$(git config user.name)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
BRANCH=$(git branch --show-current)

# Validate agent format
if [[ ! "$NEXT_AGENT" =~ ^@[a-zA-Z]+-[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid agent format. Use @role-number (e.g., @backend-01)${NC}"
    exit 1
fi

# Determine current agent
if [[ ! "$CURRENT_AGENT" =~ ^@[a-zA-Z]+-[0-9]+$ ]]; then
    echo -e "${YELLOW}Your git user.name is not in agent format.${NC}"
    echo -n "Enter your agent name (e.g., @backend-01): "
    read CURRENT_AGENT
fi

echo -e "${BLUE}=== Agent Handoff ===${NC}"
echo -e "From: ${GREEN}$CURRENT_AGENT${NC}"
echo -e "To: ${GREEN}$NEXT_AGENT${NC}"
echo -e "Task: $TASK"
echo -e "Branch: $BRANCH"
echo ""

# Update coordination files
echo -e "${YELLOW}Updating coordination files...${NC}"

# Update @current-work
echo "[$TIMESTAMP] $CURRENT_AGENT: ✅ Completed - $TASK" >> @current-work
echo "[$TIMESTAMP] $NEXT_AGENT: ⏳ Received handoff - $TASK | $BRANCH" >> @current-work
echo -e "${GREEN}✓${NC} Updated @current-work"

# Update @handoffs.log
echo "[$TIMESTAMP] $CURRENT_AGENT → $NEXT_AGENT: $TASK | Branch: $BRANCH" >> @handoffs.log
echo -e "${GREEN}✓${NC} Updated @handoffs.log"

# Check for blockers to resolve
echo -n "Are you unblocking $NEXT_AGENT? (y/n): "
read -n 1 UNBLOCK
echo ""

if [[ "$UNBLOCK" =~ ^[Yy]$ ]]; then
    echo "[$TIMESTAMP] $CURRENT_AGENT: ✅ Unblocked $NEXT_AGENT - $TASK complete" >> @blockers
    echo -e "${GREEN}✓${NC} Updated @blockers"
fi

# Update agent context
echo -e "\n${YELLOW}Updating your context file...${NC}"
cat >> "@agent-context/${CURRENT_AGENT#@}.md" << EOF

## $TIMESTAMP - Handoff to $NEXT_AGENT

**Task Completed**: $TASK
**Branch**: $BRANCH

### Handoff Notes
- Task is ready for next phase
- See @api-contracts for any new endpoints
- Check PR/commit for implementation details

### For $NEXT_AGENT:
EOF

echo -n "Add any specific notes for $NEXT_AGENT (press Enter to skip): "
read NOTES
if [ -n "$NOTES" ]; then
    echo "$NOTES" >> "@agent-context/${CURRENT_AGENT#@}.md"
fi

echo -e "${GREEN}✓${NC} Updated agent context"

# Create commit
echo -e "\n${YELLOW}Creating handoff commit...${NC}"

git add @current-work @handoffs.log @blockers "@agent-context/${CURRENT_AGENT#@}.md"

# Generate commit message
COMMIT_MSG="feat: complete $TASK

Handoff: $NEXT_AGENT
Task: $TASK
Status: Ready for next phase"

if [[ "$UNBLOCK" =~ ^[Yy]$ ]]; then
    COMMIT_MSG="$COMMIT_MSG
Unblocks: $NEXT_AGENT"
fi

echo -e "\n${BLUE}Commit message:${NC}"
echo "$COMMIT_MSG"
echo ""

echo -n "Create commit? (y/n): "
read -n 1 CONFIRM
echo ""

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓${NC} Commit created"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Push your branch: git push origin $BRANCH"
    echo "2. Create a PR using the agent_handoff.md template"
    echo "3. The handoff automation will create an issue for $NEXT_AGENT"
else
    echo -e "${YELLOW}Commit cancelled. Files are staged for manual commit.${NC}"
fi

# Show summary
echo -e "\n${BLUE}=== Handoff Summary ===${NC}"
echo -e "✓ Updated @current-work"
echo -e "✓ Updated @handoffs.log"
[[ "$UNBLOCK" =~ ^[Yy]$ ]] && echo -e "✓ Resolved blocker"
echo -e "✓ Updated agent context"
echo -e "✓ Prepared handoff commit"
echo -e "\n${GREEN}Handoff prepared successfully!${NC}"
