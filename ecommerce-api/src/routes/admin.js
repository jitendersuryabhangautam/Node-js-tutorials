import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired, adminRequired } from '../middlewares/auth.js';
import { getPagination } from '../utils/pagination.js';
import { toProduct, toOrder, toReturn, toUser } from '../utils/transform.js';

const adminProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  image_url: z.string().url().optional()
});

export async function adminRoutes(app) {
  app.register(async (admin) => {
    admin.addHook('preHandler', authRequired);
    admin.addHook('preHandler', adminRequired);

    admin.post('/products', async (request, reply) => {
      const body = adminProductSchema.parse(request.body);
      const created = await prisma.product.create({
        data: {
          sku: body.sku,
          name: body.name,
          description: body.description,
          price: body.price,
          stockQuantity: body.stock ?? 0,
          category: body.category,
          imageUrl: body.image_url
        }
      });

      return reply.status(201).send({ success: true, data: toProduct(created) });
    });

    admin.get('/products', async (request) => {
      const { page, limit, skip } = getPagination(request.query || {});
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const where = { createdAt: { gte: since } };

      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where })
      ]);

      const products = items.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category ?? null,
        price: Number(p.price),
        stock: p.stockQuantity,
        image_url: p.imageUrl ?? null,
        description: p.description ?? null,
        created_at: p.createdAt
      }));

      const totalPages = Math.ceil(total / limit);
      return { success: true, data: { products, meta: { page, limit, total, totalPages } } };
    });

    admin.put('/products/:id', async (request, reply) => {
      const { id } = request.params;
      const body = adminProductSchema.partial().parse(request.body);

      const updated = await prisma.product.update({
        where: { id },
        data: {
          sku: body.sku,
          name: body.name,
          description: body.description,
          price: body.price,
          stockQuantity: body.stock,
          category: body.category,
          imageUrl: body.image_url
        }
      });

      return reply.send({ success: true, data: toProduct(updated) });
    });

    admin.delete('/products/:id', async (request, reply) => {
      const { id } = request.params;
      await prisma.product.delete({ where: { id } });
      return reply.send({ success: true, data: null });
    });

    admin.get('/orders', async (request) => {
      const { page, limit, skip } = getPagination(request.query || {});
      const { status } = request.query || {};
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const where = {
        ...(status ? { status: String(status) } : {}),
        createdAt: { gte: since }
      };

      const [items, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: { user: true, items: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({ where })
      ]);

      const orders = items.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        user_id: o.userId,
        user: o.user ? { id: o.user.id, email: o.user.email } : null,
        total_amount: Number(o.totalAmount),
        status: o.status,
        created_at: o.createdAt,
        updated_at: o.updatedAt,
        items: o.items.map((i) => ({ product_id: i.productId, quantity: i.quantity }))
      }));

      const totalPages = Math.ceil(total / limit);
      return { success: true, data: { orders, meta: { page, limit, total, totalPages } } };
    });

    admin.get('/orders/:id', async (request, reply) => {
      const { id } = request.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, payments: true }
      });
      if (!order) return reply.status(404).send({ success: false, message: 'Order not found' });
      return reply.send({ success: true, data: toOrder(order) });
    });

    admin.put('/orders/:id/status', async (request, reply) => {
      const schema = z.object({ status: z.string().min(3) });
      const { status } = schema.parse(request.body);
      const { id } = request.params;

      const updated = await prisma.order.update({ where: { id }, data: { status } });
      return reply.send({ success: true, data: toOrder(updated) });
    });

    admin.get('/orders/recent', async (request) => {
      const limit = Math.min(50, Math.max(1, Number(request.query?.limit || 10)));
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const items = await prisma.order.findMany({
        include: { user: true },
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const orders = items.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        user_id: o.userId,
        user: o.user ? { id: o.user.id, email: o.user.email } : null,
        total_amount: Number(o.totalAmount),
        status: o.status,
        created_at: o.createdAt
      }));

      return { success: true, data: { limit, orders } };
    });

    admin.get('/users', async (request) => {
      const { page, limit, skip } = getPagination(request.query || {});
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const where = { createdAt: { gte: since } };

      const [items, total] = await Promise.all([
        prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
        prisma.user.count({ where })
      ]);

      const users = items.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName ?? null,
        last_name: u.lastName ?? null,
        role: u.role,
        created_at: u.createdAt
      }));

      const totalPages = Math.ceil(total / limit);
      return { success: true, data: { users, meta: { page, limit, total, totalPages } } };
    });

    admin.put('/users/:id/role', async (request, reply) => {
      const schema = z.object({ role: z.string().min(3) });
      const { role } = schema.parse(request.body);
      const { id } = request.params;

      const updated = await prisma.user.update({ where: { id }, data: { role } });
      return reply.send({ success: true, data: toUser(updated) });
    });

    admin.get('/returns', async (request) => {
      const { page, limit, skip } = getPagination(request.query || {});
      const { status } = request.query || {};
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const where = {
        ...(status ? { status: String(status) } : {}),
        createdAt: { gte: since }
      };

      const [items, total] = await Promise.all([
        prisma.return.findMany({
          where,
          include: { order: true, user: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.return.count({ where })
      ]);

      const returns = items.map((r) => ({
        id: r.id,
        order_id: r.orderId,
        order: r.order ? { order_number: r.order.orderNumber } : null,
        user: r.user ? { id: r.user.id, email: r.user.email } : null,
        reason: r.reason,
        status: r.status,
        refund_amount: r.refundAmount ?? 0,
        created_at: r.createdAt,
        updated_at: r.updatedAt
      }));

      const totalPages = Math.ceil(total / limit);
      return { success: true, data: { returns, meta: { page, limit, total, totalPages } } };
    });

    admin.post('/returns/:returnId/process', async (request, reply) => {
      const schema = z.object({ status: z.string().min(3), refund_amount: z.number().nonnegative().optional() });
      const body = schema.parse(request.body);
      const { returnId } = request.params;

      const updated = await prisma.return.update({
        where: { id: returnId },
        data: { status: body.status, refundAmount: body.refund_amount }
      });

      return reply.send({ success: true, data: toReturn(updated) });
    });

    admin.get('/analytics', async (request) => {
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [productCount, customerCount, orderCount] = await Promise.all([
        prisma.product.count(),
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.order.count({ where: { createdAt: { gte: since } } })
      ]);

      const revenueAgg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed', createdAt: { gte: since } }
      });

      const totalRevenue = Number(revenueAgg._sum.amount || 0);
      const avgOrderValue = orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(2)) : 0;

      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: since } }
      });

      return {
        success: true,
        data: {
          range_days: days,
          totals: {
            total_revenue: totalRevenue,
            total_orders: orderCount,
            total_products: productCount,
            total_customers: customerCount,
            avg_order_value: avgOrderValue
          },
          orders_by_status: ordersByStatus.map((o) => ({ status: o.status, count: o._count.status }))
        }
      };
    });

    admin.get('/products/top', async (request) => {
      const limit = Math.min(50, Math.max(1, Number(request.query?.limit || 5)));
      const days = Math.min(365, Math.max(1, Number(request.query?.range_days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await prisma.$queryRawUnsafe(`
        SELECT p.id, p.sku, p.name, p.description, p.price, p.stock_quantity, p.category, p.image_url,
               p.created_at, p.updated_at,
               COALESCE(SUM(oi.quantity), 0) AS total_quantity,
               COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS total_revenue
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= $1
        GROUP BY p.id
        ORDER BY total_quantity DESC
        LIMIT $2
      `, since, limit);

      const items = rows.map((r) => ({
        product: {
          id: r.id,
          name: r.name,
          category: r.category ?? null,
          price: Number(r.price),
          stock: r.stock_quantity,
          image_url: r.image_url ?? null
        },
        total_quantity: Number(r.total_quantity),
        total_revenue: Number(r.total_revenue)
      }));

      return { success: true, data: { range_days: days, items } };
    });
  }, { prefix: '/admin' });
}
