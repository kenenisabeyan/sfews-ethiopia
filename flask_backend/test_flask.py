import unittest
import json
from app import create_app

class TestFlaskProductionBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_root_health(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "OPERATIONAL")
        self.assertEqual(data["framework"], "Python Flask (Production Core)")
        print("  [PASS] Root Health check verified.")

    def test_02_auth_workflow(self):
        # 1. Seed admin
        res_seed = self.client.post("/api/v1/auth/seed-admin")
        self.assertIn(res_seed.status_code, [200, 201])
        
        # 2. Login
        res_login = self.client.post("/api/v1/auth/login", json={
            "email": "admin@sfews.gov.et",
            "password": "admin123"
        })
        self.assertEqual(res_login.status_code, 200)
        data = res_login.get_json()
        self.assertIn("access_token", data)
        token = data["access_token"]

        # 3. /me
        res_me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.get_json()["email"], "admin@sfews.gov.et")

        # 4. /users
        res_users = self.client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_users.status_code, 200)
        self.assertTrue(len(res_users.get_json()) >= 1)
        print("  [PASS] Auth workflow (JWT, Login, Me, Users) verified.")

    def test_03_nodes_fleet(self):
        # List nodes
        res = self.client.get("/api/v1/nodes/")
        self.assertEqual(res.status_code, 200)
        nodes = res.get_json()
        self.assertTrue(len(nodes) >= 4)

        # Heartbeat
        res_hb = self.client.post("/api/v1/nodes/NODE-AWASH-01/heartbeat")
        self.assertEqual(res_hb.status_code, 200)
        self.assertEqual(res_hb.get_json()["status"], "ACK")
        print("  [PASS] Nodes fleet management & Heartbeat verified.")

    def test_04_telemetry_hydrology_and_export(self):
        # Ingest elevated stage (380cm)
        res = self.client.post("/api/v1/telemetry/", json={
            "node_id": "NODE-ALPHA-1",
            "water_level_cm": 380.0,
            "rainfall_rate_mm": 25.0,
            "battery_level": 94.2
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["node_id"], "NODE-ALPHA-1")
        self.assertEqual(data["risk_level"], "Warning")
        self.assertTrue(data["discharge_m3s"] > 0)
        print(f"  [PASS] Telemetry ingestion verified: Q={data['discharge_m3s']} m3/s, Risk={data['risk_level']}.")

        # Ingest batch
        res_batch = self.client.post("/api/v1/telemetry/batch", json={
            "readings": [
                {"node_id": "NODE-BETA-2", "water_level_cm": 150.0, "rainfall_rate_mm": 5.0},
                {"node_id": "NODE-GAMMA-3", "water_level_cm": 210.0, "rainfall_rate_mm": 0.0}
            ]
        })
        self.assertEqual(res_batch.status_code, 201)
        self.assertEqual(res_batch.get_json()["ingested_count"], 2)

        # Export CSV
        res_csv = self.client.get("/api/v1/telemetry/export")
        self.assertEqual(res_csv.status_code, 200)
        self.assertEqual(res_csv.mimetype, "text/csv")
        self.assertIn("node_id", res_csv.get_data(as_text=True))
        print("  [PASS] Telemetry batch ingestion & CSV Export verified.")

    def test_05_alerts_broadcast_and_siren(self):
        # 1. Login
        res_login = self.client.post("/api/v1/auth/login", json={
            "email": "admin@sfews.gov.et",
            "password": "admin123"
        })
        token = res_login.get_json()["access_token"]

        # 2. List alerts
        res_alerts = self.client.get("/api/v1/alerts/")
        self.assertEqual(res_alerts.status_code, 200)
        alerts = res_alerts.get_json()
        self.assertTrue(len(alerts) >= 1)
        alert_id = alerts[0]["id"]

        # 3. Acknowledge alert
        res_ack = self.client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_ack.status_code, 200)
        self.assertEqual(res_ack.get_json()["status"], "ACKNOWLEDGED")

        # 4. Emergency Broadcast dispatch with SMS Gateway simulation
        res_bc = self.client.post("/api/v1/alerts/broadcast", headers={"Authorization": f"Bearer {token}"}, json={
            "station_id": "NODE-ALPHA-1",
            "message": "EVACUATE IMMEDIATELY: Flood crest expected within 45 minutes.",
            "radius_km": 40.0
        })
        self.assertEqual(res_bc.status_code, 200)
        self.assertEqual(res_bc.get_json()["status"], "DISPATCHED")

        # 5. Silence siren
        res_silence = self.client.post("/api/v1/alerts/siren/silence", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_silence.status_code, 200)
        self.assertEqual(res_silence.get_json()["status"], "SILENCED_STANDBY")

        # 6. Export Alerts CSV
        res_alert_csv = self.client.get("/api/v1/alerts/export")
        self.assertEqual(res_alert_csv.status_code, 200)
        self.assertEqual(res_alert_csv.mimetype, "text/csv")
        print("  [PASS] Alerts listing, SMS broadcast, Siren silence, and Incident CSV export verified.")

    def test_06_dashboard_trends(self):
        res_summary = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(res_summary.status_code, 200)
        self.assertTrue(res_summary.get_json()["total_stations"] >= 4)

        res_trends = self.client.get("/api/v1/dashboard/trends")
        self.assertEqual(res_trends.status_code, 200)
        self.assertTrue(isinstance(res_trends.get_json(), list))

        res_basins = self.client.get("/api/v1/dashboard/basins")
        self.assertEqual(res_basins.status_code, 200)
        print("  [PASS] Dashboard summary, trends & basin health verified.")

    def test_07_simulation_interop(self):
        res_post = self.client.post("/flood", json={
            "water_level": 490.0,
            "rainfall": 60.0
        })
        self.assertEqual(res_post.status_code, 200)
        self.assertEqual(res_post.get_json()["risk_level"], "Critical")

        res_get = self.client.get("/flood")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.get_json()["water_level"], 490.0)
        print("  [PASS] /flood simulator interoperability verified.")

    def test_08_situational_analyst_wave_prediction(self):
        # Query wave travel time
        res_wave = self.client.post("/api/v1/chat/ask", json={
            "query": "When will the flood wave reach Wonji Plains from the headwaters?"
        })
        self.assertEqual(res_wave.status_code, 200)
        data = res_wave.get_json()
        self.assertIn("HYDRODYNAMIC WAVE TRAVEL ESTIMATE", data["response"])
        print(f"  [PASS] Hydrodynamic wave arrival reasoning verified: {data['response'][:75]}...")

    def test_09_system_diagnostics_and_watchdog(self):
        res_diag = self.client.get("/api/v1/system/diagnostics")
        self.assertEqual(res_diag.status_code, 200)
        data = res_diag.get_json()
        self.assertEqual(data["engine_status"], "OPTIMAL")

        # Run watchdog audit
        res_wd = self.client.get("/api/v1/system/watchdog")
        self.assertEqual(res_wd.status_code, 200)
        self.assertTrue(res_wd.get_json()["total_fleet"] >= 4)
        print("  [PASS] System diagnostics & Fleet Liveness Watchdog verified.")

    def test_10_ml_crest_forecast(self):
        res = self.client.get("/api/v1/telemetry/forecast/NODE-ALPHA-1")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["station_id"], "NODE-ALPHA-1")
        self.assertIn("peak_forecast_stage_cm", data)
        self.assertIn("projections", data)
        self.assertEqual(len(data["projections"]), 4) # +1h, +3h, +6h, +12h
        print(f"  [PASS] ML Predictive Hydrology Forecast verified (Peak projected: {data['peak_forecast_stage_cm']}cm, Threat: {data['threat_severity']}).")

    def test_11_gis_topology_and_buffers(self):
        # 1. Topology GeoJSON
        res_top = self.client.get("/api/v1/gis/topology")
        self.assertEqual(res_top.status_code, 200)
        data = res_top.get_json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertTrue(len(data["features"]) >= 5) # River + stations + shelters

        # 2. Dynamic Inundation Zone Buffer
        res_zone = self.client.get("/api/v1/gis/zones/NODE-ALPHA-1")
        self.assertEqual(res_zone.status_code, 200)
        zone_data = res_zone.get_json()
        self.assertIn("inundation_buffer_meters", zone_data)
        self.assertTrue(zone_data["inundation_buffer_meters"] > 0)
        print(f"  [PASS] GIS GeoJSON Basin Topology & Inundation Buffer verified ({zone_data['inundation_buffer_meters']}m radius).")

    def test_12_autonomous_telemetry_worker(self):
        # Start
        res_start = self.client.post("/api/v1/simulation/worker/start")
        self.assertEqual(res_start.status_code, 200)
        
        # Status
        res_status = self.client.get("/api/v1/simulation/worker/status")
        self.assertEqual(res_status.status_code, 200)
        self.assertTrue(res_status.get_json()["active"])

        # Stop
        res_stop = self.client.post("/api/v1/simulation/worker/stop")
        self.assertEqual(res_stop.status_code, 200)
        print("  [PASS] Autonomous Telemetry Background Worker Start/Status/Stop verified.")

    def test_13_weather_endpoints(self):
        # Current weather
        res_cur = self.client.get("/api/v1/weather/current")
        self.assertEqual(res_cur.status_code, 200)
        self.assertIn("stations", res_cur.get_json())

        # Radar reflectivity grid
        res_rad = self.client.get("/api/v1/weather/radar")
        self.assertEqual(res_rad.status_code, 200)
        self.assertIn("grid", res_rad.get_json())
        self.assertTrue(len(res_rad.get_json()["grid"]) >= 4)

        # 3-Day Forecast
        res_fc = self.client.get("/api/v1/weather/forecast")
        self.assertEqual(res_fc.status_code, 200)
        self.assertIn("3_day_forecast", res_fc.get_json())
        print("  [PASS] Weather & Meteorological Radar Endpoints verified.")

    def test_14_telemetry_aggregations_and_comparison(self):
        # Aggregate
        res_agg = self.client.get("/api/v1/telemetry/aggregate?node_id=NODE-ALPHA-1")
        self.assertEqual(res_agg.status_code, 200)
        agg_data = res_agg.get_json()
        self.assertIn("stage_max_cm", agg_data)
        self.assertIn("stage_std_dev_cm", agg_data)

        # Multi-station compare
        res_comp = self.client.get("/api/v1/telemetry/compare")
        self.assertEqual(res_comp.status_code, 200)
        self.assertTrue(len(res_comp.get_json()["comparison"]) >= 4)

        # Exceedances
        res_exc = self.client.get("/api/v1/telemetry/exceedances")
        self.assertEqual(res_exc.status_code, 200)
        self.assertTrue(isinstance(res_exc.get_json(), list))
        print("  [PASS] Telemetry statistical aggregations & station comparison verified.")

    def test_15_node_calibration_and_vitals(self):
        # 1. Login for token
        res_login = self.client.post("/api/v1/auth/login", json={
            "email": "admin@sfews.gov.et",
            "password": "admin123"
        })
        token = res_login.get_json()["access_token"]

        # 2. Calibrate node
        res_cal = self.client.put("/api/v1/nodes/NODE-AWASH-01/calibration", headers={"Authorization": f"Bearer {token}"}, json={
            "mount_height_cm": 650.0,
            "zero_flow_datum_m": 0.45,
            "sensor_type": "Ultrasonic Dual-Echo JSN-SR04T"
        })
        self.assertEqual(res_cal.status_code, 200)
        self.assertEqual(res_cal.get_json()["status"], "CALIBRATED")

        # 3. Get vitals
        res_vitals = self.client.get("/api/v1/nodes/NODE-AWASH-01/vitals")
        self.assertEqual(res_vitals.status_code, 200)
        self.assertIn("battery_percent", res_vitals.get_json())
        self.assertIn("solar_panel_voltage", res_vitals.get_json())

        # 4. Get history
        res_hist = self.client.get("/api/v1/nodes/NODE-AWASH-01/history")
        self.assertEqual(res_hist.status_code, 200)
        print("  [PASS] Node calibration, hardware vitals, and station history verified.")

    def test_16_alert_resolution_analytics_and_subscribers(self):
        res_login = self.client.post("/api/v1/auth/login", json={
            "email": "admin@sfews.gov.et",
            "password": "admin123"
        })
        token = res_login.get_json()["access_token"]

        # 1. Resolve alert
        res_alerts = self.client.get("/api/v1/alerts/")
        if res_alerts.get_json():
            aid = res_alerts.get_json()[0]["id"]
            res_res = self.client.post(f"/api/v1/alerts/{aid}/resolve", headers={"Authorization": f"Bearer {token}"}, json={
                "notes": "Emergency sandbag dikes deployed. River crest receded."
            })
            self.assertEqual(res_res.status_code, 200)
            self.assertEqual(res_res.get_json()["status"], "RESOLVED")

        # 2. Alert Analytics
        res_ana = self.client.get("/api/v1/alerts/analytics")
        self.assertEqual(res_ana.status_code, 200)
        self.assertIn("mean_time_to_acknowledge_sec", res_ana.get_json())

        # 3. Add subscriber
        res_sub_add = self.client.post("/api/v1/alerts/subscribers", headers={"Authorization": f"Bearer {token}"}, json={
            "id": "SUB-TEST-99",
            "name": "Awash Basin Disaster Unit",
            "phone": "+251911998877",
            "station_id": "NODE-AWASH-01"
        })
        self.assertEqual(res_sub_add.status_code, 201)

        # 4. Delete subscriber
        res_sub_del = self.client.delete("/api/v1/alerts/subscribers/SUB-TEST-99", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_sub_del.status_code, 200)
        print("  [PASS] Alert incident resolution, analytics, and subscriber management verified.")

    def test_17_gis_nearest_and_evacuation_routes(self):
        # 1. Nearest station query
        res_near = self.client.get("/api/v1/gis/nearest?lat=8.55&lng=39.27")
        self.assertEqual(res_near.status_code, 200)
        near_data = res_near.get_json()
        self.assertIn("nearest_station_id", near_data)
        self.assertIn("distance_km", near_data)

        # 2. Safe evacuation routes
        res_routes = self.client.get("/api/v1/gis/routes")
        self.assertEqual(res_routes.status_code, 200)
        self.assertTrue(len(res_routes.get_json()["routes"]) >= 2)
        print(f"  [PASS] GIS proximity query ({near_data['nearest_station_id']}, {near_data['distance_km']}km) & evacuation corridors verified.")

if __name__ == "__main__":
    print("\n=== STARTING FLASK PRODUCTION BACKEND FULL TEST ===")
    unittest.main()
