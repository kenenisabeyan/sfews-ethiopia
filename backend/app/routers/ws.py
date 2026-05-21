import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from ..database import SessionLocal
from ..services.websocket import manager
from ..services.dashboard import build_dashboard_payload

router = APIRouter(prefix="/api/v1/ws", tags=["WebSockets"])

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard updates.
    """
    await manager.connect(websocket)
    
    # 1. Immediately push the current state so the UI populates on connect
    # Create a short-lived session, build the payload, and close it immediately.
    db = SessionLocal()
    try:
        initial_payload = build_dashboard_payload(db)
        await websocket.send_text(initial_payload.model_dump_json(by_alias=True))
    finally:
        db.close()
        
    try:
        # 2. Keep connection open and listen for client disconnects
        while True:
            # We wait for any text from client (ping or just block until disconnect)
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket)
