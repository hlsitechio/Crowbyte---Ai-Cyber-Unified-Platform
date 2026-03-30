/**
 * Electron Local Cache Manager
 * File-based caching system for the Electron app
 * Stores cache in .cache directory inside crowbyte
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  metadata: Record<string, unknown>;
  createdAt: number;
  expiresAt: number | null;
  hitCount: number;
  lastAccessedAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 1 hour)
  namespace?: string; // Cache namespace (default: 'default')
  metadata?: Record<string, unknown>;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  namespaces: string[];
  oldestEntry: number | null;
  newestEntry: number | null;
}

export class LocalCacheManager {
  private cacheDir: string;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly DEFAULT_NAMESPACE = 'default';

  constructor(baseDir: string = process.cwd()) {
    this.cacheDir = path.join(baseDir, '.cache');
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Ensure namespace directory exists
   */
  private ensureNamespaceDir(namespace: string): string {
    const namespaceDir = path.join(this.cacheDir, namespace);
    if (!fs.existsSync(namespaceDir)) {
      fs.mkdirSync(namespaceDir, { recursive: true });
    }
    return namespaceDir;
  }

  /**
   * Generate SHA-256 hash for cache key
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get file path for cache entry
   */
  private getFilePath(key: string, namespace: string): string {
    const hashedKey = this.hashKey(key);
    const namespaceDir = this.ensureNamespaceDir(namespace);
    return path.join(namespaceDir, `${hashedKey}.json`);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (entry.expiresAt === null) {
      return false; // Never expires
    }
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get cached data
   */
  get<T = unknown>(key: string, options: Pick<CacheOptions, 'namespace'> = {}): T | null {
    const namespace = options.namespace || this.DEFAULT_NAMESPACE;
    const filePath = this.getFilePath(key, namespace);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(fileContent);

      // Check expiration
      if (this.isExpired(entry)) {
        console.log(`❌ Cache EXPIRED: ${namespace}/${key.substring(0, 16)}...`);
        this.delete(key, { namespace });
        return null;
      }

      // Update hit count and last accessed
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');

      console.log(`✅ Cache HIT: ${namespace}/${key.substring(0, 16)}... (hits: ${entry.hitCount})`);
      return entry.data;
    } catch (error) {
      console.error(`Error reading cache entry: ${key}`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  set<T = unknown>(key: string, data: T, options: CacheOptions = {}): boolean {
    const namespace = options.namespace || this.DEFAULT_NAMESPACE;
    const ttl = options.ttl || this.DEFAULT_TTL;
    const filePath = this.getFilePath(key, namespace);

    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        key,
        data,
        metadata: options.metadata || {},
        createdAt: now,
        expiresAt: ttl > 0 ? now + (ttl * 1000) : null,
        hitCount: 0,
        lastAccessedAt: now,
      };

      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      console.log(`💾 Cache SET: ${namespace}/${key.substring(0, 16)}... (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`Error writing cache entry: ${key}`, error);
      return false;
    }
  }

  /**
   * Cache with automatic key generation from input
   */
  async cacheWithInput<TInput, TOutput>(
    input: TInput,
    fetcher: () => Promise<TOutput>,
    options: CacheOptions = {}
  ): Promise<TOutput> {
    // Generate key from input
    const key = crypto
      .createHash('sha256')
      .update(JSON.stringify(input, Object.keys(input as object).sort()))
      .digest('hex');

    // Try to get from cache
    const cached = this.get<TOutput>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    console.log(`❌ Cache MISS: ${options.namespace || 'default'}/${key.substring(0, 16)}... - fetching...`);
    const result = await fetcher();

    // Store in cache
    this.set(key, result, options);

    return result;
  }

  /**
   * Delete cache entry
   */
  delete(key: string, options: Pick<CacheOptions, 'namespace'> = {}): boolean {
    const namespace = options.namespace || this.DEFAULT_NAMESPACE;
    const filePath = this.getFilePath(key, namespace);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cache DELETED: ${namespace}/${key.substring(0, 16)}...`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting cache entry: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries in a namespace
   */
  clearNamespace(namespace: string = this.DEFAULT_NAMESPACE): number {
    const namespaceDir = path.join(this.cacheDir, namespace);
    let deletedCount = 0;

    try {
      if (!fs.existsSync(namespaceDir)) {
        return 0;
      }

      const files = fs.readdirSync(namespaceDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(namespaceDir, file));
          deletedCount++;
        }
      }

      console.log(`🗑️  Cleared ${deletedCount} entries from namespace: ${namespace}`);
      return deletedCount;
    } catch (error) {
      console.error(`Error clearing namespace: ${namespace}`, error);
      return deletedCount;
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): number {
    let totalDeleted = 0;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        return 0;
      }

      const namespaces = fs.readdirSync(this.cacheDir);
      for (const namespace of namespaces) {
        const namespacePath = path.join(this.cacheDir, namespace);
        if (fs.statSync(namespacePath).isDirectory()) {
          totalDeleted += this.clearNamespace(namespace);
        }
      }

      console.log(`🗑️  Cleared ALL cache: ${totalDeleted} total entries`);
      return totalDeleted;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return totalDeleted;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpired(): number {
    let expiredCount = 0;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        return 0;
      }

      const namespaces = fs.readdirSync(this.cacheDir);
      for (const namespace of namespaces) {
        const namespacePath = path.join(this.cacheDir, namespace);
        if (!fs.statSync(namespacePath).isDirectory()) continue;

        const files = fs.readdirSync(namespacePath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(namespacePath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry: CacheEntry = JSON.parse(content);

            if (this.isExpired(entry)) {
              fs.unlinkSync(filePath);
              expiredCount++;
            }
          } catch (err) {
            // Invalid cache file, delete it
            fs.unlinkSync(filePath);
            expiredCount++;
          }
        }
      }

      if (expiredCount > 0) {
        console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`);
      }
      return expiredCount;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return expiredCount;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stats: CacheStats = {
      totalEntries: 0,
      totalSize: 0,
      namespaces: [],
      oldestEntry: null,
      newestEntry: null,
    };

    try {
      if (!fs.existsSync(this.cacheDir)) {
        return stats;
      }

      const namespaces = fs.readdirSync(this.cacheDir);
      for (const namespace of namespaces) {
        const namespacePath = path.join(this.cacheDir, namespace);
        if (!fs.statSync(namespacePath).isDirectory()) continue;

        stats.namespaces.push(namespace);

        const files = fs.readdirSync(namespacePath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(namespacePath, file);
          const fileStat = fs.statSync(filePath);
          stats.totalSize += fileStat.size;
          stats.totalEntries++;

          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry: CacheEntry = JSON.parse(content);

            if (stats.oldestEntry === null || entry.createdAt < stats.oldestEntry) {
              stats.oldestEntry = entry.createdAt;
            }
            if (stats.newestEntry === null || entry.createdAt > stats.newestEntry) {
              stats.newestEntry = entry.createdAt;
            }
          } catch (err) {
            // Skip invalid entries
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return stats;
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}

// Export singleton instance
export const localCache = new LocalCacheManager();
export default localCache;
