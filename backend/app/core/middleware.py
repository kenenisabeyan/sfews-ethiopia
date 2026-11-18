import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import logging

logger = logging.getLogger("sfews.access")

class RequestTracingMiddleware(BaseHTTPMiddleware):
    """
    Non-functional observability & resilience middleware:
    - Generates and attaches X-Request-ID to trace calls across microservices
    - Calculates and appends X-Process-Time-Ms for performance benchmarking
    - Adds security headers (X-Content-Type-Options, etc.)
    - Logs structured telemetry per request
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
        except Exception as exc:
            duration = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"[REQ:{request_id[:8]}] {request.method} {request.url.path} - FAILED in {duration:.2f}ms: {exc}"
            )
            raise exc

        process_time_ms = (time.perf_counter() - start_time) * 1000
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

        # Suppress spammy log outputs for high-frequency polling/websocket
        if not request.url.path.startswith("/api/v1/ws") and request.url.path != "/flood":
            logger.info(
                f"[REQ:{request_id[:8]}] {request.method} {request.url.path} -> {response.status_code} ({process_time_ms:.2f}ms)"
            )

        return response
