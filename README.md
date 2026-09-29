# DRISHTI & Thermal Fog Detection Platform

This repository integrates two complementary safety and perception systems for autonomous mining and industrial operations:

1. **DRISHTI (`/drishti`)**: Enterprise-Grade Digital-Twin Mission Control with Trajectory-Based Predictive Safety and telemetry orchestration.
2. **Thermal Fog (`/thermalfog`)**: Vision AI system utilizing YOLOv8 and optical physics telemetry for high-accuracy obstacle detection and fog penetration under zero-visibility conditions.

---

## ðŸ“ Repository Architecture

```
dhristy-new1/
â”œâ”€â”€ drishti/              # REAL DRISHTI Control Room Application (React + Vite + Express + WebSocket)
â”‚   â”œâ”€â”€ src/              # UI components, MineMap, 2.5D topography, digital twin simulator
â”‚   â”œâ”€â”€ server/           # Express server, WebSocket gateway, telemetry ingestion, Prometheus metrics
â”‚   â”œâ”€â”€ public/           # Static assets, map topography, calibrations
â”‚   â”œâ”€â”€ package.json      # Dependencies and scripts (Ports 5173 & 4000)
â”‚   â””â”€â”€ README.md         # DRISHTI documentation
â”‚
â”œâ”€â”€ thermalfog/           # Thermal Fog Vision AI Application (Flask + YOLOv8 + ONNX)
â”‚   â”œâ”€â”€ app.py            # Flask API & Vision engine (Port 5000)
â”‚   â”œâ”€â”€ static/           # Telemetry instruments, cockpit UI, CSS styling
â”‚   â”œâ”€â”€ templates/        # Mission cockpit HTML interface
â”‚   â”œâ”€â”€ api/              # Serverless handlers
â”‚   â”œâ”€â”€ requirements.txt  # Python dependencies (Flask, ONNXRuntime, OpenCV)
â”‚   â””â”€â”€ *.onnx / *.pt     # Trained YOLOv8 thermal perception models
â”‚
â””â”€â”€ .gitignore            # Multi-layer protection against committing secrets, node_modules, and cache
```

---

## âš¡ Inter-Application Communication

The two systems remain decoupled and communicate across the network layer:

- **Thermal Fog Engine (Port 5000)** processes live thermal camera feeds, calculates optical transmission ($\tau$), fog density scores ($0-100\%$), and obstacle bounding boxes.
- **DRISHTI Telemetry Ingestion API (`POST /api/v1/telemetry/ingest` on Port 4000)** consumes vehicle status, position, and `thermalVision` telemetry payloads to calculate Time-To-Zone-Entry (TTZE) hazard alerts.
- **Fleet Mode**: DRISHTI features a live toggle (`LIVE` vs `DEMO`) allowing control-room operators to switch between live Thermal Fog telemetry and simulated stress scenarios.

---

## ðŸš€ Quick Start

### 1. Launch Thermal Fog Vision AI
```bash
cd thermalfog
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### 2. Launch DRISHTI Mission Control
```bash
cd drishti
npm install
npm run dev
# Starts backend server on http://localhost:4000 and client UI on http://localhost:5173
```