import asyncio
import logging
from typing import Dict, List, Callable, Any, Awaitable, Union

logger = logging.getLogger("sfews.events")

class EventType:
    TELEMETRY_INGESTED = "telemetry.ingested"
    ALERT_TRIGGERED = "alert.triggered"
    ALERT_ACKNOWLEDGED = "alert.acknowledged"
    SETTINGS_UPDATED = "settings.updated"
    NODE_REGISTERED = "node.registered"
    NODE_UPDATED = "node.updated"
    NODE_DELETED = "node.deleted"
    BROADCAST_SENT = "broadcast.sent"
    SIMULATION_UPDATE = "simulation.update"

HandlerType = Union[Callable[[Dict[str, Any]], Awaitable[None]], Callable[[Dict[str, Any]], None]]

class EventBus:
    """
    Decoupled Asynchronous In-Memory Event Bus.
    Enables all backend routers and background services to communicate independently
    with zero direct coupling, high throughput, and isolated error boundaries.
    """
    def __init__(self):
        self._handlers: Dict[str, List[HandlerType]] = {}
        self._dispatched_count: int = 0
        self._failed_count: int = 0

    def subscribe(self, event_type: str, handler: HandlerType):
        """Register a subscriber handler for a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)
            logger.debug(f"[EventBus] Handler registered for {event_type}")

    def unsubscribe(self, event_type: str, handler: HandlerType):
        """Remove a subscriber handler."""
        if event_type in self._handlers and handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)

    async def publish(self, event_type: str, data: Dict[str, Any]):
        """
        Publish an event to all registered listeners asynchronously.
        Each listener runs in an isolated task so failure in one subscriber
        never impacts other routers or subscribers.
        """
        self._dispatched_count += 1
        handlers = self._handlers.get(event_type, [])
        if not handlers:
            logger.debug(f"[EventBus] No listeners for {event_type}")
            return

        for handler in handlers:
            try:
                res = handler(data)
                if asyncio.iscoroutine(res):
                    asyncio.create_task(self._safe_await(res, event_type))
            except Exception as e:
                self._failed_count += 1
                logger.error(f"[EventBus] Error executing synchronous handler for {event_type}: {e}", exc_info=True)

    async def _safe_await(self, coro: Awaitable[None], event_type: str):
        try:
            await coro
        except Exception as e:
            self._failed_count += 1
            logger.error(f"[EventBus] Error executing async handler for {event_type}: {e}", exc_info=True)

    def get_stats(self) -> Dict[str, Any]:
        """Observability telemetry for system monitoring."""
        return {
            "total_dispatched": self._dispatched_count,
            "total_failed": self._failed_count,
            "channel_count": len(self._handlers),
            "channels": {k: len(v) for k, v in self._handlers.items()}
        }

# Global Singleton Event Bus
event_bus = EventBus()
