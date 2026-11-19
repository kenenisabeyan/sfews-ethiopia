# SFEWS Hardware & Edge IoT Production Integration

This guide details connecting physical hydrological sensor nodes across the **Awash River Basin** to the production SFEWS Command Center.

---

## 1. Network Topology

```text
[ Ultrasonic / Pressure Transducer ]
             │
             ▼
      [ ESP32 MCU ]
             │
     ┌───────┴───────────────────┐
     ▼                           ▼
[ 4G GSM SIM7600 ]       [ SX1276 LoRa 868/433MHz ]
     │                           │
     │ Direct Cellular HTTPS     ▼
     │                   [ LoRaWAN Gateway ]
     │                   (Multitech / Dragino)
     │                           │ HTTP Batch Webhook
     ▼                           ▼
┌────────────────────────────────────────────────────────┐
│     SFEWS Production API (https://api.sfews.gov.et)    │
│            /api/v1/telemetry/  or  /batch              │
└────────────────────────────────────────────────────────┘
```

---

## 2. Option A: Direct 4G Cellular / GSM (SIM800L / SIM7600)

When deploying standalone river depth poles where Wi-Fi is unavailable:

1. Insert an active **Ethio Telecom SIM card** configured with APN: `etc.com` or `live.et`.
2. In the ESP32 code ([sfews_esp32_firmware.ino](file:///c:/Users/kenenisa/Documents/sfews-ethiopia/firmware/sfews_esp32_firmware/sfews_esp32_firmware.ino)):
   ```cpp
   // Set production endpoints
   const char* telemetryEndpoint = "https://api.sfews.gov.et/api/v1/telemetry/";
   const char* heartbeatEndpoint = "https://api.sfews.gov.et/api/v1/nodes/NODE-ALPHA-1/heartbeat";
   ```
3. Set the polling frequency (recommended: **15 minutes** in Normal State, **2 minutes** in Warning/Critical state).
4. The station will POST telemetry payload:
   ```json
   {
     "node_id": "NODE-ALPHA-1",
     "water_level_cm": 312.4,
     "rainfall_rate_mm": 24.0,
     "battery_level": 96.5
   }
   ```

---

## 3. Option B: LoRaWAN Gateway Webhook (The Things Network / ChirpStack)

For clusters of ultrasonic sensors communicating to a central solar-powered tower gateway:

1. Configure gateway forwarder to send an HTTP POST to:
   ```
   POST https://api.sfews.gov.et/api/v1/telemetry/batch
   ```
2. Payload format:
   ```json
   {
     "readings": [
       {
         "node_id": "NODE-ALPHA-1",
         "water_level_cm": 280.5,
         "rainfall_rate_mm": 12.0,
         "battery_level": 94.0
       },
       {
         "node_id": "NODE-BETA-2",
         "water_level_cm": 345.0,
         "rainfall_rate_mm": 45.2,
         "battery_level": 88.0
       }
     ]
   }
   ```

---

## 4. Hardware Heartbeat & Watchdog

To detect station vandalism, silt blockages, or battery failures:
- Send a periodic heartbeat ping:
  ```
  POST https://api.sfews.gov.et/api/v1/nodes/{node_id}/heartbeat
  {"battery_level": 92.0}
  ```
- If a station does not report for over **30 minutes**, the system transitions its status from `Active` to `Offline` and flags an inspection notice on the operator dashboard.
