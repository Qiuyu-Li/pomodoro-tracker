import { createServer } from './server';
import { env } from './config/env';

const app = createServer();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${env.PORT}`);
});
