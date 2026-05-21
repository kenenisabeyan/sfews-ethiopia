# SFEWS Command Center - LLM Orchestration Implementation Plan

## Overview
This document outlines the architecture and implementation steps for integrating a single-shot, read-only AI Command Center Agent. The agent is capable of reasoning over natural language queries, gathering live hardware telemetry from PostgreSQL, converting location names to coordinates, and fetching upstream weather forecasts.

## Core Constraints
1. **Time Limit:** 1-day implementation deadline.
2. **Framework:** Raw OpenAI Native SDK Tool Calling (No LangChain/MCP bloat).
3. **Execution Mode:** Single-shot query (stateless, no memory).
4. **Permissions:** Strictly Read-Only (Safe for presentation).
5. **LLM Fallback Strategy:** Azure OpenAI -> DeepSeek -> Groq.

## Architecture & Layers

### 1. External API Services Layer (`app/services/external/`)
* **`weather_service.py`**: A clean wrapper for OpenWeather Free API (`/data/2.5/forecast`). Strips bloated JSON down to essential tokens (timestamp, rainfall, description).
* **`geocode_service.py`**: A wrapper for LocationIQ (`/v1/search.php`) to convert natural language queries (e.g., "Abay Bahirdar") to latitude and longitude.

### 2. Database Fetcher (`app/services/db_service.py` extension)
* Function `get_latest_sensor_data(db, location_name)` fetches the absolute latest `water_level_cm`, `rainfall_rate_mm`, and `battery_level` for a specific location.

### 3. Agent Tooling & Orchestration (`app/services/agent/`)
* **`tools.py`**: Registers the external and internal services as standard OpenAI JSON Schema tools.
* **`llm_client.py`**: Implements the Strategy Pattern for fail-safe LLM calling. Attempts Azure OpenAI, falls back to DeepSeek, falls back to Groq on RateLimit/503 errors.
* **`orchestrator.py`**: The agent execution loop. Receives prompt, binds tools, handles tool execution logic, and synthesizes final natural language response.

### 4. API Routing (`app/routers/chat.py`)
* `POST /api/v1/chat/ask`: Single endpoint for the frontend to hit.

## Execution Steps
1. ✅ **Plan Documentation** (This file).
2. 🔄 **Environment Setup:** Append API keys to `.env` and load them via `app/core/config.py` (optional extension) or `os.getenv`.
3. 🔄 **Build External Services:** `geocode_service.py` and `weather_service.py`.
4. 🔄 **Build DB Tool:** Extract latest reading from `HydroLog`.
5. 🔄 **Build Agent Logic:** `tools.py`, `llm_client.py`, and `orchestrator.py`.
6. 🔄 **Expose Endpoint:** Create `chat.py` router and link it to `main.py`.
