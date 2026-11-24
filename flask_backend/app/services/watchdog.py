import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List

logger = logging.getLogger("sfews.watchdog")

class StationFleetWatchdog:
    """
    Fleet Health & Liveness Watchdog.
    Monitors periodic node heartbeats and flags disconnected or power-depleted stations.
    """
    HEARTBEAT_TIMEOUT_SECONDS = 90  # 1.5 minutes without telemetry = Offline

    @staticmethod
    def audit_fleet_health(db) -> Dict:
        from ..models import SensorNode, AlertLog

        now = datetime.now(timezone.utc)
        threshold_time = now - timedelta(seconds=StationFleetWatchdog.HEARTBEAT_TIMEOUT_SECONDS)

        nodes = db.query(SensorNode).all()
        active_nodes = []
        offline_nodes = []

        for node in nodes:
            # Check last_updated timestamp
            if node.last_updated and node.last_updated.replace(tzinfo=timezone.utc) < threshold_time:
                if node.status != "Offline":
                    node.status = "Offline"
                    logger.warning(f"Watchdog: Node {node.id} timed out. Marked OFFLINE.")
                offline_nodes.append(node.id)
            else:
                if node.status != "Active":
                    node.status = "Active"
                active_nodes.append(node.id)

            # Battery voltage check
            if node.battery_level < 20.0:
                logger.warning(f"Watchdog: Node {node.id} critical battery: {node.battery_level}%")

        db.commit()

        return {
            "total_fleet": len(nodes),
            "active_count": len(active_nodes),
            "offline_count": len(offline_nodes),
            "offline_nodes": offline_nodes,
            "timestamp": now.isoformat()
        }

watchdog = StationFleetWatchdog()
