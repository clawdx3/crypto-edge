import { SetMetadata } from '@nestjs/common';
import { ApiPaginatedResponse } from '@nestjs/swagger';
import { type GenericHandler } from '../types/pagination.generic-handler';

export const PAGINATION_METADATA_KEY = 'pagination';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function ApiPaginatedResponse<T>(
  responseDto: new () => T,
  options?: PaginationOptions,
): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<GenericHandler<T>>) => {
    if (propertyKey && descriptor) {
      return ApiPaginatedResponseDecorator(responseDto, options)(target, propertyKey, descriptor);
    }
    return ApiPaginatedResponseDecorator(responseDto, options)(target);
  };
}

function ApiPaginatedResponseDecorator<T>(
  responseDto: new () => T,
  options?: PaginationOptions,
): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<GenericHandler<T>>) => {
    return descriptor ??
      (target as object);
  };
}
