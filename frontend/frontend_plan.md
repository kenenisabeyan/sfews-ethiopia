# SFEWS Frontend Implementation Plan

> **Scope:** This document is the single source of truth for the frontend rebuild. The backend is frozen — no backend changes will be made. Every feature described here maps directly to an existing, tested backend endpoint.

---

## 1. Current Frontend Audit

### What Exists
| File | Status | Verdict |
|:-----|:-------|:--------|
| `App.tsx` (315 lines) | Monolith — KPIs, sensor cards, chart, WebSocket, health check all in one file | **Rewrite** — split into components and pages |
| `types/index.ts` | Correct interfaces matching backend schemas | **Keep as-is** — already accurate |
| `index.css` | TailwindCSS directives + body reset | **Keep** |
| `App.css` | Leftover Vite boilerplate (`.hero`, `.counter`, `#center`) | **Delete** — not used anywhere |
| `main.tsx` | Standard React root mount | **Keep** — will add Router here |
| `vite-env.d.ts` | Vite client types | **Keep** |

### Bugs in Current Code
1. **Dead reference:** The error banner calls `fetchDashboardData` on button click (line 113), but that function was removed when we switched to WebSockets. This will crash on click.
2. **No auth:** The backend's `GET /api/v1/dashboard/` and `POST /api/v1/chat/ask` are JWT-protected. The frontend has zero login flow, so these endpoints are unreachable.
3. **No reconnection:** If the WebSocket drops, the UI shows a static error banner but never attempts to reconnect.
4. **History double-reverse:** The backend `build_dashboard_payload` already returns history in chronological order (it calls `reversed()` on desc-sorted logs). The frontend then reverses it *again* (line 40), which puts it back in reverse-chronological order — the chart plots newest on the left, which is backwards.

### What's Missing (Backend Features With No Frontend)
| Backend Feature | Endpoint | Frontend Status |
|:----------------|:---------|:----------------|
| JWT Authentication | `POST /api/v1/auth/login` | ❌ No login page |
| Current user info | `GET /api/v1/auth/me` | ❌ Not used |
| AI Agent chat | `POST /api/v1/chat/ask` | ❌ No chat UI |
| Node registration | `POST /api/v1/nodes/register` | ❌ No admin form |
| System seeding | `POST /api/v1/system/seed` | ❌ Not exposed |

---

## 2. Backend API Contract (Frozen — Do Not Modify)

### 2.1 Public Endpoints (No Auth Required)

#### `GET /` — Health Check
```json
// Response
{
  "status": "Operational",
  "api_version": "2.0.0",
  "database_connection": "Active",
  "server_time": "2026-05-21T05:35:00+00:00"
}
```

#### `WS /api/v1/ws/dashboard` — Real-Time Dashboard Stream
- **On connect:** Server immediately pushes the full `DashboardResponse` JSON.
- **On telemetry event:** Server pushes updated `DashboardResponse` JSON automatically.
- **Client responsibility:** Keep connection open, parse `onmessage` events.

```typescript
// DashboardResponse shape (received via WebSocket)
{
  "summary": {
    "totalNodes": 2,
    "activeAlerts": 1,
    "systemHealthStatus": "Warning"  // "Operational" | "Warning" | "Critical"
  },
  "nodes": [
    {
      "id": "NODE-1",
      "name": "Awash Alpha Sensor",
      "latitude": 8.98,
      "longitude": 38.73,
      "status": "Active",
      "batteryLevel": 92.5,
      "waterLevelCm": 310.5,
      "rainfallRateMm": 45.2,
      "currentRisk": "Warning"  // "Safe" | "Warning" | "Critical"
    }
  ],
  "history": [
    {
      "logId": 1,
      "nodeId": "NODE-1",
      "waterLevelCm": 310.5,
      "rainfallRateMm": 45.2,
      "floodProbability": 0.55,
      "riskLevel": "Warning",
      "timestamp": "2026-05-21T05:30:00+00:00"
    }
  ]
}
```

#### `POST /api/v1/telemetry/` — IoT Data Ingestion
> The frontend does NOT call this directly. Physical sensors (or the simulator) call it. Included here for completeness because it triggers WebSocket broadcasts.

