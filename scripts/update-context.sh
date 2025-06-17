#!/bin/bash
# Agent Context Update Helper Script
# Usage: ./scripts/update-context.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get agent name from git config or prompt
AGENT_NAME=$(git config user.name)
if [[ ! "$AGENT_NAME" =~ ^@.*-[0-9]+$ ]]; then
    echo -e "${YELLOW}Enter your agent name (e.g., @backend-01):${NC}"
    read AGENT_NAME
fi

CONTEXT_FILE="@agent-context/${AGENT_NAME#@}.md"

# Function to add a timestamp
add_timestamp() {
    echo -e "\n## $(date +"%Y-%m-%d %H:%M") - $1\n" >> "$CONTEXT_FILE"
}

# Function to show menu
show_menu() {
    echo -e "\n${BLUE}Agent Context Update Menu${NC}"
    echo "1) Add current focus update"
    echo "2) Add technical decision"
    echo "3) Add question for another agent"
    echo "4) Add code snippet/pattern"
    echo "5) Add blocker/issue"
    echo "6) Add learning note"
    echo "7) Add handoff notes"
    echo "8) View my context file"
    echo "9) View another agent's context"
    echo "0) Exit"
}

# Main loop
while true; do
    show_menu
    read -p "Select option: " choice
    
    case $choice in
        1)
            echo "Enter current focus:"
            read -r focus
            add_timestamp "Current Focus Update"
            echo "$focus" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Focus updated${NC}"
            ;;
        
        2)
            echo "Enter decision title:"
            read -r title
            echo "Enter decision details:"
            read -r decision
            echo "Enter rationale:"
            read -r rationale
            
            add_timestamp "Decision: $title"
            cat >> "$CONTEXT_FILE" << EOF
**Decision**: $decision
**Rationale**: $rationale
EOF
            echo -e "${GREEN}✓ Decision recorded${NC}"
            ;;
        
        3)
            echo "Enter agent to ask (e.g., @frontend-01):"
            read -r target_agent
            echo "Enter your question:"
            read -r question
            
            add_timestamp "Question for $target_agent"
            echo "**Question**: $question" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Question recorded${NC}"
            ;;
        
        4)
            echo "Enter snippet title:"
            read -r title
            echo "Enter language (js, ts, bash, etc):"
            read -r lang
            echo "Enter code (press Ctrl+D when done):"
            
            add_timestamp "Code Snippet: $title"
            echo '```'"$lang" >> "$CONTEXT_FILE"
            cat >> "$CONTEXT_FILE"
            echo -e "\n\`\`\`" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Code snippet saved${NC}"
            ;;
        
        5)
            echo "Enter blocker/issue description:"
            read -r blocker
            
            add_timestamp "Blocker/Issue"
            echo "❌ $blocker" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Blocker recorded${NC}"
            ;;
        
        6)
            echo "Enter learning note:"
            read -r note
            
            add_timestamp "Learning Note"
            echo "💡 $note" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Learning note saved${NC}"
            ;;
        
        7)
            echo "Enter agent to hand off to:"
            read -r target_agent
            echo "Enter handoff notes:"
            read -r notes
            
            add_timestamp "Handoff to $target_agent"
            echo "$notes" >> "$CONTEXT_FILE"
            echo -e "${GREEN}✓ Handoff notes recorded${NC}"
            ;;
        
        8)
            echo -e "\n${BLUE}=== Your Context File ===${NC}"
            cat "$CONTEXT_FILE"
            echo -e "${BLUE}=== End of File ===${NC}"
            ;;
        
        9)
            echo "Enter agent name to view (e.g., backend-01):"
            read -r other_agent
            OTHER_FILE="@agent-context/$other_agent.md"
            if [ -f "$OTHER_FILE" ]; then
                echo -e "\n${BLUE}=== $other_agent Context File ===${NC}"
                cat "$OTHER_FILE"
                echo -e "${BLUE}=== End of File ===${NC}"
            else
                echo -e "${YELLOW}File not found: $OTHER_FILE${NC}"
            fi
            ;;
        
        0)
            echo -e "${GREEN}Context file updated. Happy coding!${NC}"
            exit 0
            ;;
        
        *)
            echo -e "${YELLOW}Invalid option${NC}"
            ;;
    esac
done
