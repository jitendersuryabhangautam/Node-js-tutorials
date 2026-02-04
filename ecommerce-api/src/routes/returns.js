import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired } from '../middlewares/auth.js';
import { getPagination } from '../utils/pagination.js';
import { toReturn } from '../utils/transform.js';

const createReturnSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(3)
});

export async function returnRoutes(app) {
  app.post('/', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const body = createReturnSchema.parse(request.body);

    const order = await prisma.order.findFirst({ where: { id: body.order_id, userId } });
    if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });

    const created = await prisma.return.create({
      data: {
        orderId: order.id,
        userId,
        reason: body.reason
      }
    });

    return reply.status(201).send({ success: true, data: toReturn(created) });
  });

  app.get('/', { preHandler: authRequired }, async (request) => {
    const userId = request.user.sub;
    const { page, limit, skip } = getPagination(request.query || {});

    const [items, total] = await Promise.all([
      prisma.return.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.return.count({ where: { userId } })
    ]);

    const totalPages = Math.ceil(total / limit);
    return { success: true, data: { returns: items.map(toReturn), meta: { page, limit, total, totalPages } } };
  });

  app.get('/:id', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;

    const ret = await prisma.return.findFirst({ where: { id, userId } });
    if (!ret) return reply.status(404).send({ success: false, message: 'Return not found' });

    return { success: true, data: toReturn(ret) };
  });
}