#### `POST /api/v1/nodes/register` — Register New Sensor
```typescript
// Request
{
  "id": "NODE-AWASH-01",
  "name": "Awash Alpha Sensor",
  "basin_name": "Awash River Basin",   // default
  "country_name": "Ethiopia",           // default
  "latitude": 8.98,
  "longitude": 38.73,
  "battery_level": 100.0               // default
}
// Response: SensorNodeResponse (same shape as nodes[] in dashboard)
```

#### `POST /api/v1/system/seed` — Seed Default Data
```typescript
// No request body needed
// Response
{ "status": "success", "basin_id": 1, "details": ["Created Country: Ethiopia", ...] }
```

#### `POST /api/v1/auth/seed-admin` — Create Default Admin
```typescript
// No request body needed
// Response
{ "msg": "Initial admin user created", "email": "admin@sfews.gov.et", "password": "admin123" }
```

### 2.2 Protected Endpoints (JWT Required)

All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

#### `POST /api/v1/auth/login` — Get JWT Token
```typescript
// Request: application/x-www-form-urlencoded
// Fields: username=admin@sfews.gov.et&password=admin123
// Response
{ "access_token": "eyJhbG...", "token_type": "bearer" }
```

#### `GET /api/v1/auth/me` — Current User Profile
```typescript
// Response
{ "id": 1, "name": "System Administrator", "email": "admin@sfews.gov.et", "role": "admin" }
```

#### `GET /api/v1/dashboard/` — Dashboard Data (HTTP Fallback)
```typescript
// Response: same DashboardResponse shape as WebSocket
// Use case: initial page load fallback if WebSocket hasn't connected yet
```

#### `POST /api/v1/chat/ask` — AI Agent Query
```typescript
// Request
{ "query": "What is the flood risk at Awash River?" }
// Response
{ "response": "**Emergency Flood Status Report...**" }  // Markdown string
```

---

## 3. Architecture & File Structure

```text
frontend/src/
├── main.tsx                    # Root mount + BrowserRouter
├── index.css                   # Tailwind directives + global styles
│
├── types/
│   └── index.ts                # All TypeScript interfaces (KEEP existing)
│
├── config/
│   └── api.ts                  # API_BASE_URL, WS_URL constants
│
├── hooks/
│   ├── useWebSocket.ts         # WebSocket connection with auto-reconnect
│   └── useAuth.ts              # JWT token management + login/logout
│
├── context/
│   └── AuthContext.tsx          # Auth state provider (token, user, isAuthenticated)
│
├── services/
│   └── api.ts                  # Axios instance with JWT interceptor + all API calls
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Top bar: logo, system status, user menu
│   │   └── ProtectedRoute.tsx  # Route guard — redirects to /login if unauthenticated
│   ├── dashboard/
│   │   ├── KpiGrid.tsx         # 3 stat cards (total nodes, alerts, system status)
│   │   ├── SensorCard.tsx      # Single node card (metrics, battery, risk badge)
│   │   ├── SensorList.tsx      # Scrollable list of SensorCards
│   │   └── HydroChart.tsx      # Recharts AreaChart for basin trends
│   └── chat/
│       └── ChatPanel.tsx       # Sliding AI assistant panel
│
├── pages/
│   ├── LoginPage.tsx           # Auth form
│   └── DashboardPage.tsx       # Main command center (composes dashboard components)
│
└── App.tsx                     # Route definitions only
```

### Dependency Additions
```json
{
  "react-router-dom": "^6.x",
  "react-markdown": "^9.x"
}
```
> `react-router-dom` for page routing. `react-markdown` for rendering the AI agent's Markdown responses. No other new dependencies needed — we keep `axios`, `recharts`, and `tailwindcss`.

---

## 4. Data Flow (End-to-End)

### 4.1 Authentication Flow

```text
User opens app
       │
       ▼
  Has token in localStorage?
       │
   ┌───┴───┐
   No      Yes
   │        │
   ▼        ▼
LoginPage   Validate: GET /api/v1/auth/me
   │              │
   │         ┌────┴────┐
   │       Valid    Invalid/Expired
   │         │          │
   │         ▼          ▼
   │    DashboardPage   Clear token → LoginPage
   │
   ▼
POST /api/v1/auth/login (form-urlencoded)
   │
   ▼
Store token in localStorage → redirect to DashboardPage
```

### 4.2 Real-Time Dashboard Flow

