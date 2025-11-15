import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cacheKey';
export const CACHE_TTL_METADATA = 'cacheTTL';

/**
 * Decorator to set cache key for a route
 *
 * Usage:
 * @CacheKey('discounts:all')
 * @Get()
 * findAll() {}
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Decorator to set cache TTL for a route
 *
 * Usage:
 * @CacheTTL(300) // 5 minutes
 * @Get()
 * findAll() {}
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
