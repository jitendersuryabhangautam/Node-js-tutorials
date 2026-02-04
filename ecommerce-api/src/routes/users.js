import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authRequired } from '../middlewares/auth.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { toUser } from '../utils/transform.js';

export async function userRoutes(app) {
  app.get('/profile', { preHandler: authRequired }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    return reply.send({ success: true, data: toUser(user) });
  });

  app.put('/profile', { preHandler: authRequired }, async (request, reply) => {
    const schema = z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      email: z.string().email().optional()
    });
    const body = schema.parse(request.body);
    const userId = request.user.sub;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: body.first_name,
        lastName: body.last_name,
        email: body.email
      }
    });

    return reply.send({ success: true, data: toUser(updated) });
  });

  app.put('/change-password', { preHandler: authRequired }, async (request, reply) => {
    const schema = z.object({ current_password: z.string().min(6), new_password: z.string().min(6) });
    const body = schema.parse(request.body);
    const userId = request.user.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ success: false, message: 'User not found' });

    const ok = await verifyPassword(body.current_password, user.passwordHash);
    if (!ok) return reply.status(400).send({ success: false, message: 'Current password is incorrect' });

    const passwordHash = await hashPassword(body.new_password);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return reply.send({ success: true, data: null, message: 'Password changed' });
  });
}