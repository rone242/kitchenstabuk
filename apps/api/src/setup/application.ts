import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { static as serveStatic } from 'express';
import { resolve } from 'node:path';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { correlationIdMiddleware } from '../common/middleware/correlation-id.middleware.js';

export function configureApplication(
  app: INestApplication,
  config: ConfigService,
): void {
  const origins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    origin: origins,
  });
  app.use(helmet());
  app.use(cookieParser());
  if (config.get<string>('UPLOAD_PROVIDER', 'local') === 'local') {
    app.use(
      '/uploads',
      serveStatic(
        resolve(process.cwd(), config.get<string>('UPLOAD_LOCAL_DIR', 'uploads')),
        { immutable: true, maxAge: '1y', fallthrough: false },
      ),
    );
  }
  app.use(correlationIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Kitchenstabuk API')
      .setDescription('Saudi local-services platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }
}
