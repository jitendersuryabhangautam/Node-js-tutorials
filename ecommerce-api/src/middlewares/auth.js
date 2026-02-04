export async function authRequired(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }
}

export function adminRequired(request, reply, done) {
  if (request.user?.role !== 'admin') {
    reply.status(403).send({ success: false, message: 'Forbidden' });
    return;
  }
  done();
}