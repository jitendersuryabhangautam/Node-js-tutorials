import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired } from '../middlewares/auth.js';
import { toPayment } from '../utils/transform.js';

const createPaymentSchema = z.object({
  order_id: z.string().uuid(),
  payment_method: z.string().min(2).optional()
});

const verifyPaymentSchema = z.object({
  payment_id: z.string().uuid().optional(),
  transaction_id: z.string().min(5)
});

export async function paymentRoutes(app) {
  app.post('/', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const body = createPaymentSchema.parse({
      ...(request.body || {}),
      ...(request.query || {})
    });

    const order = await prisma.order.findFirst({ where: { id: body.order_id, userId } });
    if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        status: 'processing',
        paymentMethod: body.payment_method || order.paymentMethod || 'cc'
      }
    });

    return reply.status(201).send({ success: true, data: toPayment(payment) });
  });

  app.post('/:id/verify', { preHandler: authRequired }, async (request, reply) => {
    const { id } = request.params;
    const body = verifyPaymentSchema.parse(request.body);
    if (body.payment_id && body.payment_id !== id) {
      return reply.status(400).send({ success: false, message: 'payment_id does not match path id' });
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'completed', transactionId: body.transaction_id }
    });

    return reply.send({ success: true, data: toPayment(payment) });
  });
}
