import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('tag-service');

export class TagService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all unique tags used by a user's todos
   */
  async getUserTags(userId: string): Promise<string[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        todos: {
          some: {
            todo: {
              userId,
              deletedAt: null,
            },
          },
        },
      },
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    logger.info({ userId, count: tags.length }, 'User tags retrieved');

    return tags.map(tag => tag.name);
  }

  /**
   * Get popular tags across all users (for suggestions)
   */
  async getPopularTags(limit: number = 20): Promise<{ name: string; count: number }[]> {
    const tags = await this.prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT t.name, COUNT(DISTINCT tt.todo_id)::bigint as count
      FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      INNER JOIN todos td ON tt.todo_id = td.id
      WHERE td.deleted_at IS NULL
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return tags.map(tag => ({
      name: tag.name,
      count: Number(tag.count),
    }));
  }
}