export async function metricsRoutes(app) {
  app.get('/', async () => ({
    success: true,
    data: { status: 'ok', uptime_seconds: process.uptime() }
  }));
}