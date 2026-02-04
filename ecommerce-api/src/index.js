import dotenv from 'dotenv';
import buildServer from './server.js';

dotenv.config();

const server = await buildServer();
const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';

server.listen({ port, host }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server running at ${address}`);
});
