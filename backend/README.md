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
│   │   ├── chat.py      # AI Agent chat endpoint (LLM Orchestration)
│   │   └── system.py    # Database seeding utility
│   └── services/        
│       ├── ml.py        # Flood prediction ML models
│       ├── websocket.py # WebSocket Connection Manager & Broadcaster
│       ├── agent/       # LLM Orchestration Layer
│       │   ├── orchestrator.py  # Multi-step agent execution loop
│       │   ├── llm_client.py    # Fail-safe LLM client (Azure → DeepSeek → Groq)
│       │   └── tools.py         # Tool definitions & database query functions
│       └── external/    # Third-Party API Wrappers
│           ├── weather_service.py  # OpenWeather API (5-day forecast)
│           └── geocode_service.py  # LocationIQ geocoding API
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
   Create a `.env` file in the `backend/` directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

   # LLM Providers (AI Agent)
   GITHUB_OPENAI__API_TOKEN=your_github_token    # Primary LLM (Azure OpenAI via GitHub Models)
   GITHUB_OPENAI_BASE_URL=https://models.inference.ai.azure.com
   GROQ_API_KEY=your_groq_key                    # Fallback LLM (Groq - free tier)
   DEEPSEEK_API_KEY=your_deepseek_key            # Fallback LLM (DeepSeek)

   # External Data APIs
   OPEN_WEATHER_API_KEY=your_openweather_key     # Weather forecasts (free tier)
   LOCATIONIQ_API_KEY=your_locationiq_key        # Geocoding (free tier)
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

### 5. AI Agent Chat
* **`POST /api/v1/chat/ask`**
* **Description:** Single-shot natural language query endpoint. The AI agent autonomously gathers real-time sensor data from the database, fetches weather forecasts from OpenWeather, and geocodes locations via LocationIQ to produce a comprehensive situational report.

---

## 🤖 AI AGENT SYSTEM (Frontend Developers Read This)

The backend includes a fully autonomous AI Agent that can answer natural language questions about flood status by combining live database telemetry with external weather APIs.

### How It Works (Architecture)

```text
User Question
     │
     ▼
┌─────────────┐     ┌──────────────────────────────────────┐
│  chat.py    │────▶│  orchestrator.py (Agent Loop)         │
│  (Router)   │     │  Max 5 reasoning steps                │
└─────────────┘     └──────────┬───────────────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌────────┐ ┌──────────┐
              │ Database │ │Weather │ │ Geocode  │
              │  (tools) │ │  API   │ │   API    │
              └──────────┘ └────────┘ └──────────┘
```

1. The user sends a natural language question.
2. The **LLM** (Azure OpenAI, with automatic fallback to DeepSeek → Groq) decides which tools to invoke.
3. The **orchestrator** executes the requested tools (database queries, weather lookups, geocoding) and feeds the results back to the LLM.
4. The LLM synthesizes all data into a professional emergency report.
5. The loop repeats if the LLM needs more information (up to 5 steps).

### Available Agent Tools

| Tool | Source | Description |
|:-----|:-------|:------------|
| `get_current_water_level` | PostgreSQL | Fetches latest sensor readings (water level, rainfall, risk level, battery) |
| `get_coordinates` | LocationIQ API | Converts location names (e.g., "Abay Bahirdar") to lat/lon coordinates |
| `get_weather_forecast` | OpenWeather API | Fetches 24-hour rainfall and weather forecast for given coordinates |

### LLM Fallback Strategy

The agent automatically cascades through providers if one fails (rate limit, outage, etc.):

```
Azure OpenAI (GPT-4o) → DeepSeek (deepseek-chat) → Groq (Llama 3.3 70B)
```

No frontend code changes are needed — the fallback is entirely server-side and invisible to the user.

### Frontend Integration

**Request:**
```bash
POST /api/v1/chat/ask
Content-Type: application/json

{
  "query": "What is the flood risk at Awash River and is there heavy rain coming?"
}
```

**Response:**
```json
{
  "response": "**Emergency Flood Status Report: Awash River**\n\n- **Sensor Location:** Awash Alpha Sensor (Awash River Basin)\n- **Current Water Level:** 450 cm\n- **Rainfall Rate:** 95.5 mm/hour\n- **Flood Risk Level:** Critical\n- **Flood Probability:** 100%\n\nNo heavy rainfall is forecasted upstream in the next 24 hours. However, current conditions are critical. Immediate monitoring is advised."
}
```

**React/TypeScript Example:**
```typescript
const askAgent = async (question: string): Promise<string> => {
  const res = await fetch("http://localhost:8000/api/v1/chat/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: question }),
  });
  const data = await res.json();
  return data.response; // Markdown-formatted string
};
```

> **Note:** The `response` field contains Markdown-formatted text. Use a Markdown renderer (e.g., `react-markdown`) to display it properly in the UI.
