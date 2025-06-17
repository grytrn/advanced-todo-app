import { FastifyPluginAsync } from 'fastify';
import { TagService } from '../../services/tag.service';
// Prisma will be accessed via app.prisma

const tagRoutes: FastifyPluginAsync = async (app) => {
  const tagService = new TagService(app.prisma);

  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Get user's tags
  app.get<{
    Reply: { success: true; data: { tags: string[] } };
  }>('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const tags = await tagService.getUserTags(request.userId!);
    return reply.send({
      success: true,
      data: { tags },
    });
  });

  // Get popular tags (for suggestions)
  app.get<{
    Querystring: { limit?: string };
    Reply: { success: true; data: { tags: { name: string; count: number }[] } };
  }>('/popular', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', pattern: '^[0-9]+$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      count: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
    const tags = await tagService.getPopularTags(Math.min(limit, 50));
    return reply.send({
      success: true,
      data: { tags },
    });
  });
};

export default tagRoutes;