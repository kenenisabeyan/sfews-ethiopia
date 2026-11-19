import time
import uuid
import threading
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
import logging

logger = logging.getLogger("sfews.access")

class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Maintains timestamp logs per client identifier and prunes expired hits.
    """
    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self.client_hits = defaultdict(list)
        self._lock = threading.Lock()

    def is_rate_limited(self, client_id: str, max_requests: int) -> tuple[bool, int, int]:
        """
        Evaluates whether client_id has exceeded max_requests within window_seconds.
        Returns: (is_limited, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Clean expired timestamps outside the sliding window
            valid_hits = [t for t in self.client_hits[client_id] if t > window_start]
            self.client_hits[client_id] = valid_hits

            current_count = len(valid_hits)
            if current_count >= max_requests:
                earliest_hit = valid_hits[0] if valid_hits else now
                retry_after = max(1, int(self.window_seconds - (now - earliest_hit)))
                return True, 0, retry_after

            # Register new hit
            self.client_hits[client_id].append(now)
            remaining = max(0, max_requests - (current_count + 1))
            return False, remaining, 0

rate_limiter = SlidingWindowRateLimiter(window_seconds=60)

class RequestTracingMiddleware(BaseHTTPMiddleware):
    """
    Production-grade Observability, Security & Rate Limiting Middleware:
    1. Attaches unique X-Request-ID across all incoming requests for distributed tracing.
    2. Enforces sliding window rate limiting to protect against DoS or malfunctioning IoT flood.
    3. Benchmarks execution speed with X-Process-Time-Ms.
    4. Hardens API responses with security headers (nosniff, DENY frame options).
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # 1. Distributed Request Tracing ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        # 2. Rate Limiting Check (Skip documentation, health, and WebSocket handshakes)
        is_exempt = (
            path in ["/", "/docs", "/openapi.json", "/redoc"] or
            path.startswith("/api/v1/ws") or
            request.method == "OPTIONS"
        )

        client_ip = request.client.host if request.client else "127.0.0.1"
        # Differentiate limits: Edge telemetry gateways get higher burst capacity
        if path.startswith("/api/v1/telemetry"):
            max_quota = 600 # 600 req/min for high-throughput sensor telemetry
        else:
            max_quota = 180 # 180 req/min for standard administrative/dashboard endpoints

        if not is_exempt:
            is_limited, remaining, retry_after = rate_limiter.is_rate_limited(client_ip, max_quota)
            if is_limited:
                logger.warning(f"[RateLimit] Client {client_ip} exceeded quota ({max_quota}/min) on {path}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": f"Rate limit quota of {max_quota} requests per minute exceeded.",
                        "retry_after_seconds": retry_after,
                        "request_id": request_id
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(max_quota),
                        "X-RateLimit-Remaining": "0",
                        "X-Request-ID": request_id
                    }
                )
        else:
            remaining = max_quota

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            duration = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"[REQ:{request_id[:8]}] {request.method} {path} - UNHANDLED EXCEPTION in {duration:.2f}ms: {exc}"
            )
            raise exc

        process_time_ms = (time.perf_counter() - start_time) * 1000

        # Inject Observability and Security Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
        response.headers["X-RateLimit-Limit"] = str(max_quota)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

        if not path.startswith("/api/v1/ws") and path != "/flood":
            logger.info(
                f"[REQ:{request_id[:8]}] {request.method} {path} -> {response.status_code} ({process_time_ms:.2f}ms)"
            )

        return response
