# 🌊 SFEWS — Smart Flood Early Warning System

> An AI-powered, real-time flood monitoring and forecasting platform for Ethiopia's river basins.

SFEWS is a full-stack system that ingests live telemetry from IoT edge sensors deployed across Ethiopian river basins, computes flood risk in real time, and provides an intelligent AI Command Center for emergency operators. The platform combines hardware simulation, machine learning, and large language models to deliver data-backed situational awareness and evacuation recommendations.

---

## ✨ Key Features

- **🛰️ Real-Time Telemetry** — Live water level and rainfall data streamed via WebSockets to all connected dashboards instantly.
- **🤖 AI Command Center** — Natural language chat interface powered by GPT-4o. Ask questions like *"What is the flood risk at Awash River?"* and get a data-backed emergency report synthesized from live sensors and weather forecasts.
- **🔄 Fail-Safe LLM Routing** — Automatic fallback across three AI providers (Azure OpenAI → DeepSeek → Groq) to guarantee zero downtime during presentations or production use.
- **🌦️ Weather Integration** — Upstream rainfall forecasts pulled from OpenWeather API and correlated with sensor readings.
- **📍 Smart Geocoding** — Converts natural language locations (e.g., *"Abay Bahirdar"*) into precise coordinates using LocationIQ.
- **⚡ Event-Driven Architecture** — No polling. The backend pushes updates to all frontends the instant new data arrives.
- **📊 Risk Classification** — Every reading is classified into `Safe`, `Warning`, or `Critical` tiers with computed flood probabilities.

---

## 🏗️ Architecture

```text
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  IoT Sensors │────▶│   FastAPI Backend     │────▶│  React Frontend  │
│  (Simulator) │     │                      │     │  (Command Center)│
└──────────────┘     │  ┌────────────────┐  │     └──────────────────┘
                     │  │  PostgreSQL    │  │              ▲
                     │  │  (Neon Cloud)  │  │              │
                     │  └────────────────┘  │         WebSocket
                     │                      │         (Real-Time)
                     │  ┌────────────────┐  │
                     │  │  AI Agent      │  │
                     │  │  (LLM + Tools) │  │
                     │  └────────────────┘  │
                     └──────────────────────┘
```

| Layer | Technology |
|:------|:-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, SQLAlchemy 2.0, Pydantic V2 |
| Database | PostgreSQL (Neon Serverless) |
| AI Agent | OpenAI SDK (native tool calling), GPT-4o / Llama 3.3 |
| External APIs | OpenWeather (forecasts), LocationIQ (geocoding) |
| Real-Time | FastAPI WebSockets |
| Simulation | Python-based IoT data generator |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL database (or a [Neon](https://neon.tech) free-tier account)

### 1. Clone the Repository
```bash
git clone https://github.com/kenenisabeyan/sfews-ethiopia.git
cd sfews-ethiopia
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt  # Or: uv sync
```

Create a `.env` file in `backend/` with your credentials (see `backend/README.md` for the full list).

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Run the Stack
Open two terminals:

**Terminal 1 — Backend API:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend Dashboard:**
```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173` and the API docs at `http://localhost:8000/docs`.

---

## 📂 Project Structure

```text
sfews-ethiopia/
├── backend/              # FastAPI backend + AI Agent
│   ├── app/
│   │   ├── routers/      # API endpoints (telemetry, chat, dashboard, WebSocket)
│   │   ├── services/     # Business logic
│   │   │   ├── agent/    # LLM orchestration (tools, fallback client, loop)
│   │   │   └── external/ # Third-party API wrappers (weather, geocoding)
│   │   ├── models.py     # Database models
│   │   └── main.py       # App entry point
│   └── README.md         # Detailed backend documentation
├── frontend/             # React + TypeScript dashboard
└── simulator/            # IoT sensor data generator
```

---

## 🤖 AI Agent — How It Works

The AI Agent allows emergency operators to ask questions in plain English. Behind the scenes, the agent autonomously decides which tools to use, gathers real-time data, and synthesizes a professional emergency report.

**Example:**
```
User: "What is the flood risk at Awash River and is there heavy rain coming?"

Agent: Gathers sensor data from PostgreSQL → Geocodes "Awash River" →
       Fetches weather forecast → Synthesizes report

Response: "The Awash Alpha Sensor reports a water level of 450cm with
           95.5mm/hr rainfall. Risk level: CRITICAL. No heavy rain is
           forecasted upstream in the next 24 hours."
```

---

## 👥 Team

This project was built as part of the Coding House program.

## 📄 License

This project is for educational purposes.