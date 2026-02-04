import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired } from '../middlewares/auth.js';
import { getPagination } from '../utils/pagination.js';
import { toOrder, toPayment } from '../utils/transform.js';

const createOrderSchema = z.object({
  shipping_address: z.record(z.any()),
  billing_address: z.record(z.any()),
  payment_method: z.enum(['cc', 'dc', 'cod'])
});

export async function orderRoutes(app) {
  app.get('/', { preHandler: authRequired }, async (request) => {
    const userId = request.user.sub;
    const { page, limit, skip } = getPagination(request.query || {});

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: { items: { include: { product: true } }, payments: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where: { userId } })
    ]);

    const totalPages = Math.ceil(total / limit);
    return { success: true, data: { orders: items.map(toOrder), meta: { page, limit, total, totalPages } } };
  });

  app.get('/:id', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { items: { include: { product: true } }, payments: true }
    });

    if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });
    return { success: true, data: toOrder(order) };
  });

  app.post('/', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const body = createOrderSchema.parse(request.body);

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      return reply.status(400).send({ success: false, message: 'Cart is empty' });
    }

    const insufficient = cart.items.find((i) => i.product.stockQuantity < i.quantity);
    if (insufficient) {
      return reply.status(400).send({ success: false, message: 'Insufficient stock for one or more items' });
    }

    const totalAmount = cart.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          orderNumber,
          totalAmount,
          status: 'pending',
          paymentMethod: body.payment_method,
          shippingAddress: body.shipping_address,
          billingAddress: body.billing_address,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              priceAtTime: i.product.price
            }))
          }
        },
        include: { items: { include: { product: true } } }
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      if (body.payment_method === 'cc' || body.payment_method === 'dc') {
        await tx.payment.create({
          data: {
            orderId: created.id,
            amount: created.totalAmount,
            status: 'completed',
            paymentMethod: body.payment_method
          }
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    return reply.status(201).send({ success: true, data: toOrder(order) });
  });

  app.put('/:id/cancel', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;

    const order = await prisma.order.findFirst({ where: { id, userId } });
    if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    return reply.send({ success: true, data: toOrder(updated) });
  });

  app.get('/:id/payment', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;

    const order = await prisma.order.findFirst({ where: { id, userId } });
    if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });

    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    if (!payment) return reply.status(404).send({ success: false, message: 'Payment not found' });

    return reply.send({ success: true, data: toPayment(payment) });
  });
}
