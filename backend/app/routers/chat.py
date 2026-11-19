import logging
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.agent.orchestrator import run_agent
from ..services.ml import calculate_estimated_discharge, evaluate_surge_dynamics

logger = logging.getLogger("sfews.chat")

router = APIRouter(prefix="/api/v1/chat", tags=["AI Copilot & Situational Assistant"])

def generate_local_situational_analysis(query: str, db: Session) -> str:
    """
    Intelligent situational heuristic fallback when external LLM endpoints
    are unreachable or unconfigured. Directly queries live database state,
    calculates discharge, and synthesizes an Awash River Basin tactical report.
    """
    query_lower = query.lower()
    nodes = db.query(models.SensorNode).all()
    active_alerts = db.query(models.AlertLog).filter(models.AlertLog.is_acknowledged == False).all()
    subscribers = db.query(models.Subscriber).filter(models.Subscriber.status == "Active").all()

    report_lines = []
    report_lines.append("🛰️ **SFEWS Command Center Situational Report (Autonomous Hydrological Engine)**")
    report_lines.append("──────────────────────────────────────────────────────────────────────────")

    if not nodes:
        return "⚠️ All sensor stations are currently offline. Please run system seed to initialize Awash River hydrometric anchors."

    critical_nodes = []
    warning_nodes = []
    safe_nodes = []
    peak_water = 0.0
    peak_node_name = "N/A"
    peak_discharge = 0.0

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
        discharge = calculate_estimated_discharge(water)

        if water > peak_water:
            peak_water = water
            peak_node_name = f"{n.name} ({n.id})"
            peak_discharge = discharge

        info = (
            f"• **{n.id}** ({n.name}): **{water:.1f} cm** | Rain: {rain:.1f} mm/h | "
            f"Q: ~{discharge:.1f} m³/s | Status: **{risk}**"
        )
        if risk == "Critical":
            critical_nodes.append(info)
        elif risk == "Warning":
            warning_nodes.append(info)
        else:
            safe_nodes.append(info)

    # 1. Alert Status Section
    if "alert" in query_lower or "warning" in query_lower or "critical" in query_lower or "emergency" in query_lower:
        if active_alerts:
            report_lines.append(f"🚨 **ACTIVE EMERGENCY ALERTS: {len(active_alerts)}**")
            for a in active_alerts[:4]:
                report_lines.append(f"- [{a.severity}] **{a.title}**: {a.message}")
        else:
            report_lines.append("✅ **No active unacknowledged flood alerts.** Basins operating within safe retention buffers.")
    else:
        # Fleet and Basin Overview
        report_lines.append(f"📊 **Awash River Basin Fleet Overview ({len(nodes)} Stations Active):**")
        for line in (critical_nodes + warning_nodes + safe_nodes):
            report_lines.append(line)

    # 2. Peak Discharge & Hydrological Index
    report_lines.append("\n📈 **Hydrological Runoff Summary:**")
    report_lines.append(f"- Peak Recorded Stage: **{peak_water:.1f} cm** at {peak_node_name}")
    report_lines.append(f"- Estimated Instantaneous Peak Discharge: **{peak_discharge:.1f} m³/s**")
    report_lines.append(f"- Registered Community Alert Subscribers: **{len(subscribers)} Active**")

    # 3. Actionable Civil Defense Protocols
    report_lines.append("\n🛡️ **Tactical Civil Defense Recommendations:**")
    if critical_nodes:
        report_lines.append(
            "1. ⚠️ **Immediate Evacuation**: Trigger downstream SMS blast for riverine kebeles near Awash Melka and Asaita."
        )
        report_lines.append(
            "2. 🌊 **Reservoir Regulation**: Coordinate with Ministry of Water & Energy to modulate Koka Dam spillway discharge gates."
        )
        report_lines.append(
            "3. 📡 **Telemetry Frequency**: Enforce 5-minute LoRaWAN packet burst transmission across all critical stations."
        )
    elif warning_nodes:
        report_lines.append(
            "1. ℹ️ **Pre-Deployment**: Alert local disaster risk management committees in Middle Awash (Adama / Modjo corridor)."
        )
        report_lines.append(
            "2. 🔍 **Hydrometric Monitoring**: Maintain continuous 15-minute sensor polling for rate-of-rise surge anomalies."
        )
    else:
        report_lines.append(
            "• Hydrological stability confirmed across all primary Awash monitoring corridors. Standard 30-minute sampling cycle active."
        )

    return "\n".join(report_lines)

@router.post("/ask", response_model=schemas.ChatResponse)
async def ask_agent(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    Natural language query situational analyst.
    Orchestrates multi-turn LLM tool execution with live database tools, and falls back
    gracefully to high-precision local database situational diagnostics if external LLMs are offline.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        final_answer = await run_agent(request.query)
        if final_answer and len(final_answer.strip()) > 0 and not final_answer.startswith("I reached my maximum reasoning steps"):
            return schemas.ChatResponse(response=final_answer)
    except Exception as e:
        logger.warning(f"[Chat] LLM Orchestrator exception, switching to heuristic analyst: {e}")

    # Fallback to local live telemetry engine
    heuristic_answer = generate_local_situational_analysis(request.query, db)
    return schemas.ChatResponse(response=heuristic_answer)
