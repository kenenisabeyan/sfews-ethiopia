import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.agent.orchestrator import run_agent

logger = logging.getLogger("sfews.chat")

router = APIRouter(prefix="/api/v1/chat", tags=["AI Copilot & Situational Assistant"])

def generate_local_situational_analysis(query: str, db: Session) -> str:
    """
    Intelligent situational heuristic fallback when external LLM endpoints
    are unreachable or unconfigured. Directly extracts live telemetry from DB.
    """
    query_lower = query.lower()
    nodes = db.query(models.SensorNode).all()
    active_alerts = db.query(models.AlertLog).filter(models.AlertLog.is_acknowledged == False).all()

    report_lines = []
    report_lines.append("🛰️ **SFEWS Real-Time Situational Report (Autonomous Heuristic Engine)**")
    report_lines.append("────────────────────────────────────────────")

    if not nodes:
        return "⚠️ All sensor stations are currently offline. Please run the system seed to populate initial Awash River telemetry."

    # Analyze node vitals
    critical_nodes = []
    warning_nodes = []
    safe_nodes = []

    for n in nodes:
        latest = (
            db.query(models.HydroLog)
            .filter(models.HydroLog.node_id == n.id)
            .order_by(models.HydroLog.timestamp.desc())
            .first()
        )
        water = latest.water_level_cm if latest else 0.0
        rain = latest.rainfall_rate_mm if latest else 0.0
        risk = latest.risk_level if latest else "Safe"

        info = f"• **{n.id}** ({n.name}): **{water:.1f} cm** | Rainfall: {rain:.1f} mm/h | Status: **{risk}**"
        if risk == "Critical":
            critical_nodes.append(info)
        elif risk == "Warning":
            warning_nodes.append(info)
        else:
            safe_nodes.append(info)

    if "alert" in query_lower or "warning" in query_lower or "critical" in query_lower or "danger" in query_lower:
        if active_alerts:
            report_lines.append(f"🚨 **ACTIVE EMERGENCY ALERTS: {len(active_alerts)}**")
            for a in active_alerts[:3]:
                report_lines.append(f"- [{a.severity}] **{a.title}**: {a.message}")
        else:
            report_lines.append("✅ **No active unacknowledged flood alerts.** Basins operating within standard buffer margins.")
    else:
        report_lines.append(f"📊 **Awash River Basin Fleet Overview ({len(nodes)} Active Anchors):**")
        for line in (critical_nodes + warning_nodes + safe_nodes):
            report_lines.append(line)

    if critical_nodes:
        report_lines.append("\n⚠️ **RECOMMENDATION**: Immediate flood gate regulation advised at Koka reservoir. Mobilize civil defense downstream in Asaita plains.")
    elif warning_nodes:
        report_lines.append("\nℹ️ **ADVISORY**: River depth rising in middle gorge. Continue 15-minute LoRa telemetry polling cycles.")
    else:
        report_lines.append("\n✅ Hydrological stability confirmed across all primary Awash monitoring corridors.")

    return "\n".join(report_lines)

@router.post("/ask", response_model=schemas.ChatResponse)
async def ask_agent(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    Natural language query situational analyst.
    Orchestrates LLM tool-calling with live tools, and falls back gracefully
    to high-precision local database situational diagnostics if external LLMs are offline.
    """
    if not request.query or not request.query.trim():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        # Attempt LLM agent orchestration
        final_answer = await run_agent(request.query)
        if final_answer and len(final_answer.strip()) > 0:
            return schemas.ChatResponse(response=final_answer)
    except Exception as e:
        logger.warning(f"[Chat] LLM Orchestrator exception, switching to heuristic analyst: {e}")

    # Fallback to local live telemetry engine
    heuristic_answer = generate_local_situational_analysis(request.query, db)
    return schemas.ChatResponse(response=heuristic_answer)
