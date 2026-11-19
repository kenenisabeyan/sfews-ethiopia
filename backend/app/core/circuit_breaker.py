import time
import logging
from enum import Enum
from typing import Callable, Any, Optional
import threading

logger = logging.getLogger("sfews.circuit_breaker")

class CircuitState(str, Enum):
    CLOSED = "CLOSED"      # Normal operation: requests pass through
    OPEN = "OPEN"          # Tripped: requests fail immediately to fallback
    HALF_OPEN = "HALF_OPEN" # Testing recovery: allow one probe request

class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    pass

class CircuitBreaker:
    """
    Production-grade thread-safe Circuit Breaker.
    Protects backend services against slow or unresponsive external APIs
    (LLMs, Weather APIs, SMS Gateways, Geocoders) by failing fast and
    allowing self-healing without exhausting worker threads.
    """
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        recovery_timeout_seconds: float = 30.0,
        expected_exceptions: tuple = (Exception,)
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.expected_exceptions = expected_exceptions
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.last_state_change = time.time()
        self._lock = threading.Lock()

    def get_state(self) -> CircuitState:
        with self._lock:
            if self.state == CircuitState.OPEN:
                # Check if recovery timeout has elapsed to test recovery (HALF_OPEN)
                if time.time() - self.last_failure_time >= self.recovery_timeout_seconds:
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"[CircuitBreaker:{self.name}] Transitioned from OPEN to HALF_OPEN (probing recovery).")
            return self.state

    def record_success(self):
        with self._lock:
            if self.state != CircuitState.CLOSED:
                logger.info(f"[CircuitBreaker:{self.name}] Service recovered! Resetting to CLOSED state.")
            self.state = CircuitState.CLOSED
            self.failure_count = 0

    def record_failure(self):
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(
                    f"[CircuitBreaker:{self.name}] Failure threshold ({self.failure_threshold}) reached! "
                    f"Circuit tripped to OPEN for {self.recovery_timeout_seconds}s."
                )
            elif self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logger.warning(f"[CircuitBreaker:{self.name}] Probe failed in HALF_OPEN. Resetting to OPEN.")

    async def call_async(self, func: Callable, *args, fallback: Optional[Callable] = None, **kwargs) -> Any:
        """
        Executes an async function through the circuit breaker.
        If OPEN, immediately invokes fallback or raises CircuitBreakerOpenException.
        """
        current_state = self.get_state()

        if current_state == CircuitState.OPEN:
            if fallback:
                logger.debug(f"[CircuitBreaker:{self.name}] Circuit is OPEN. Executing fallback.")
                return await fallback(*args, **kwargs) if callable(fallback) else fallback
            raise CircuitBreakerOpenException(f"Circuit '{self.name}' is OPEN. Fast-failing external call.")

        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except self.expected_exceptions as exc:
            self.record_failure()
            logger.warning(f"[CircuitBreaker:{self.name}] Call failed ({exc}). Recorded failure #{self.failure_count}.")
            if fallback:
                return await fallback(*args, **kwargs) if callable(fallback) else fallback
            raise exc

# Global pre-configured circuit breaker instances for external integrations
weather_breaker = CircuitBreaker("openweather_api", failure_threshold=3, recovery_timeout_seconds=20.0)
geocode_breaker = CircuitBreaker("locationiq_geocode", failure_threshold=3, recovery_timeout_seconds=20.0)
llm_breaker = CircuitBreaker("external_llm_api", failure_threshold=2, recovery_timeout_seconds=30.0)
sms_breaker = CircuitBreaker("telecom_sms_gateway", failure_threshold=3, recovery_timeout_seconds=15.0)