```text
DashboardPage mounts
       │
       ├──► useWebSocket hook connects to ws://.../api/v1/ws/dashboard
       │         │
       │         ▼ onopen
       │    Server pushes full DashboardResponse immediately
       │         │
       │         ▼ onmessage
       │    Parse JSON → update React state
       │    (summary, nodes[], history[])
       │         │
       │         ▼ (loop)
       │    Every telemetry event → server pushes updated payload
       │    React re-renders affected components
       │
       └──► fetchHealth(): GET / (one-time, for API status badge)
```

### 4.3 AI Agent Chat Flow

```text
User clicks chat icon → ChatPanel slides open
       │
       ▼
User types question → POST /api/v1/chat/ask (with JWT)
       │
       ▼
Backend orchestrator: LLM → tools (DB, Weather, Geocode) → LLM → response
       │
       ▼
Frontend receives { "response": "**Markdown report...**" }
       │
       ▼
Render with react-markdown inside ChatPanel
```

---

## 5. Component Specifications

### 5.1 `useWebSocket` Hook
**Purpose:** Manages the WebSocket lifecycle with automatic reconnection.

```typescript
// Interface
function useWebSocket(): {
  payload: DashboardPayload | null;
  isConnected: boolean;
}
```

**Behavior:**
- Connects to `ws://<API_BASE_URL>/api/v1/ws/dashboard` on mount.
- Parses every `onmessage` event as `DashboardPayload` and updates state.
- On disconnect/error: waits 3 seconds, then reconnects (exponential backoff, max 30s).
- Cleans up on unmount.
- Does NOT reverse the `history` array — backend already sends it in chronological order.

### 5.2 `useAuth` Hook + `AuthContext`
**Purpose:** Centralized auth state accessible from any component.

**State:**
- `token: string | null` — from localStorage
- `user: UserResponse | null` — fetched from `/auth/me`
- `isAuthenticated: boolean`
- `isLoading: boolean` — true while validating token on app start

**Methods:**
- `login(email, password)` → POST `/api/v1/auth/login` (form-urlencoded) → store token → fetch user
- `logout()` → clear localStorage → redirect to `/login`

### 5.3 `api.ts` Service
**Purpose:** Centralized Axios instance with automatic JWT injection.

```typescript
// Creates an axios instance
// Request interceptor: if token exists in localStorage, attach Authorization header
// Response interceptor: if 401 received, clear token and redirect to /login
// Exports typed functions:
//   fetchHealth() → GET /
//   fetchDashboard(token) → GET /api/v1/dashboard/
//   askAgent(query, token) → POST /api/v1/chat/ask
//   seedSystem() → POST /api/v1/system/seed
//   seedAdmin() → POST /api/v1/auth/seed-admin
//   registerNode(data) → POST /api/v1/nodes/register
```

### 5.4 `LoginPage`
**Layout:** Centered card on dark background. SFEWS branding. Email + password fields. Submit button.
**On submit:** Call `auth.login(email, password)`. On success, navigate to `/`. On error, show inline error message.

### 5.5 `DashboardPage`
**Composition:** This page composes all dashboard sub-components. It is the main "command center" view.

```text
┌─────────────────────────────────────────────────────────┐
│  Header (logo, status badge, user avatar, logout)       │
├─────────────────────────────────────────────────────────┤
│  KpiGrid (3 cards: nodes, alerts, system status)        │
├──────────────┬──────────────────────────────────────────┤
│  SensorList  │  HydroChart                              │
│  (scrollable │  (AreaChart: water level + rainfall)     │
│   left col)  │                                          │
│              │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
  ChatPanel (floating FAB + slide-in panel, bottom-right)
```

**Data source:** `useWebSocket()` hook provides `payload`. All child components receive data as props — no child makes API calls.

### 5.6 `KpiGrid`
**Props:** `summary: DashboardSummary, isOnline: boolean`
**Renders:** 3 glass-morphism stat cards.
- Card 1: `summary.totalNodes` — "Monitored Stations"
- Card 2: `summary.activeAlerts` — "Active Alerts" (amber/red glow when > 0)
- Card 3: `summary.systemHealthStatus` — "System Status" (color-coded)

### 5.7 `SensorCard`
**Props:** `node: SensorNode`
**Renders:** A card showing:
- Node name + coordinates
- Risk badge (Safe=green, Warning=amber, Critical=red with pulse)
- Water depth (cm) + Rainfall rate (mm/h) metrics
- Battery bar with percentage
- "Broadcast Emergency SMS" button (only when Critical)

