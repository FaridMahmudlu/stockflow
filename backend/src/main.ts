import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // SPEC.md Section 15: helmet() enabled globally
  app.use(helmet());

  // SPEC.md Section 15: CORS restricted to known origins
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: true,
  });

  // SPEC.md Section 8: All endpoints prefixed /api/v1
  app.setGlobalPrefix('api/v1');

  // SPEC.md Section 14: Global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Supply Changer API running on port ${port} (all interfaces)`);
}

bootstrap();
