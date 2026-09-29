# DRISHTI // Autonomous Mining Telemetry & Trajectory Predictive Safety

> **Enterprise-Grade Digital-Twin Mission Control with Anticipatory Risk Scoring & Telemetry Orchestration.**

DRISHTI elevates autonomous surface and underground mining safety beyond reactive geofence alarms into a **predictive, trajectory-based anticipatory safety system**. Rather than alerting only after an autonomous 400-ton haul truck enters a restricted blasting sector or geotech fault, DRISHTI computes continuous heading vectors, projects coordinates $N$ seconds forward, and delivers an exact **Time-To-Zone-Entry (TTZE)** countdown with automated intervention commands.

---

## 🌟 Key Capabilities & Differentiators

### 1. Mission Control UI/UX
- **Aesthetic**: Obsidian dark glassmorphism (`backdrop-filter: blur(16px)`), precision border accents, cyan telemetry highlights, and amber/crimson reserved exclusively for threat states.
- **Layered 2.5D Topographic Mine Map**: SVG bench contour elevation curves, real-time vehicle icons rotating with heading angles, historical breadcrumb trails, and forward projected trajectory rays.
- **Typography**: Dual-type hierarchy pairing `Inter` for operational ergonomics and `JetBrains Mono` for GPS coordinates, velocity, bearings, and countdown tickers.
- **Tactical Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant search and teleportation across all fleet units, geofenced hazard zones, operational intervention actions, and demo scenarios.
- **Audio Feedback**: Synthetic Web Audio API alerts and confirmations tailored for operations rooms.

### 2. Predictive Intelligence Layer (The Differentiator)
- **Linear Extrapolation Engine**: Projects vehicle position $P(t + \Delta t) = P_t + \vec{v} \cdot \Delta t$ across a 30-second forward horizon.
- **Time-To-Zone-Entry (TTZE)**: Computes ray-polygon/radius intersections to calculate exact seconds before breach (e.g. `TTZE: 12s to Active Blasting Sector B-2`).
- **Dynamic Threat Tiers**:
  - `SAFE (0 - 29)`: Normal haulage transit.
  - `WARNING (30 - 69)`: Encroaching upon safety buffer within 25 seconds.
  - `CRITICAL (70 - 100)`: Imminent breach within 12 seconds or active violation.

### 3. Enterprise Architecture & DevOps Maturity
- **Observability**: Prometheus metrics exporter at `/metrics` (ingestion rate, alert latency, WebSocket connections, heap memory, calculation duration) + preconfigured `docker-compose.yml` with Prometheus & Grafana.
- **Multi-Tenancy**: Site-scoped isolation supporting multiple mines (e.g. *Pit Alpha — Surface Copper* vs *Shaft Beta — Deep Sub-Level*).
- **API & OpenAPI**: Versioned REST API (`/api/v1/...`) with auto-generated OpenAPI 3.0 / Swagger documentation at `/api/v1/docs`.
- **Validation & Security**: Zod runtime schema validation on every ingestion payload and command parameter.
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) for linting, type-checking, and unit testing.

### 4. Guided Pitch Demo Mode
- **1-Click Scripted Scenario**: Triggerable via the top "Demo Scenario" button or Command Palette.
- Accelerates CAT 797F #04 along a conflicting trajectory toward Active Blasting Sector B-2.
- The TTZE countdown activates on the HUD, risk escalates from Safe to Warning to Critical, audio beacons trigger, and the operator dispatches an **Emergency Halt** or **Corridor Diversion** to safely resolve the incident.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node 20 / 24)
- npm 9+

### Installation & Run
```bash
# Install dependencies
npm install

# Run backend (port 4000) and frontend (port 5173) concurrently
npm run dev
```

Open your browser:
- **Mission Control Dashboard**: [http://localhost:5173](http://localhost:5173)
- **OpenAPI / Swagger Spec**: [http://localhost:4000/api/v1/docs](http://localhost:4000/api/v1/docs)
- **Prometheus Metrics**: [http://localhost:4000/metrics](http://localhost:4000/metrics)

---

## 🧪 Testing & Verification

```bash
# Run Trajectory Math & Geofence Unit Tests
npm test

# Verify TypeScript type checking
npm run typecheck

# Verify Production Build
npm run build
```

---

## 📊 Live System Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/sites` | `GET` | Multi-tenant mine sites list |
| `/api/v1/vehicles` | `GET` | Fleet state, telemetry, and predictive risk scores |
| `/api/v1/vehicles/:id/command` | `POST` | Intervene with Emergency Halt or Diversion |
| `/api/v1/zones` | `GET` | Active blasting and restricted geofences |
| `/api/v1/alerts` | `GET` | Active safety alert feed |
| `/api/v1/alerts/:id/acknowledge` | `POST` | Operator alert acknowledgment |
| `/api/v1/scenarios/trigger` | `POST` | Trigger scripted pitch presentation breach |
| `/api/v1/docs` | `GET` | Interactive Swagger API documentation |
| `/metrics` | `GET` | Prometheus telemetry & operational metrics |
| `/ws` | `WS` | Real-time 1Hz digital-twin broadcast channel |
