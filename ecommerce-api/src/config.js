export const config = {
  port: Number(process.env.PORT || 8080),
  env: process.env.ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'replace_me',
  jwtExpiryHours: Number(process.env.JWT_EXPIRY_HOURS || 24),
  jwtRefreshDays: Number(process.env.JWT_REFRESH_DAYS || 30),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
};