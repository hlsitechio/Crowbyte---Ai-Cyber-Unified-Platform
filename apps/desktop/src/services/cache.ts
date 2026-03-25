/**
 * AI Cache Service
 * Supabase-based caching system with TTL, deduplication, and statistics
 */

import { supabase } from '@/lib/supabase';

export type CacheType = 'conversation' | 'search' | 'embedding' | 'api_response' | 'tool_result';

export interface CacheEntry {
  id: string;
  user_id?: string;
  cache_key: string;
  cache_type: CacheType;
  namespace: string;
  data: unknown;
  metadata: Record<string, unknown>;
  content_hash?: string;
  size_bytes?: number;
  ttl_seconds: number;
  expires_at?: string;
  hit_count: number;
  last_accessed_at: string;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  metadata?: Record<string, unknown>;
  userSpecific?: boolean; // If true, cache is user-specific
}

export interface CacheStats {
  cache_type: CacheType;
  total_entries: number;
  total_size_mb: number;
  avg_hit_count: number;
  expired_entries: number;
  valid_entries: number;
}

class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly DEFAULT_NAMESPACE = 'default';

  /**
   * Generate a SHA-256 hash using Web Crypto API
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a cache key from input data
   */
  private async generateKey(input: unknown): Promise<string> {
    const normalized = JSON.stringify(input, Object.keys(input as object).sort());
    return this.hashString(normalized);
  }

  /**
   * Generate content hash for deduplication
   */
  private async generateContentHash(content: unknown): Promise<string> {
    return this.hashString(JSON.stringify(content));
  }

  /**
   * Calculate size in bytes
   */
  private calculateSize(data: unknown): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Get current user ID
   */
  private async getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Get cached data
   */
  async get<T = unknown>(
    key: string,
    cacheType: CacheType,
    options: Pick<CacheOptions, 'namespace' | 'userSpecific'> = {}
  ): Promise<T | null> {
    try {
      const namespace = options.namespace || this.DEFAULT_NAMESPACE;
      const userId = options.userSpecific ? await this.getUserId() : null;

      let query = supabase
        .from('ai_cache')
        .select('*')
        .eq('cache_key', key)
        .eq('cache_type', cacheType)
        .eq('namespace', namespace)
        .eq('is_valid', true);

      // Add user filter
      if (options.userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (!options.userSpecific) {
        query = query.is('user_id', null);
      }

      // Check expiration
      query = query.or('expires_at.is.null,expires_at.gte.now()');

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      // Update hit count and last accessed
      await supabase
        .from('ai_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return data.data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache data
   */
  async set<T = unknown>(
    key: string,
    data: T,
    cacheType: CacheType,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const userId = options.userSpecific ? await this.getUserId() : null;
      const namespace = options.namespace || this.DEFAULT_NAMESPACE;
      const ttl = options.ttl || this.DEFAULT_TTL;
      const contentHash = await this.generateContentHash(data);
      const sizeBytes = this.calculateSize(data);

      const cacheData = {
        user_id: userId,
        cache_key: key,
        cache_type: cacheType,
        namespace,
        data,
        metadata: options.metadata || {},
        content_hash: contentHash,
        size_bytes: sizeBytes,
        ttl_seconds: ttl,
        is_valid: true,
      };

      // Upsert (insert or update)
      const { error } = await supabase
        .from('ai_cache')
        .upsert(cacheData, {
          onConflict: options.userSpecific && userId
            ? 'user_id,cache_key,cache_type'
            : 'cache_key,cache_type',
        });

      if (error) {
        console.error('Cache set error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Cache with automatic key generation from input
   */
  async cacheWithInput<TInput, TOutput>(
    input: TInput,
    fetcher: () => Promise<TOutput>,
    cacheType: CacheType,
    options: CacheOptions = {}
  ): Promise<TOutput> {
    const key = await this.generateKey(input);

    // Try to get from cache
    const cached = await this.get<TOutput>(key, cacheType, options);
    if (cached !== null) {
      console.log(`✅ Cache HIT: ${cacheType}/${key.substring(0, 8)}...`);
      return cached;
    }

    // Cache miss - fetch data
    console.log(`❌ Cache MISS: ${cacheType}/${key.substring(0, 8)}... - fetching...`);
    const result = await fetcher();

    // Store in cache
    await this.set(key, result, cacheType, options);

    return result;
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(
    key: string,
    cacheType: CacheType,
    options: Pick<CacheOptions, 'namespace' | 'userSpecific'> = {}
  ): Promise<boolean> {
    try {
      const namespace = options.namespace || this.DEFAULT_NAMESPACE;
      const userId = options.userSpecific ? await this.getUserId() : null;

      let query = supabase
        .from('ai_cache')
        .update({ is_valid: false, updated_at: new Date().toISOString() })
        .eq('cache_key', key)
        .eq('cache_type', cacheType)
        .eq('namespace', namespace);

      if (options.userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (!options.userSpecific) {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      return !error;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(
    pattern: string,
    cacheType?: CacheType,
    options: Pick<CacheOptions, 'userSpecific'> = {}
  ): Promise<number> {
    try {
      const userId = options.userSpecific ? await this.getUserId() : null;

      if (!userId && options.userSpecific) {
        return 0;
      }

      const { data, error } = await supabase.rpc('invalidate_cache_by_pattern', {
        p_user_id: userId,
        p_pattern: pattern,
        p_cache_type: cacheType || null,
      });

      if (error) {
        console.error('Cache invalidate by pattern error:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Cache invalidate by pattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache for a specific type
   */
  async clearByType(
    cacheType: CacheType,
    options: Pick<CacheOptions, 'namespace' | 'userSpecific'> = {}
  ): Promise<boolean> {
    try {
      const namespace = options.namespace || this.DEFAULT_NAMESPACE;
      const userId = options.userSpecific ? await this.getUserId() : null;

      let query = supabase
        .from('ai_cache')
        .delete()
        .eq('cache_type', cacheType)
        .eq('namespace', namespace);

      if (options.userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (!options.userSpecific) {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      return !error;
    } catch (error) {
      console.error('Cache clear by type error:', error);
      return false;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_cache');

      if (error) {
        console.error('Cache cleanup error:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(userSpecific: boolean = false): Promise<CacheStats[]> {
    try {
      const userId = userSpecific ? await this.getUserId() : null;

      const { data, error } = await supabase.rpc('get_cache_stats', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Cache stats error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Cache stats error:', error);
      return [];
    }
  }

  /**
   * Get total cache size
   */
  async getTotalSize(userSpecific: boolean = false): Promise<number> {
    try {
      const userId = userSpecific ? await this.getUserId() : null;

      let query = supabase
        .from('ai_cache')
        .select('size_bytes');

      if (userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (!userSpecific) {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error || !data) {
        return 0;
      }

      return data.reduce((sum, entry) => sum + (entry.size_bytes || 0), 0);
    } catch (error) {
      console.error('Cache size error:', error);
      return 0;
    }
  }

  /**
   * Get cache hit rate
   */
  async getHitRate(cacheType?: CacheType, userSpecific: boolean = false): Promise<number> {
    try {
      const userId = userSpecific ? await this.getUserId() : null;

      let query = supabase
        .from('ai_cache')
        .select('hit_count');

      if (cacheType) {
        query = query.eq('cache_type', cacheType);
      }

      if (userSpecific && userId) {
        query = query.eq('user_id', userId);
      } else if (!userSpecific) {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return 0;
      }

      const totalHits = data.reduce((sum, entry) => sum + entry.hit_count, 0);
      const avgHits = totalHits / data.length;

      return Math.round(avgHits * 100) / 100;
    } catch (error) {
      console.error('Cache hit rate error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
