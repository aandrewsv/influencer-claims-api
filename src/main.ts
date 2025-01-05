// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // This adds /api prefix to all routes

  // Configure CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

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
