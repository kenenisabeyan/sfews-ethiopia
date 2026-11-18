import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..database import SessionLocal
from ..services.websocket import manager
from ..services.dashboard import build_dashboard_payload

logger = logging.getLogger("sfews.ws")

router = APIRouter(prefix="/api/v1/ws", tags=["WebSockets Real-Time Streaming"])

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard telemetry and flood risk streaming.
    Immediately pushes the current aggregate state upon connection establishment.
    """
    await manager.connect(websocket)
    
    # Push initial dashboard state immediately
    db = SessionLocal()
    try:
        initial_payload = build_dashboard_payload(db, force_refresh=True)
        await websocket.send_text(initial_payload.model_dump_json(by_alias=True))
    except Exception as e:
        logger.error(f"[WS] Error pushing initial payload: {e}")
    finally:
        db.close()
        
    try:
        # Keep connection alive, listen for client heartbeat pings or disconnects
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"[WS] Client socket closed with exception: {e}")
        manager.disconnect(websocket)

@router.websocket("/stream")
async def websocket_event_stream(websocket: WebSocket):
    """
    Multiplexed channel event stream for advanced IoT monitors, alerts, and node health.
    """
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected", "channel": "events"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
