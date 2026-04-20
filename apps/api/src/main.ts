import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_DESCRIPTION, APP_TITLE, APP_VERSION } from './common/constants/app.constants';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');
  const apiPrefix = appConfig?.apiPrefix ?? 'api';
  const port = appConfig?.port ?? 3001;

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: appConfig?.corsOrigin ?? 'http://localhost:3000' });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_TITLE)
    .setDescription(APP_DESCRIPTION)
    .setVersion(APP_VERSION)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  new Logger('Bootstrap').log(`API ready at http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
