# SFEWS Command Center - Backend API

The backend for the **Smart Flood Early Warning System (SFEWS)**. This is a globally scalable API designed to ingest high-frequency IoT telemetry, compute real-time flood probabilities using machine learning models, and serve analytical data to the frontend command center.

## 🚀 Tech Stack

* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (High-performance async web framework)
* **Real-time Engine:** FastAPI WebSockets
* **Package Manager:** [uv](https://github.com/astral-sh/uv) (Extremely fast Rust-based package manager)
* **Database:** PostgreSQL (hosted on Neon)
* **ORM:** SQLAlchemy 2.0
* **Validation:** Pydantic V2

## 📦 Project Structure

```text
backend/
├── app/
│   ├── main.py          # Application entry point & configuration
│   ├── database.py      # Database connection & session management
│   ├── models.py        # SQLAlchemy ORM definitions
│   ├── schemas.py       # Pydantic V2 schemas for validation
│   ├── routers/         # API Route definitions
│   │   ├── telemetry.py # Edge device data ingestion (Trigger for WebSockets)
│   │   ├── nodes.py     # Sensor node registration
│   │   ├── ws.py        # WebSocket tunnel for real-time frontend pushing
│   │   ├── dashboard.py # Frontend analytics (Fallback HTTP endpoint)
│   │   └── system.py    # Database seeding utility
│   └── services/        
│       ├── ml.py        # Flood prediction ML models
│       └── websocket.py # WebSocket Connection Manager & Broadcaster
├── pyproject.toml       # Project metadata and dependencies
└── .env                 # Environment variables (not committed)
```

## ⚙️ Setup & Installation

This project uses **`uv`** for lightning-fast dependency management.

1. **Install `uv` (if not installed):**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Sync the environment:**
   In the `backend` directory, run:
   ```bash
   uv sync
   ```

3. **Environment Variables:**
   Create a `.env` file in the `backend/` directory and add your PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
   ```

## 🚀 Running the Server

Start the development server with live reload:

```bash
uv run uvicorn app.main:app --reload
```

The server will be available at `http://localhost:8000`.
**Interactive API Documentation (Swagger UI)** is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚡ REAL-TIME WEBSOCKETS (Frontend Developers Read This)

The dashboard is completely event-driven. **Do NOT use HTTP polling.**

### Connection Details
* **Protocol:** `ws://` (or `wss://` in production)
* **Endpoint:** `/api/v1/ws/dashboard`
* **Example:** `ws://localhost:8000/api/v1/ws/dashboard`

### How it works:
1. Connect via the native browser `new WebSocket(url)`.
2. Upon connection, the backend will immediately push the entire current database state as a JSON string so your UI populates instantly.
3. Keep the connection open and listen via `ws.onmessage`.
4. Every time a physical IoT sensor pushes new data to the backend, the backend will automatically broadcast the updated JSON payload to all connected sockets in milliseconds.

---

## 📡 Core API Endpoints

### 1. Ingest Telemetry
* **`POST /api/v1/telemetry/`**
* **Description:** Receives water level and rainfall data from a registered IoT sensor. Saves a hydrological log and instantly triggers the WebSocket Broadcaster to update all frontend dashboards.

### 2. Register Edge Node
* **`POST /api/v1/nodes/register`**
* **Description:** Provisions a new physical sensor device. Supports intelligent auto-upserting (automatically creates the Country and Basin if they don't exist).

### 3. System Initialization
* **`POST /api/v1/system/seed`**
* **Description:** Seeds the database with default regions (e.g., Ethiopia, Awash River Basin) to facilitate testing.

### 4. Dashboard Analytics (HTTP Fallback)
* **`GET /api/v1/dashboard/`**
* **Description:** *Deprecated for live updates.* Returns the same aggregate payload pushed over WebSockets. Useful for initial testing or fallback if WebSockets are blocked.
