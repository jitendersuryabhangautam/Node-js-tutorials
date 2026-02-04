import prisma from '../db/prisma.js';
import redis from '../db/redis.js';

export async function readyRoutes(app) {
  app.get('/', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      return reply.send({ success: true, data: { status: 'ready' } });
    } catch (err) {
      return reply.status(503).send({ success: false, message: 'Not ready' });
    }
  });
}