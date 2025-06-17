#!/usr/bin/env node

/**
 * Agent Metrics Dashboard Generator
 * Analyzes git history and generates metrics for multi-agent coordination
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const AGENTS = ['@arch-01', '@backend-01', '@frontend-01', '@fullstack-01', '@test-01', '@devops-01'];
const METRICS_FILE = path.join(__dirname, '..', '@agent-metrics.md');
const DAYS_TO_ANALYZE = 30;

// Metrics collection
const metrics = {
  commitsPerAgent: {},
  linesOfCodePerAgent: {},
  tasksCompletedPerAgent: {},
  averageTaskTime: {},
  blockerResolutionTime: {},
  handoffCount: {},
  fileOwnership: {},
  codeQuality: {}
};

// Initialize metrics
AGENTS.forEach(agent => {
  metrics.commitsPerAgent[agent] = 0;
  metrics.linesOfCodePerAgent[agent] = { added: 0, removed: 0 };
  metrics.tasksCompletedPerAgent[agent] = 0;
  metrics.handoffCount[agent] = { given: 0, received: 0 };
});

/**
 * Get git log for the past N days
 */
function getGitLog(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  
  try {
    const log = execSync(`git log --since="${sinceStr}" --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`, {
      encoding: 'utf8'
    });
    return log.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error getting git log:', error.message);
    return [];
  }
}

/**
 * Get detailed commit statistics
 */
function getCommitStats(commitHash) {
  try {
    const stats = execSync(`git show --stat --format="" ${commitHash}`, {
      encoding: 'utf8'
    });
    
    let added = 0, removed = 0;
    const lines = stats.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/(\d+) insertions?\(\+\).*?(\d+) deletions?\(-\)/);
      if (match) {
        added += parseInt(match[1], 10);
        removed += parseInt(match[2], 10);
      }
    });
    
    return { added, removed };
  } catch (error) {
    return { added: 0, removed: 0 };
  }
}

/**
 * Analyze @current-work file for task completion
 */
function analyzeCurrentWork() {
  const currentWorkFile = path.join(__dirname, '..', '@current-work');
  if (!fs.existsSync(currentWorkFile)) return;
  
  const content = fs.readFileSync(currentWorkFile, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    AGENTS.forEach(agent => {
      if (line.includes(agent) && line.includes('✅')) {
        metrics.tasksCompletedPerAgent[agent]++;
      }
    });
  });
}

/**
 * Analyze blockers and resolution time
 */
function analyzeBlockers() {
  const blockersFile = path.join(__dirname, '..', '@blockers');
  if (!fs.existsSync(blockersFile)) return;
  
  const content = fs.readFileSync(blockersFile, 'utf8');
  const lines = content.split('\n');
  
  // Simple analysis - count resolved blockers
  let blockerCount = 0;
  let resolvedCount = 0;
  
  lines.forEach(line => {
    if (line.includes('❌')) blockerCount++;
    if (line.includes('✅')) resolvedCount++;
  });
  
  metrics.blockerResolutionTime.total = blockerCount;
  metrics.blockerResolutionTime.resolved = resolvedCount;
  metrics.blockerResolutionTime.pending = blockerCount - resolvedCount;
}

/**
 * Analyze file ownership from @assignments.lock
 */
function analyzeFileOwnership() {
  const lockFile = path.join(__dirname, '..', '@assignments.lock');
  if (!fs.existsSync(lockFile)) return;
  
  try {
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    
    Object.entries(content.files).forEach(([pattern, info]) => {
      if (info.agent) {
        if (!metrics.fileOwnership[info.agent]) {
          metrics.fileOwnership[info.agent] = [];
        }
        metrics.fileOwnership[info.agent].push(pattern);
      }
    });
  } catch (error) {
    console.error('Error parsing assignments.lock:', error.message);
  }
}

/**
 * Main analysis function
 */
function analyzeGitHistory() {
  console.log('Analyzing git history...');
  const commits = getGitLog(DAYS_TO_ANALYZE);
  
  commits.forEach(commit => {
    const [hash, author, email, date, message] = commit.split('|');
    
    // Find agent from commit
    let agent = null;
    AGENTS.forEach(a => {
      if (message.includes(a) || author.includes(a.replace('@', ''))) {
        agent = a;
      }
    });
    
    if (agent) {
      metrics.commitsPerAgent[agent]++;
      
      // Get lines of code
      const stats = getCommitStats(hash);
      metrics.linesOfCodePerAgent[agent].added += stats.added;
      metrics.linesOfCodePerAgent[agent].removed += stats.removed;
      
      // Check for handoffs
      if (message.includes('Handoff:')) {
        metrics.handoffCount[agent].given++;
        
        // Find receiving agent
        const handoffMatch = message.match(/Handoff:\s*(@\w+-\d+)/);
        if (handoffMatch && metrics.handoffCount[handoffMatch[1]]) {
          metrics.handoffCount[handoffMatch[1]].received++;
        }
      }
    }
  });
}

