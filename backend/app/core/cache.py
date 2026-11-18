import time
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger("sfews.cache")

class FastCache:
    """
    Lightweight, thread-safe in-memory cache with Time-To-Live (TTL).
    Optimizes read-heavy endpoints like dashboard summaries and configurations
    without hitting persistent storage repeatedly.
    """
    def __init__(self, default_ttl_seconds: int = 10):
        self._store: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl_seconds
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
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
        self._store[key] = {
            "value": value,
            "expires_at": expiry
        }

    def invalidate(self, *keys: str):
        for key in keys:
            if key in self._store:
                del self._store[key]

    def invalidate_prefix(self, prefix: str):
        keys_to_remove = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_remove:
            del self._store[k]

    def clear(self):
        self._store.clear()

    def get_stats(self) -> Dict[str, Any]:
        return {
            "cached_keys_count": len(self._store),
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": round(self.hits / (self.hits + self.misses), 3) if (self.hits + self.misses) > 0 else 1.0
        }

cache = FastCache(default_ttl_seconds=10)
