// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // This adds /api prefix to all routes

  await app.listen(3000);

  // Log all registered routes
  const server = app.getHttpServer();
  const router = server._events.request._router;
  console.log('Registered Routes:');
  router.stack.forEach((route) => {
    if (route.route) {
      console.log(
        `${route.route.stack[0].method.toUpperCase()} ${route.route.path}`,
      );
    }
  });
}
bootstrap();
