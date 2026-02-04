import prisma from '../db/prisma.js';
import redis from '../db/redis.js';
import { getPagination } from '../utils/pagination.js';
import { toProduct } from '../utils/transform.js';

export async function productRoutes(app) {
  app.get('/', async (request) => {
    const { page, limit, skip } = getPagination(request.query || {});
    const { category, search } = request.query || {};
    const cacheKey = `products:${page}:${limit}:${category || ''}:${search || ''}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where = {
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: String(search), mode: 'insensitive' } } : {})
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    const payload = { success: true, data: { products: items.map(toProduct), meta: { page, limit, total, totalPages } } };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60);
    return payload;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `products:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.status(404).send({ success: false, message: 'Product not found' });

    const payload = { success: true, data: toProduct(product) };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60);
    return payload;
  });
}