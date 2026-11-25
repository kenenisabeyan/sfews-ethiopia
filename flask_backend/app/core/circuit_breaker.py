"""
🛡️ SFEWS Flask Core — Circuit Breaker Pattern
Resilience Engineering for Carrier SMS Gateways, Weather APIs, and Acoustic Relays.
"""

import time
import logging
import threading
from enum import Enum
from typing import Callable, Any, Optional

logger = logging.getLogger("sfews.flask.circuit_breaker")

class CircuitState(str, Enum):
    CLOSED = "CLOSED"       # Normal operational state
    OPEN = "OPEN"           # Tripped: fast-fail calls to fallback
    HALF_OPEN = "HALF_OPEN" # Probing recovery state

class CircuitBreakerOpenException(Exception):
    """Raised when call is blocked while breaker is in OPEN state."""
    pass

class CircuitBreaker:
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
        self._lock = threading.Lock()

    def get_state(self) -> CircuitState:
        with self._lock:
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time >= self.recovery_timeout_seconds:
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"[{self.name}] Transitioned to HALF_OPEN (probing remote service).")
            return self.state

    def record_success(self):
        with self._lock:
            if self.state != CircuitState.CLOSED:
                logger.info(f"[{self.name}] Service recovered. Resetting to CLOSED.")
            self.state = CircuitState.CLOSED
            self.failure_count = 0

    def record_failure(self):
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"[{self.name}] Failure threshold reached ({self.failure_threshold}). Circuit tripped to OPEN.")
            elif self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logger.warning(f"[{self.name}] Probe failed in HALF_OPEN. Tripping back to OPEN.")

    def call(self, func: Callable, *args, fallback: Optional[Callable] = None, **kwargs) -> Any:
        state = self.get_state()
        if state == CircuitState.OPEN:
            if fallback:
                return fallback(*args, **kwargs) if callable(fallback) else fallback
            raise CircuitBreakerOpenException(f"Circuit '{self.name}' is OPEN. Remote call fast-failed.")

        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except self.expected_exceptions as exc:
            self.record_failure()
            logger.warning(f"[{self.name}] Call exception: {exc}")
            if fallback:
                return fallback(*args, **kwargs) if callable(fallback) else fallback
            raise exc

# System global circuit breakers
sms_gateway_breaker = CircuitBreaker("ethiotelecom_sms_gateway", failure_threshold=3, recovery_timeout_seconds=25.0)
weather_radar_breaker = CircuitBreaker("meteorological_radar_api", failure_threshold=3, recovery_timeout_seconds=20.0)
siren_relay_breaker = CircuitBreaker("hardware_siren_actuator", failure_threshold=2, recovery_timeout_seconds=15.0)
