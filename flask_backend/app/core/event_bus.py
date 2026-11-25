"""
📢 SFEWS Flask Core — Decoupled Event-Driven Message Broker
Publish/Subscribe Event Bus allowing zero-coupling between telemetry ingestion,
hydrological risk evaluations, acoustic siren triggers, and community broadcasts.
"""

import logging
import threading
from typing import Dict, List, Callable, Any

logger = logging.getLogger("sfews.flask.event_bus")

class EventType:
    TELEMETRY_INGESTED = "telemetry.ingested"
    ALERT_TRIGGERED = "alert.triggered"
    ALERT_ACKNOWLEDGED = "alert.acknowledged"
    ALERT_RESOLVED = "alert.resolved"
    SIREN_ACTUATED = "siren.actuated"
    SETTINGS_SYNCHRONIZED = "settings.synchronized"
    NODE_HEARTBEAT = "node.heartbeat"
    NODE_CALIBRATED = "node.calibrated"

class EventBus:
    def __init__(self):
        self._handlers: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}
        self._lock = threading.Lock()
        self.dispatched_count = 0
        self.failed_count = 0

    def subscribe(self, event_type: str, handler: Callable[[Dict[str, Any]], None]):
        with self._lock:
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            if handler not in self._handlers[event_type]:
                self._handlers[event_type].append(handler)

    def publish(self, event_type: str, payload: Dict[str, Any], asynchronous: bool = True):
        with self._lock:
            self.dispatched_count += 1
            handlers = list(self._handlers.get(event_type, []))

        if not handlers:
            return

        def _dispatch_all():
            for h in handlers:
                try:
                    h(payload)
                except Exception as exc:
                    self.failed_count += 1
                    logger.error(f"[EventBus] Handler failure on '{event_type}': {exc}", exc_info=True)

        if asynchronous:
            thread = threading.Thread(target=_dispatch_all, daemon=True)
            thread.start()
        else:
            _dispatch_all()

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "events_dispatched": self.dispatched_count,
                "events_failed": self.failed_count,
                "registered_channels": len(self._handlers),
                "channel_subscribers": {k: len(v) for k, v in self._handlers.items()}
            }

event_bus = EventBus()
