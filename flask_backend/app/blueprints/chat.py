from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import SensorNode, HydroLog, AlertLog
from ..hydrology import calculate_discharge, estimate_downstream_wave_arrival

chat_bp = Blueprint("chat", __name__, url_prefix="/api/v1/chat")

@chat_bp.route("/ask", methods=["POST"])
def ask_situational_analyst():
    data = request.get_json(silent=True) or {}
    query = data.get("query", data.get("message", "")).lower()

    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        critical_alerts = db.query(AlertLog).filter(AlertLog.is_acknowledged == False).count()
        
        station_summaries = []
        highest_stage = 0.0
        peak_station = "None"
        for n in nodes:
            log = db.query(HydroLog).filter(HydroLog.node_id == n.id).order_by(HydroLog.id.desc()).first()
            stage = log.water_level_cm if log else 0.0
            if stage > highest_stage:
                highest_stage = stage
                peak_station = n.id
            station_summaries.append(f"{n.name}: {stage:.1f} cm ({log.risk_level if log else 'Normal'})")

        peak_discharge = calculate_discharge(highest_stage)

        # Dynamic Query Understanding & Hydrological Inference
        if "wave" in query or "travel" in query or "reach" in query or "when" in query or "wonji" in query:
            wave_est = estimate_downstream_wave_arrival("NODE-ALPHA-1", "NODE-BETA-2", peak_discharge)
            answer = (
                f"HYDRODYNAMIC WAVE TRAVEL ESTIMATE: For river discharge Q = {peak_discharge:.1f} m³/s, "
                f"estimated kinematic celerity is {wave_est['estimated_celerity_m_s']} m/s. "
                f"Reach distance from Headwaters to Wonji Plains is {wave_est['reach_distance_km']} km. "
                f"Calculated crest arrival lead time: ~{wave_est['estimated_lead_time_minutes']} minutes "
                f"({wave_est['travel_time_hours']} hours). Evacuation preparations should commence immediately."
            )
        elif "evacuate" in query or "critical" in query or "risk" in query:
            if highest_stage >= 450.0:
                answer = (
                    f"CRITICAL DISASTER ASSESSMENT: Peak stage is {highest_stage:.1f} cm (Discharge: {peak_discharge:.1f} m³/s) at {peak_station}. "
                    f"Immediate evacuation protocol is ACTIVE for low-lying downstream zones in the Awash Basin. "
                    f"Emergency broadcast sirens are ARMED. Contact Civil Defense 994."
                )
            elif highest_stage >= 350.0:
                answer = (
                    f"WARNING ADVISORY: Peak stage is {highest_stage:.1f} cm at {peak_station}. "
                    f"River cresting is elevated. Civil defense teams should be placed on standby alert."
                )
            else:
                answer = (
                    f"BASIN STATUS STABLE: Current peak stage is {highest_stage:.1f} cm at {peak_station}. "
                    f"All monitored anchors report safe hydrological baseflow below warning thresholds."
                )
        elif "status" in query or "station" in query or "nodes" in query:
            stations_str = "; ".join(station_summaries)
            answer = f"Monitored Telemetry Anchors:\n{stations_str}\nActive Unacknowledged Alerts: {critical_alerts}."
        else:
            answer = (
                f"SFEWS Hydrological Analyst Engine operational. "
                f"Monitoring {len(nodes)} stations along the Awash River Basin. "
                f"Peak water stage: {highest_stage:.1f} cm ({peak_station}). "
                f"Discharge: {peak_discharge:.1f} m³/s. "
                f"How can I assist your command dispatch operations?"
            )

        return jsonify({
            "response": answer,
            "peak_station": peak_station,
            "peak_stage_cm": highest_stage,
            "discharge_m3s": peak_discharge,
            "open_alerts": critical_alerts
        }), 200
    finally:
        db.close()
