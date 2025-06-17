/**
 * Agent Protocol Type Definitions
 * Defines the communication protocol between agents
 */

export type AgentRole = 
  | '@arch-01'
  | '@backend-01' 
  | '@frontend-01'
  | '@fullstack-01'
  | '@test-01'
  | '@devops-01';

export type MessageType = 
  | 'HANDOFF'
  | 'QUESTION'
  | 'BLOCKER'
  | 'UNBLOCK'
  | 'COMPLETE'
  | 'REVIEW_REQUEST'
  | 'DECISION';

export interface AgentMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | AgentRole[] | '@all';
  type: MessageType;
  subject: string;
  payload: {
    task?: string;
    context?: string;
    branch?: string;
    files?: string[];
    deadline?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface AgentStatus {
  agent: AgentRole;
  status: 'active' | 'blocked' | 'idle' | 'offline';
  currentTask: string | null;
  branch: string | null;
  blockedBy: string[];
  lastUpdate: string;
  completedTasks: number;
  activeFiles: string[];
}

export interface TaskAssignment {
  id: string;
  title: string;
  description: string;
  assignedTo: AgentRole;
  status: 'pending' | 'in-progress' | 'blocked' | 'review' | 'complete';
  branch?: string;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface FileAssignment {
  pattern: string;
  agent: AgentRole | null;
  lockedUntil: string | null;
  branch: string | null;
  description: string;
}

export interface HandoffRecord {
  id: string;
  fromAgent: AgentRole;
  toAgent: AgentRole;
  task: string;
  timestamp: string;
  branch: string;
  context: string;
  filesModified: string[];
  testsAdded: number;
  testsPassing: boolean;
  coverage: number;
  nextSteps: string[];
}

export interface BlockerRecord {
  id: string;
  agent: AgentRole;
  description: string;
  blockedBy: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: AgentRole;
  resolution?: string;
}

export interface AgentMetrics {
  agent: AgentRole;
  period: {
    start: string;
    end: string;
  };
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  tasksCompleted: number;
  tasksAssigned: number;
  handoffsGiven: number;
  handoffsReceived: number;
  blockersCreated: number;
  blockersResolved: number;
  averageTaskTime: number; // in hours
  codeQuality: {
    testCoverage: number;
    lintErrors: number;
    typeErrors: number;
  };
}

export interface Decision {
  id: string;
  title: string;
  decidedBy: AgentRole[];
  date: string;
  description: string;
  rationale: string;
  impact: {
    agent: AgentRole;
    description: string;
  }[];
  implementationNotes?: string;
  references?: string[];
}

// Helper functions for type guards
export function isAgentRole(value: string): value is AgentRole {
  return [
    '@arch-01',
    '@backend-01',
    '@frontend-01', 
    '@fullstack-01',
    '@test-01',
    '@devops-01'
  ].includes(value);
}

export function isMessageType(value: string): value is MessageType {
  return [
    'HANDOFF',
    'QUESTION',
    'BLOCKER',
    'UNBLOCK',
    'COMPLETE',
    'REVIEW_REQUEST',
    'DECISION'
  ].includes(value);
}

// Validation schemas (if using Zod)
export const agentMessageSchema = {
  id: 'string',
  from: 'AgentRole',
  to: 'AgentRole | AgentRole[] | "@all"',
  type: 'MessageType',
  subject: 'string',
  payload: 'object',
  timestamp: 'string (ISO 8601)'
};
