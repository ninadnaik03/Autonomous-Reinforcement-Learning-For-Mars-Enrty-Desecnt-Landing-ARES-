# ARES: Autonomous Reinforcement Learning for Mars Entry, Descent, and Landing

> **New:** ARES now includes a full Mission Control web application backed by the original Python environment. The UI does not synthesize telemetry; every displayed flight value is serialized from, or derived from, `MarsDeepSpaceEnv`.

<p align="center">
  <img src="https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/resources/detail_files/2/5/25489_1a-EDL-Graphic_Horizontal-Imperial-01-web.jpg?w=800&h=400&fit=clip&crop=faces%2Cfocalpoint" alt="Mars EDL Sequence" width="600"/>
  <br>
  <em>Simulation of full Mars EDL using RL for autonomous guidance</em>
</p>

<p align="center">
  <a href="https://github.com/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES/stargazers"><img src="https://img.shields.io/github/stars/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES"><img src="https://img.shields.io/github/forks/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES?style=social" alt="GitHub forks"></a>
  <img src="https://img.shields.io/badge/Python-3.8%2B-blue" alt="Python">
  <img src="https://img.shields.io/badge/Reinforcement%20Learning-PPO%20%7C%20SAC-orange" alt="RL">
</p>

**ARES** trains a deep reinforcement learning agent to autonomously guide a spacecraft through the complete **Mars Entry, Descent, and Landing (EDL)** sequence from hypersonic entry to soft powered touchdown, handling atmospheric uncertainties, fuel limits, and phase transitions for precise, efficient landings.

Inspired by NASA's Perseverance and Curiosity missions, but fully autonomous via RL instead of scripted guidance.

---

## Table of Contents

- [Project Highlights](#project-highlights)
- [Why RL for Mars EDL?](#why-rl-for-mars-edl)
- [EDL Phases Explained](#edl-phases-explained)
- [Visualizations](#visualizations)
- [Installation & Quick Start](#installation--quick-start)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing & License](#contributing--license)

---

## Project Highlights

- **Full EDL Simulation** — ~130 km entry to 0 m touchdown
- **Custom Gym Environment** — Continuous states/actions, realistic Mars physics
- **Modular RL Setup** — Ready for PPO, SAC, etc. via Stable-Baselines3 or custom
- **Visual Tools** — Trajectory plots, animations, live telemetry dashboard
- **Realism** — Variable atmosphere, wind, entry errors, fuel constraints

---

## Why RL for Mars EDL?

Mars EDL is the "7 minutes of terror": extreme speeds, thin air, no second chances. Traditional methods (bank modulation, fixed triggers, polynomial guidance) work but are brittle to uncertainties. RL learns adaptive policies that optimize across phases for better robustness and fuel efficiency — future-proof for human missions.

---

## EDL Phases Explained

The agent controls the vehicle continuously across three phases:

### 1. Guided Entry
**~130 km → ~10 km**  
High-speed hypersonic deceleration (Mach 30+ → Mach ~2).  
**Agent controls**: Bank angle / lift vector for range-to-target steering.  
**Key metrics**: Peak heat flux (~1200-1300 kW/m²), g-loads, downrange accuracy.  
**Plots show**: Curved high-alt arcs, high VX, fuel ~80-90%.

### 2. Parachute Descent
**~10 km → ~1-2 km**  
Supersonic chute deploy, heatshield sep, drag-dominated slowdown (~400 m/s → ~70 m/s).  
**Agent may optimize**: Deploy timing / attitude.  
**Plots show**: Near-vertical drop, low VX drift, fuel high (~70%).

### 3. Powered Descent
**~2 km → 0 m**  
Rockets ignite for velocity nulling, hover, precise touchdown (<3 m/s vertical).  
**Agent controls**: Thrust vector & magnitude.  
**Plots show**: Low-alt corrections (e.g., ALT 300-1300 m, VY ~ -1.5 m/s, VX tweaks), fuel drop to ~40-50%, final vertical plunge to zero error.


---

## Visualizations

<p align="center">
  <img src="images/finaltraj1.png" alt="Parachute Phase" width="400"/>
  <img src="images/finaltraj2.png" alt="Guidance Phase" width="400"/>
  <img src="images/touchdown.png" alt="Guidance Phase" width="400"/>
</p>

---

## Installation & Quick Start

```bash
# Clone & setup
git clone https://github.com/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES.git
cd Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES

# Virtual env
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps (add your exact ones to requirements.txt later)
pip install numpy scipy matplotlib torch gymnasium stable-baselines3
```

### Run ARES Mission Control

Mission Control loads `inator_edl_staged_landing_v2.zip` together with its matching `vec_normalize_edl_staged_v2.pkl` statistics and performs deterministic PPO inference. If either artifact is absent, the API reports that condition and safely falls back to the environment's staged controller; it never performs normalization-free PPO inference.

```bash
# Backend (terminal 1)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Web architecture

```text
React + Three.js → FastAPI → MarsDeepSpaceEnv
                              ├─ staged guidance / PPO hook
                              ├─ dynamics.py
                              └─ atmosphere.py
                    ← timestamped telemetry + report
```

API routes:

- `GET /api/health` and `GET /api/system/status`
- `POST /api/missions`
- `GET /api/missions/{id}`
- `WS /ws/missions/{id}`
- `GET /api/missions/{id}/telemetry`
- `GET /api/missions/{id}/report`

Set `VITE_API_URL` and `VITE_WS_URL` from `frontend/.env.example` for split frontend/backend deployments. Restrict CORS to your production frontend before public deployment.

### Scientific scope and limitations

ARES is a compact educational 2D EDL environment. It models an exponential atmosphere, aerodynamic lift/drag, fuel consumption, staged parachute area, powered braking, and continuous state/action spaces. It does not model 6-DOF flight, terrain-relative navigation, sensor noise, communications delay, detailed aerothermodynamics, winds aloft, hardware redundancy, or flight-certified constraints. Three.js effects and camera framing are illustrative; telemetry and mission outcome are not.

### Original visual asset

`frontend/public/ares-mars-hero.png` was generated specifically for this project and contains no third-party branding. The NASA-inspired notice is text-only and explicitly states non-affiliation.

### Validation

```bash
pytest backend/tests
cd frontend && npm run build
```

### Deployment

- Build the frontend with `npm run build` and deploy `frontend/dist` to Vercel, Cloudflare Pages, or another static host.
- Deploy the repository root as a Python service on Render, Railway, or Fly.io with `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
- Configure `VITE_API_URL` and `VITE_WS_URL` to the public backend origins, and update backend CORS for the final domain.

ARES is an independent research and educational project inspired by planetary exploration systems. It is not affiliated with or endorsed by NASA.
