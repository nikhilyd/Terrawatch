# 🌍 TerraWatch — AI-Powered Environmental Intelligence Platform

> **AI-powered geospatial intelligence platform that detects illegal deforestation, mining, and water pollution using satellite imagery, machine learning, and real-time environmental monitoring.**

TerraWatch transforms Earth observation data into actionable intelligence for environmental agencies, researchers, and conservation teams. By combining AI, satellite imagery, geospatial analytics, and real-time event streaming, TerraWatch automatically detects environmental threats, generates legal-ready evidence, and delivers instant alerts to enable faster response.

Built as a distributed microservice platform, TerraWatch integrates a modern Next.js command center, Apache Kafka event streaming, Python AI services, and geospatial technologies to provide continuous environmental surveillance and historical intelligence.

---

# 🚀 Key Features

### 🌍 Global Monitoring Dashboard
- Interactive command-center interface
- Live environmental threat visualization
- Real-time statistics & analytics
- Multi-layer satellite map visualization

### 🛰️ AI Satellite Analysis
- Sentinel-2 satellite imagery processing
- AI-powered environmental analysis
- Automatic detection of:
  - Illegal Deforestation
  - Illegal Mining
  - Water Pollution
- Confidence scoring for every detection

### 📊 Historical Change Analysis
- Compare satellite imagery across multiple years
- Forest loss analysis
- Annual environmental trends
- AI-generated environmental assessment reports

### 📡 Surveillance Zones
- Draw custom monitoring zones
- Interactive GIS mapping
- Schedule automated monitoring campaigns
- Manual AI scans on demand

### 🚨 Real-Time Alert System
- Apache Kafka powered event streaming
- Live WebSocket updates
- Instant environmental alerts
- Severity-based threat classification

### 📄 Legal Evidence Generation
- Automatic PDF evidence reports
- GPS coordinates
- Satellite imagery snapshots
- Carbon loss estimation
- Environmental impact statistics
- Court-ready documentation

### 📱 Ranger & Citizen Portal
- Mobile-first field reporting
- GPS-enabled evidence upload
- AI validation of submitted photos
- Ground truth verification

### 🌱 Environmental Analytics
- Carbon emission estimation
- Forest cover statistics
- Environmental impact assessment
- Threat heatmaps
- Zone-based monitoring

### 🔐 Enterprise Security
- JWT Authentication
- Role-Based Access Control
- Admin, Analyst & Ranger roles
- Secure API architecture

---

# 🏗️ System Architecture

TerraWatch follows a distributed microservice architecture where independent services communicate through REST APIs and Apache Kafka.

```
                  Satellite Images
                (Sentinel-2 Archive)
                         │
                         ▼
                 Python AI Service
            (Qwen2-VL + NDVI Analysis)
                         │
                  Apache Kafka
                         │
                         ▼
                Node.js API Backend
        Authentication • Alerts • Reports
             │                 │
             │                 ▼
             │          Email / Notifications
             │
             ▼
          MongoDB
             │
             ▼
      Next.js Command Center
```

---

# 🛠 Tech Stack

## Frontend (`/ecowatch`)

| Technology | Purpose |
|------------|---------|
| Next.js 15 | Frontend Framework |
| React 19 | UI Development |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| React Leaflet | GIS Mapping |
| Mapbox GL | Advanced Maps |
| Three.js | 3D Visualizations |
| React Three Fiber | 3D Rendering |
| Recharts | Analytics |
| Socket.IO Client | Real-time Updates |

---

## Backend (`/node-service`)

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | ODM |
| KafkaJS | Event Streaming |
| JWT | Authentication |
| Multer | File Upload |
| PDFKit | Evidence Reports |
| Node Cron | Monitoring Scheduler |

---

## AI Service (`/ml-service`)

| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Runtime |
| FastAPI | ML API |
| PyTorch | Deep Learning |
| Transformers | AI Models |
| Qwen2-VL | Vision Language Model |
| HuggingFace | Model Hosting |
| Raster Processing | Satellite Data |
| NDVI Analysis | Vegetation Detection |

---

## Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Service Orchestration |
| Apache Kafka | Event Streaming |
| Zookeeper | Kafka Coordination |
| MongoDB | Database |

---

# 📂 Project Structure

```
TerraWatch
│
├── ecowatch/              # Next.js Frontend
│
├── node-service/          # Express Backend
│
├── ml-service/            # FastAPI AI Service
│
├── docker-compose.yml
│
├── docs/
│
└── README.md
```

---

# ⚙️ Getting Started

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop
- Git
- MongoDB (Docker)
- Apache Kafka (Docker)
- Sentinel Hub Account
- HuggingFace Access Token

---

## 1️⃣ Clone Repository

```bash
git clone https://github.com/<your-username>/TerraWatch.git

cd TerraWatch
```

---

## 2️⃣ Start Infrastructure

```bash
docker compose up -d
```

This starts:

- MongoDB
- Apache Kafka
- Zookeeper

---

## 3️⃣ Start Backend

```bash
cd node-service

npm install

npm run dev
```

Runs on

```
http://localhost:5000
```

---

## 4️⃣ Start AI Service

```bash
cd ml-service

python -m venv .venv
```

Windows

```bash
.venv\Scripts\activate
```

Linux / macOS

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run

```bash
uvicorn api.app:app --host 0.0.0.0 --port 8001
```

Runs on

```
http://localhost:8001
```

---

## 5️⃣ Start Frontend

```bash
cd ecowatch

npm install

npm run dev
```

Runs on

```
http://localhost:3000
```

---

# 🔐 Environment Variables

## `/node-service/.env`

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/terrawatch

JWT_SECRET=<your-secret>

KAFKA_BROKER=localhost:9092

ML_SERVICE_URL=http://localhost:8001

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-app-password>
```

---

## `/ml-service/.env`

```env
KAFKA_BROKER=localhost:9092

KAFKA_GROUP=ml-workers

SH_CLIENT_ID=<your-client-id>

SH_CLIENT_SECRET=<your-client-secret>

HF_TOKEN=<your-huggingface-token>

MODEL_NAME=Qwen/Qwen2-VL-2B-Instruct

LOG_LEVEL=INFO
```

---

# 📡 Core Workflow

```
Satellite Image
        │
        ▼
AI Detection
(Qwen2-VL + NDVI)
        │
        ▼
Threat Classification
        │
        ▼
Kafka Event Queue
        │
        ▼
Backend Processing
        │
 ┌──────┴─────────┐
 ▼                ▼
MongoDB       Notifications
        │
        ▼
 Dashboard
        │
        ▼
Evidence PDF
```

---

# 🚀 Roadmap

### Phase 1
- ✅ AI Detection Pipeline
- ✅ Satellite Monitoring
- ✅ Dashboard
- ✅ Evidence Reports

### Phase 2
- Citizen Reporting
- Multi-Zone Monitoring
- Advanced Analytics
- Historical Intelligence

### Phase 3
- Sentinel-1 SAR Integration
- Drone Imagery Support
- Mobile Ranger App
- Government GIS Integration

### Phase 4
- Predictive Environmental Risk
- Multi-State Monitoring
- Multi-Country Expansion
- Advanced AI Models

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit changes

```bash
git commit -m "Add amazing feature"
```

4. Push

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

---

# 👥 Team

**Team Tarkik**

- Nikhil Yadav
- Dheeraj Patel
- Madhvi Sisodiya
- Sourabh Meena
- Bhavya Jain
- Suyash

---

# 📄 License

This project was developed as part of **Hackathon 2026** under the **Space Technology** domain.

---

# ⭐ Support

If you found this project interesting, consider giving it a ⭐ on GitHub!

Together, we can leverage AI and satellite intelligence to protect our planet. 🌍🛰️
