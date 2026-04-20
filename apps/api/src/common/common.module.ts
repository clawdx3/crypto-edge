import { Module } from '@nestjs/common';
import { APP_FILTERS, APP_INTERCEPTORS } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_FILTERS,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTORS,
      useClass: LoggingInterceptor,
    },
  ],
})
export class CommonModule {}
