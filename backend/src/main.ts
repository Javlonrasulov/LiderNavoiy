import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(','),
    credentials: true,
  });

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  // Diskda fayl yo‘qolsa — DB dagi imageData dan berish
  app.use('/uploads/products', (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const fileName = (req.path || '').split('/').filter(Boolean).pop();
        if (!fileName || fileName.includes('..')) {
          res.status(400).end();
          return;
        }
        const diskPath = join(uploadsDir, 'products', fileName);
        if (existsSync(diskPath)) {
          res.sendFile(diskPath);
          return;
        }
        const ds = app.get(DataSource);
        const rows: Array<{ imageData: string }> = await ds.query(
          `SELECT "imageData" FROM products
           WHERE "imageData" IS NOT NULL
             AND "imageUrl" LIKE $1
           LIMIT 1`,
          [`%/uploads/products/${fileName}%`],
        );
        const b64 = rows[0]?.imageData;
        if (!b64) {
          res.status(404).end();
          return;
        }
        const buf = Buffer.from(b64, 'base64');
        const lower = fileName.toLowerCase();
        const mime = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buf);
      } catch (err) {
        logger.warn(`uploads/products fallback: ${(err as Error).message}`);
        next();
      }
    })();
  });

  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Distributor CRM API')
    .setDescription('Backend API for Distributor CRM Mobile App and Admin Panel')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
