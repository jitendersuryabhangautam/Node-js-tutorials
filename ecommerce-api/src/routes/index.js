import { healthRoutes } from './health.js';
import { readyRoutes } from './ready.js';
import { metricsRoutes } from './metrics.js';
import { authRoutes } from './auth.js';
import { productRoutes } from './products.js';
import { cartRoutes } from './carts.js';
import { orderRoutes } from './orders.js';
import { paymentRoutes } from './payments.js';
import { returnRoutes } from './returns.js';
import { adminRoutes } from './admin.js';
import { userRoutes } from './users.js';

export async function registerRoutes(app) {
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(readyRoutes, { prefix: '/ready' });
  await app.register(metricsRoutes, { prefix: '/metrics' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(productRoutes, { prefix: '/products' });
  await app.register(cartRoutes, { prefix: '/cart' });
  await app.register(orderRoutes, { prefix: '/orders' });
  await app.register(paymentRoutes, { prefix: '/payments' });
  await app.register(returnRoutes, { prefix: '/returns' });
  await app.register(adminRoutes);
  await app.register(userRoutes, { prefix: '/users' });
}