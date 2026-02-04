export async function healthRoutes(app) {
  app.get('/', async () => ({ success: true, data: { status: 'ok' } }));
}