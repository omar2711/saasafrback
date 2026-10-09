import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrivateCacheService } from './private-cache.service';
import { PrivateCacheInterceptor } from './private-cache.interceptor';

@Module({ providers: [PrivateCacheService, { provide: APP_INTERCEPTOR, useClass: PrivateCacheInterceptor }] })
export class PrivateCacheModule {}
