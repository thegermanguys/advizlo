import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

// Vercel boots this file as one NestJS Function (framework preset `nestjs`,
// root directory `backend`). `app.listen` is the entry that runtime expects.
// Locally, `npm run start:dev` listens on PORT (default 3001).

async function bootstrap() {
  // bodyParser: false so we can install our own json() middleware below with
  // a `verify` callback that stashes the raw bytes on the request - Stripe's
  // webhook signature check needs the exact original payload, not the
  // re-serialized parsed object.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Advizlo API running on http://localhost:${port}`);
}
bootstrap();
