import { z } from 'zod';
import prisma from '../db/prisma.js';
import redis from '../db/redis.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateRefreshToken } from '../utils/tokens.js';
import { config } from '../config.js';
import { toUser } from '../utils/transform.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string(),
  last_name: z.string()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function authRoutes(app) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.first_name,
        lastName: body.last_name
      }
    });

    const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: `${config.jwtExpiryHours}h` });
    const refreshToken = generateRefreshToken();
    const refreshTtlSeconds = config.jwtRefreshDays * 24 * 60 * 60;
    await redis.set(`refresh:${refreshToken}`, user.id, 'EX', refreshTtlSeconds);

    return reply.status(201).send({
      success: true,
      data: { user: toUser(user), access_token: accessToken }
    });
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: `${config.jwtExpiryHours}h` });
    const refreshToken = generateRefreshToken();
    const refreshTtlSeconds = config.jwtRefreshDays * 24 * 60 * 60;
    await redis.set(`refresh:${refreshToken}`, user.id, 'EX', refreshTtlSeconds);

    return reply.send({ success: true, data: { user: toUser(user), access_token: accessToken } });
  });

  app.post('/refresh', async (request, reply) => {
    const schema = z.object({ refresh_token: z.string().min(10) });
    const { refresh_token } = schema.parse(request.body);

    const userId = await redis.get(`refresh:${refresh_token}`);
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(401).send({ success: false, message: 'Invalid refresh token' });
    }

    const accessToken = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: `${config.jwtExpiryHours}h` });
    return reply.send({ success: true, data: { access_token: accessToken } });
  });
}