/**
 * Generate markdown report
 */
function generateReport() {
  const now = new Date().toISOString();
  
  let report = `# Agent Metrics Dashboard

Generated: ${now}
Period: Last ${DAYS_TO_ANALYZE} days

## 📊 Commit Activity

| Agent | Commits | Lines Added | Lines Removed | Net Change |
|-------|---------|-------------|---------------|------------|
`;

  AGENTS.forEach(agent => {
    const commits = metrics.commitsPerAgent[agent];
    const added = metrics.linesOfCodePerAgent[agent].added;
    const removed = metrics.linesOfCodePerAgent[agent].removed;
    const net = added - removed;
    report += `| ${agent} | ${commits} | +${added} | -${removed} | ${net > 0 ? '+' : ''}${net} |\n`;
  });

  report += `
## ✅ Task Completion

| Agent | Tasks Completed |
|-------|----------------|
`;

  AGENTS.forEach(agent => {
    report += `| ${agent} | ${metrics.tasksCompletedPerAgent[agent]} |\n`;
  });

  report += `
## 🤝 Handoff Statistics

| Agent | Handoffs Given | Handoffs Received |
|-------|----------------|-------------------|
`;

  AGENTS.forEach(agent => {
    report += `| ${agent} | ${metrics.handoffCount[agent].given} | ${metrics.handoffCount[agent].received} |\n`;
  });

  report += `
## 🚧 Blocker Analysis

- Total Blockers: ${metrics.blockerResolutionTime.total || 0}
- Resolved: ${metrics.blockerResolutionTime.resolved || 0}
- Pending: ${metrics.blockerResolutionTime.pending || 0}
- Resolution Rate: ${metrics.blockerResolutionTime.total ? 
    ((metrics.blockerResolutionTime.resolved / metrics.blockerResolutionTime.total) * 100).toFixed(1) : 0}%

## 📁 File Ownership

`;

  Object.entries(metrics.fileOwnership).forEach(([agent, files]) => {
    if (files.length > 0) {
      report += `### ${agent}\n`;
      files.forEach(file => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }
  });

  report += `
## 💡 Insights

`;

  // Generate insights
  const mostActiveAgent = Object.entries(metrics.commitsPerAgent)
    .sort(([,a], [,b]) => b - a)[0];
  
  const mostProductiveAgent = Object.entries(metrics.linesOfCodePerAgent)
    .map(([agent, stats]) => [agent, stats.added - stats.removed])
    .sort(([,a], [,b]) => b - a)[0];

  report += `- Most Active Agent: ${mostActiveAgent[0]} (${mostActiveAgent[1]} commits)\n`;
  report += `- Most Productive Agent: ${mostProductiveAgent[0]} (${mostProductiveAgent[1]} net lines)\n`;
  
  const avgCommitsPerAgent = Object.values(metrics.commitsPerAgent)
    .reduce((a, b) => a + b, 0) / AGENTS.length;
  report += `- Average Commits per Agent: ${avgCommitsPerAgent.toFixed(1)}\n`;

  // Collaboration score
  const totalHandoffs = Object.values(metrics.handoffCount)
    .reduce((sum, h) => sum + h.given + h.received, 0);
  report += `- Total Handoffs: ${totalHandoffs}\n`;
  report += `- Collaboration Score: ${(totalHandoffs / AGENTS.length).toFixed(1)} handoffs per agent\n`;

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    // Run all analyses
    analyzeGitHistory();
    analyzeCurrentWork();
    analyzeBlockers();
    analyzeFileOwnership();
    
    // Generate and save report
    const report = generateReport();
    fs.writeFileSync(METRICS_FILE, report);
    
    console.log(`✅ Metrics report generated: ${METRICS_FILE}`);
    console.log('\nSummary:');
    console.log(`- Total Commits: ${Object.values(metrics.commitsPerAgent).reduce((a, b) => a + b, 0)}`);
    console.log(`- Total Tasks Completed: ${Object.values(metrics.tasksCompletedPerAgent).reduce((a, b) => a + b, 0)}`);
    console.log(`- Pending Blockers: ${metrics.blockerResolutionTime.pending || 0}`);
    
  } catch (error) {
    console.error('Error generating metrics:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeGitHistory, generateReport };
