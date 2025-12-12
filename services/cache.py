"""
Shared Redis caching utility for microservices.

Provides:
- Redis connection with graceful degradation
- Get/Set/Delete operations with TTL
- Automatic fallback when Redis unavailable
- JSON serialization for complex objects

Zero-Trust Context: Caching improves performance without compromising security.
Cache stored keys are public keys (already public data).
"""

import os
import redis
import json
from typing import Optional, Any

class CacheManager:
    """Redis cache manager with graceful degradation"""
    
    def __init__(self):
        self.redis_host = os.environ.get('REDIS_HOST', 'redis')
        self.redis_port = int(os.environ.get('REDIS_PORT', 6379))
        self.redis_db = int(os.environ.get('REDIS_DB', 0))
        self.redis = None
        self.enabled = False
        
        self._connect()
    
    def _connect(self):
        """Attempt to connect to Redis"""
        try:
            self.redis = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            
            # Test connection
            self.redis.ping()
            self.enabled = True
            print(f"✅ Redis connected: {self.redis_host}:{self.redis_port}/{self.redis_db}")
            
        except Exception as e:
            print(f"⚠️  Redis unavailable: {e}")
            print("   Cache disabled, will use direct DB access")
            self.enabled = False
            self.redis = None
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            
        Returns:
            Deserialized value if found, None if miss or disabled
        """
        if not self.enabled:
            return None
        
        try:
            value = self.redis.get(key)
            if value is None:
                return None
            
            # Deserialize JSON
            return json.loads(value)
            
        except Exception as e:
            print(f"⚠️  Cache read error for key '{key}': {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """
        Set value in cache with TTL
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default 1 hour)
        """
        if not self.enabled:
            return
        
        try:
            # Serialize to JSON
            serialized = json.dumps(value)
            self.redis.setex(key, ttl, serialized)
            
        except Exception as e:
            print(f"⚠️  Cache write error for key '{key}': {e}")
    
    def delete(self, key: str):
        """
        Delete key from cache
        
        Args:
            key: Cache key to delete
        """
        if not self.enabled:
            return
        
        try:
            self.redis.delete(key)
        except Exception as e:
            print(f"⚠️  Cache delete error for key '{key}': {e}")
    
    def flush(self):
        """Flush entire cache (use with caution!)"""
        if not self.enabled:
            return
        
        try:
            self.redis.flushdb()
            print("✅ Cache flushed")
        except Exception as e:
            print(f"⚠️  Cache flush error: {e}")
    
    def stats(self) -> dict:
        """
        Get cache statistics
        
        Returns:
            Dict with cache stats or empty dict if disabled
        """
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.redis.info()
            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human"),
                "total_keys": self.redis.dbsize(),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0)
            }
        except Exception as e:
            print(f"⚠️  Cache stats error: {e}")
            return {"enabled": False, "error": str(e)}


# Global cache instance (import this in your services)
cache = CacheManager()


# Helper functions for common patterns
def cache_read_through(
    cache_key: str,
    fetch_func: callable,
    ttl: int = 3600
) -> Any:
    """
    Read-through cache pattern
    
    1. Try to get from cache
    2. If miss, call fetch_func to get data
    3. Store in cache for next time
    4. Return data
    
    Args:
        cache_key: Key to use for caching
        fetch_func: Function to call on cache miss (should return data)
        ttl: Cache TTL in seconds
        
    Returns:
        Data from cache or fetch_func
    """
    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        print(f"🎯 Cache HIT: {cache_key}")
        return cached
    
    # Cache miss - fetch data
    print(f"💾 Cache MISS: {cache_key}, fetching...")
    data = fetch_func()
    
    # Store in cache
    if data is not None:
        cache.set(cache_key, data, ttl)
    
    return data
