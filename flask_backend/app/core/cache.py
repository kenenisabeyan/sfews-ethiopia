"""
⚡ SFEWS Flask Core — High-Throughput In-Memory Caching Engine
Thread-safe TTL caching layer for high-concurrency hydrological queries.
"""

import time
import threading
from typing import Any, Optional, Dict

class ThreadSafeCache:
    def __init__(self, default_ttl_seconds: int = 15):
        self._store: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl_seconds
        self.hits = 0
        self.misses = 0
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if not item:
                self.misses += 1
                return None
            if time.time() > item["expires_at"]:
                del self._store[key]
                self.misses += 1
                return None
            self.hits += 1
            return item["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        expiry = time.time() + (ttl if ttl is not None else self.default_ttl)
        with self._lock:
            self._store[key] = {
                "value": value,
                "expires_at": expiry
            }

    def invalidate(self, *keys: str):
        with self._lock:
            for key in keys:
                if key in self._store:
                    del self._store[key]

    def invalidate_prefix(self, prefix: str):
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]

    def clear(self):
        with self._lock:
            self._store.clear()

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self.hits + self.misses
            return {
                "cached_keys_count": len(self._store),
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio": round(self.hits / total, 3) if total > 0 else 1.0
            }

cache = ThreadSafeCache(default_ttl_seconds=15)
