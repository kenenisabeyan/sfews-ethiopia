import json
from typing import List
from fastapi import WebSocket
from sqlalchemy.orm import Session
from .dashboard import build_dashboard_payload

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_dashboard_json(self, json_data: str):
        """
        Pushes a pre-calculated JSON payload to all connected clients.
        """
        if not self.active_connections:
            return 
            
        for connection in self.active_connections:
            try:
                await connection.send_text(json_data)
            except Exception:
                # Connection might have dropped mid-broadcast
                self.disconnect(connection)

manager = ConnectionManager()
