import json
import logging
from typing import List, Set, Dict, Any
from fastapi import WebSocket
from ..core.events import event_bus, EventType
from ..core.cache import cache

logger = logging.getLogger("sfews.websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WS] Client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WS] Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_dashboard_json(self, json_data: str):
        """
        Pushes a pre-calculated JSON dashboard payload to all connected clients.
        Backward-compatible with frontend's WebSocket listener.
        """
        if not self.active_connections:
            return 
            
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(json_data)
            except Exception as e:
                logger.debug(f"[WS] Error sending text to client, disconnecting: {e}")
                self.disconnect(connection)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts a typed structured message to all active clients.
        """
        if not self.active_connections:
            return
            
        payload = json.dumps({
            "type": event_type,
            "data": data
        })

        for connection in self.active_connections.copy():
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect(connection)

    def get_active_count(self) -> int:
        return len(self.active_connections)

manager = ConnectionManager()

# Event bus hook for decoupled event-driven broadcasts
async def handle_telemetry_event(data: Dict[str, Any]):
    # When telemetry is ingested or flood simulated, invalidate cache
    cache.invalidate("dashboard_full_payload")

event_bus.subscribe(EventType.TELEMETRY_INGESTED, handle_telemetry_event)
event_bus.subscribe(EventType.SIMULATION_UPDATE, handle_telemetry_event)
