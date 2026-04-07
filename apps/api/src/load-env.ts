import { config } from 'dotenv';
import { join } from 'path';

// Nest emits to dist/src/*.js, so __dirname is .../dist/src — go up to apps/api/.env
config({ path: join(__dirname, '..', '..', '.env') });
