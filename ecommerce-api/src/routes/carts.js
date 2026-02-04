import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired } from '../middlewares/auth.js';
import { toCart } from '../utils/transform.js';

const addItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive()
});

export async function cartRoutes(app) {
  app.get('/', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      return reply.status(404).send({ success: false, message: 'Cart not found' });
    }

    return reply.send({ success: true, data: toCart(cart) });
  });

  app.get('/validate', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      return reply.status(200).send({ success: true, data: { valid: true, cart: null } });
    }

    const errors = cart.items
      .filter((i) => i.product.stockQuantity < i.quantity)
      .map((i) => `Insufficient stock for ${i.product.name}`);

    if (errors.length > 0) {
      return reply.status(409).send({ success: false, data: { valid: false, errors } });
    }

    return reply.send({ success: true, data: { valid: true, cart: toCart(cart) } });
  });

  app.post('/items', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const body = addItemSchema.parse(request.body);

    const product = await prisma.product.findUnique({ where: { id: body.product_id } });
    if (!product) return reply.status(404).send({ success: false, message: 'Product not found' });
    if (product.stockQuantity < body.quantity) {
      return reply.status(400).send({ success: false, message: 'Insufficient stock' });
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: body.product_id } },
      create: { cartId: cart.id, productId: body.product_id, quantity: body.quantity },
      update: { quantity: { increment: body.quantity } }
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } }
    });

    return reply.status(201).send({ success: true, data: toCart(updatedCart) });
  });

  app.put('/items/:itemId', { preHandler: authRequired }, async (request, reply) => {
    const schema = z.object({ quantity: z.number().int().positive() });
    const { quantity } = schema.parse(request.body);
    const { itemId } = request.params;

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });

    const cart = await prisma.cart.findFirst({
      where: { items: { some: { id: itemId } } },
      include: { items: { include: { product: true } } }
    });

    return reply.send({ success: true, data: toCart(cart) });
  });

  app.delete('/items/:itemId', { preHandler: authRequired }, async (request, reply) => {
    const { itemId } = request.params;
    await prisma.cartItem.delete({ where: { id: itemId } });

    const cart = await prisma.cart.findFirst({
      where: { items: { some: { id: itemId } } },
      include: { items: { include: { product: true } } }
    });

    return reply.send({ success: true, data: cart ? toCart(cart) : null });
  });

  app.delete('/', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return reply.send({ success: true, data: null });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return reply.send({ success: true, data: null });
  });
}