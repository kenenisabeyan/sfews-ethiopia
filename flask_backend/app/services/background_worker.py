import time
import random
import threading
import logging
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger("sfews.worker")

class AutonomousTelemetryWorker:
    """
    Background Autonomous Simulation Daemon.
    Generates realistic, continuous hydrometric telemetry with hydrodynamic
    wave propagation delay across the Awash River station cascade:
    NODE-ALPHA-1 (Headwaters) -> NODE-GAMMA-3 (Confluence) -> NODE-BETA-2 (Plains) -> NODE-AWASH-01 (Gorge).
    """
    def __init__(self, interval_seconds: float = 3.0):
        self.interval = interval_seconds
        self.is_active = False
        self._thread = None
        
        # Basal stages (cm)
        self.station_stages = {
            "NODE-ALPHA-1": 180.0,
            "NODE-GAMMA-3": 210.0,
            "NODE-BETA-2": 160.0,
            "NODE-AWASH-01": 220.0
        }
        self.rainfall_intensity = 0.0
        self.storm_counter = 0

    def start(self):
        if self.is_active:
            return {"status": "ALREADY_RUNNING", "interval_sec": self.interval}
        self.is_active = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Autonomous Telemetry Worker started.")
        return {"status": "STARTED", "interval_sec": self.interval}

    def stop(self):
        if not self.is_active:
            return {"status": "NOT_RUNNING"}
        self.is_active = False
        logger.info("Autonomous Telemetry Worker stopping...")
        return {"status": "STOPPED"}

    def get_status(self) -> Dict:
        return {
            "active": self.is_active,
            "interval_sec": self.interval,
            "current_simulated_stages": self.station_stages,
            "current_rain_intensity_mm": self.rainfall_intensity
        }

    def _run_loop(self):
        # Local imports to avoid circular dependency
        from ..database import SessionLocal
        from ..models import SensorNode, HydroLog, AlertLog
        from ..hydrology import evaluate_flood_risk, calculate_discharge, classify_surge_dynamics
        from .alert_dispatcher import alert_dispatcher

        while self.is_active:
            try:
                # 1. Simulate environmental weather transitions
                self.storm_counter += 1
                if self.storm_counter % 20 == 0:
                    # Random storm inception or dissipation
                    if self.rainfall_intensity < 5.0:
                        self.rainfall_intensity = round(random.uniform(15.0, 48.0), 1)
                    else:
                        self.rainfall_intensity = 0.0

                # 2. Update headwater stage
                noise = random.uniform(-1.5, 2.0)
                rain_effect = self.rainfall_intensity * 0.4
                self.station_stages["NODE-ALPHA-1"] = max(120.0, min(580.0, self.station_stages["NODE-ALPHA-1"] + noise + rain_effect))

                # 3. Hydrodynamic downstream propagation (Alpha -> Gamma -> Beta -> Awash)
                self.station_stages["NODE-GAMMA-3"] += (self.station_stages["NODE-ALPHA-1"] - self.station_stages["NODE-GAMMA-3"]) * 0.15 + random.uniform(-1.0, 1.0)
                self.station_stages["NODE-BETA-2"] += (self.station_stages["NODE-GAMMA-3"] - self.station_stages["NODE-BETA-2"]) * 0.12 + random.uniform(-1.0, 1.0)
                self.station_stages["NODE-AWASH-01"] += (self.station_stages["NODE-BETA-2"] - self.station_stages["NODE-AWASH-01"]) * 0.10 + random.uniform(-1.0, 1.0)

                db = SessionLocal()
                try:
                    for node_id, stage in self.station_stages.items():
                        stage_rounded = round(stage, 1)
                        prob, risk = evaluate_flood_risk(stage_rounded, self.rainfall_intensity)
                        discharge = calculate_discharge(stage_rounded)

                        # Update node record
                        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
                        if node:
                            node.status = "Active"
                            node.last_updated = datetime.now(timezone.utc)

                        # Append log
                        log = HydroLog(
                            node_id=node_id,
                            water_level_cm=stage_rounded,
                            rainfall_rate_mm=self.rainfall_intensity,
                            flood_probability=prob,
                            risk_level=risk
                        )
                        db.add(log)

                        # Auto-arm siren if any station hits Critical stage
                        if risk in ["Warning", "Critical"]:
                            alert_dispatcher.arm_acoustic_siren(node_id)
                            # Check duplicate alert
                            unack = db.query(AlertLog).filter(AlertLog.node_id == node_id, AlertLog.is_acknowledged == False).first()
                            if not unack:
                                alert = AlertLog(
                                    node_id=node_id,
                                    title=f"AUTOMATED HAZARD ALERT: {risk.upper()} AT {node_id}",
                                    message=f"Water stage reached {stage_rounded}cm (Q={discharge} m3/s).",
                                    severity=risk,
                                    water_level_cm=stage_rounded
                                )
                                db.add(alert)
                    db.commit()
                finally:
                    db.close()

            except Exception as e:
                logger.error(f"Error in telemetry worker loop: {e}")

            time.sleep(self.interval)

telemetry_worker = AutonomousTelemetryWorker()
