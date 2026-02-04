import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import { registerRoutes } from './routes/index.js';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

export default async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.allowedOrigins
  });

  await app.register(jwt, {
    secret: config.jwtSecret
  });

  const specPath = path.join(process.cwd(), 'openapi.yaml');
  const openapi = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : undefined;

  await app.register(swagger, openapi ? { specification: { path: specPath } } : {
    openapi: { info: { title: 'Ecommerce API', version: '1.0.0' } }
  });
  await app.register(swaggerUI, {
    routePrefix: '/docs',
    staticCSP: true,
    baseDir: process.cwd()
  });

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (body === '' || body == null) return done(null, null);
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      done(err, undefined);
    }
  });

  app.setErrorHandler((err, request, reply) => {
    if (err?.code === 'P2002') {
      const target = err.meta?.target?.join(', ') || 'unique field';
      return reply.status(409).send({ success: false, message: `Duplicate value for ${target}` });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({ success: false, message: 'Validation error', errors: err.issues });
    }
    if (err.name === 'UnauthorizedError') {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    request.log.error(err);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  });

  await app.register(async (instance) => {
    await registerRoutes(instance);
  }, { prefix: '/api/v1' });

  return app;
}