### 5.8 `HydroChart`
**Props:** `history: HydroLog[]`
**Renders:** Recharts `AreaChart` with two areas:
- Blue: `waterLevelCm`
- Cyan: `rainfallRateMm`
- X-axis: `timestamp` formatted as HH:mm:ss
- Dark-themed tooltips
- Gradient fill under curves

### 5.9 `ChatPanel`
**Props:** None (uses AuthContext for token)
**State:** `messages: {role: 'user'|'assistant', content: string}[]`, `isLoading`, `isOpen`
**Behavior:**
- Floating action button (bottom-right corner) toggles the panel.
- User types a question → `POST /api/v1/chat/ask` with JWT.
- Response rendered as Markdown via `react-markdown`.
- Shows loading spinner while agent is thinking (can take 5-15 seconds due to multi-step LLM reasoning).

---

## 6. Routing

```typescript
// App.tsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

`ProtectedRoute` checks `isAuthenticated` from `AuthContext`. If false, redirects to `/login`.

---

## 7. Implementation Order

Each phase produces a working, testable state.

### Phase 1: Foundation (Scaffolding + Auth)
1. Delete `App.css` (dead code).
2. Create `config/api.ts` with `API_BASE_URL` and `WS_URL`.
3. Create `services/api.ts` with Axios instance + JWT interceptor.
4. Create `context/AuthContext.tsx` + `hooks/useAuth.ts`.
5. Create `LoginPage.tsx`.
6. Create `ProtectedRoute` wrapper component.
7. Rewrite `App.tsx` to only contain route definitions.
8. Install `react-router-dom`.
9. **Test:** Login with `admin@sfews.gov.et` / `admin123`, verify token stored, redirected to `/`.

### Phase 2: Real-Time Dashboard Core
1. Create `hooks/useWebSocket.ts` with auto-reconnect.
2. Create `components/layout/Header.tsx`.
3. Create `components/dashboard/KpiGrid.tsx`.
4. Create `components/dashboard/SensorCard.tsx` + `SensorList.tsx`.
5. Create `components/dashboard/HydroChart.tsx`.
6. Create `pages/DashboardPage.tsx` composing everything.
7. **Test:** Log in, see live dashboard data from WebSocket. Use Swagger to send telemetry and watch dashboard update in real-time.

### Phase 3: AI Agent Chat
1. Install `react-markdown`.
2. Create `components/chat/ChatPanel.tsx`.
3. Add FAB (floating action button) + slide-in panel to `DashboardPage`.
4. **Test:** Open chat, ask "What is the flood risk at Awash?", see Markdown-rendered response.

### Phase 4: Polish & Edge Cases
1. WebSocket reconnection indicator in Header.
2. Empty states: "No sensors registered" placeholder when `nodes[]` is empty.
3. Loading skeletons for initial dashboard load.
4. Mobile responsive layout adjustments.
5. Error toasts instead of inline banners.

---

## 8. Key Technical Decisions

| Decision | Rationale |
|:---------|:----------|
| **Keep TailwindCSS** | Already installed and configured. The existing `App.tsx` uses Tailwind classes throughout. No reason to switch. |
| **No global state library** | React Context + `useState` is sufficient. We have only 2 pieces of global state (auth and dashboard payload). Redux/Zustand would be overkill. |
| **WebSocket for primary data, HTTP for auth only** | Backend design: WebSocket pushes dashboard data on every telemetry event. HTTP is only needed for login, chat, and one-time health check. |
| **Token in localStorage** | Simple, persists across tabs and refreshes. The backend issues 24-hour tokens. Acceptable for an internal command center tool. |
| **No SSR / No Next.js** | This is an internal monitoring dashboard, not a public-facing SEO-critical site. Vite SPA is the right choice. |
| **Component props over context for dashboard data** | The WebSocket payload flows from `DashboardPage` → child components via props. This keeps the data flow explicit and debuggable. Only auth uses Context because it's needed across route boundaries. |

---

## 9. Files to Delete / Clean Up

| File | Action |
|:-----|:-------|
| `src/App.css` | **Delete** — 185 lines of unused Vite boilerplate |
| `src/App.tsx` | **Rewrite entirely** — current 315-line monolith replaced with ~20-line router |

---

## 10. Environment Variables

The frontend uses one environment variable (already configured):

```env
# frontend/.env
VITE_API_URL=http://localhost:8000
```

This is consumed in `config/api.ts` and used to derive both HTTP and WebSocket URLs.
