export const testTodos = {
  personal: [
    {
      title: 'Buy groceries',
      description: 'Milk, eggs, bread, vegetables',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      tags: ['personal', 'shopping'],
    },
    {
      title: 'Workout',
      description: '30 minutes cardio + weights',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(),
      tags: ['personal', 'health'],
    },
    {
      title: 'Read book',
      description: 'Finish chapter 5',
      priority: 'low',
      status: 'completed',
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      tags: ['personal', 'learning'],
    },
  ],
  work: [
    {
      title: 'Complete project proposal',
      description: 'Draft proposal for new client project',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      tags: ['work', 'urgent'],
    },
    {
      title: 'Team meeting',
      description: 'Weekly sync with development team',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      tags: ['work', 'meeting'],
    },
    {
      title: 'Code review',
      description: 'Review PR #123',
      priority: 'medium',
      status: 'completed',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      tags: ['work', 'development'],
    },
  ],
};

export const invalidTodos = {
  noTitle: {
    description: 'Missing title',
    priority: 'high',
    status: 'pending',
  },
  invalidPriority: {
    title: 'Invalid priority',
    priority: 'super-high',
    status: 'pending',
  },
  invalidStatus: {
    title: 'Invalid status',
    priority: 'high',
    status: 'not-a-status',
  },
  pastDueDate: {
    title: 'Past due date',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  },
};