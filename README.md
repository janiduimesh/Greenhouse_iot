# Greenhouse IoT

A greenhouse IoT project with a **FastAPI** backend and a **React** monitoring dashboard (mock data; ready to connect to an IoT server later).

## Tech stack

**Backend (API)**
- Python 3.11+
- FastAPI, Uvicorn, Pydantic, python-dotenv, asyncpg (for future use)

**Frontend (Dashboard)**
- Node.js 18+
- React 19, Vite, Tailwind CSS, Recharts, React Router

## Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** and npm (frontend dashboard)
- (Optional) PostgreSQL for future backend features

---

## Backend setup and run

1. **Clone the repo**
   ```bash
   git clone <repository-url>
   cd Greenhouse_iot
   ```

2. **Create and activate a virtual environment**
   ```powershell
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   ```bash
   # macOS / Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the API** (from project root)
   ```bash
   python -m uvicorn src.app:app --host 0.0.0.0 --port 8002 --reload
   ```
   - API: http://localhost:8002  
   - Docs: http://localhost:8002/docs  

---

## Frontend (dashboard) setup and run

1. **From the project root, go to the dashboard**
   ```bash
   cd dashboard
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   - Dashboard: http://localhost:5173 (or the URL shown in the terminal)

4. **Other commands**
   ```bash
   npm run build    # production build
   npm run preview  # preview production build locally
   ```

The dashboard uses **mock data** only. When the IoT server is ready, replace the mock module with API calls that return the same data shape.

---

## Project structure

```
Greenhouse_iot/
├── src/                    # FastAPI backend
│   ├── app.py
│   ├── routes/
│   ├── schema/
│   ├── services/
│   ├── utils/
│   └── jobs/
├── dashboard/              # React frontend (Smart Greenhouse Monitoring Dashboard)
│   ├── src/
│   │   ├── components/      # Header, DashboardCard, charts, AlertList, DeviceStatus
│   │   ├── pages/          # Dashboard, History, Settings, Reports
│   │   ├── data/           # mockReadings.js (replace with API later)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── requirements.txt
├── .env                    # Optional; not committed
├── .gitignore
└── README.md
```

---

## License

MIT (or your chosen license)
