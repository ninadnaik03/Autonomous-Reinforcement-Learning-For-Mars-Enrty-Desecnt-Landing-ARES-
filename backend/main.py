from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import MissionConfig, MissionCreated
from backend.simulation import MissionRecord, policy_status, run_mission


app = FastAPI(title="ARES Mission Control API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex=r"https://.*\.(vercel\.app|pages\.dev)$",
    allow_methods=["*"],
    allow_headers=["*"],
)
missions: dict[str, MissionRecord] = {}
executor = ThreadPoolExecutor(max_workers=2)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ares-mission-control"}


@app.get("/api/system/status")
def system_status():
    return {"simulation": "ready", "atmosphere": "ready", "dynamics": "ready", "telemetry": "ready", "policy": policy_status()}


@app.post("/api/missions", response_model=MissionCreated, status_code=201)
async def create_mission(config: MissionConfig):
    record = MissionRecord.create(config)
    missions[record.id] = record

    async def execute():
        record.status = "running"
        try:
            loop = asyncio.get_running_loop()
            telemetry, report = await loop.run_in_executor(executor, run_mission, config)
            record.telemetry = telemetry
            record.report = report
            record.status = "completed"
        except Exception as exc:  # mission faults never terminate the API
            record.error = str(exc)
            record.status = "mission_aborted"

    asyncio.create_task(execute())
    return MissionCreated(mission_id=record.id, status=record.status, guidance_mode=policy_status()["mode"])


def get_record(mission_id: str) -> MissionRecord:
    if mission_id not in missions:
        raise HTTPException(404, "Mission not found")
    return missions[mission_id]


@app.get("/api/missions/{mission_id}")
def mission(mission_id: str):
    record = get_record(mission_id)
    return {"mission_id": record.id, "status": record.status, "frames": len(record.telemetry), "error": record.error}


@app.get("/api/missions/{mission_id}/telemetry")
def mission_telemetry(mission_id: str):
    return get_record(mission_id).telemetry


@app.get("/api/missions/{mission_id}/report")
def mission_report(mission_id: str):
    record = get_record(mission_id)
    if not record.report:
        raise HTTPException(409, "Mission has not completed")
    return record.report


@app.websocket("/ws/missions/{mission_id}")
async def telemetry_socket(websocket: WebSocket, mission_id: str):
    await websocket.accept()
    try:
        record = missions.get(mission_id)
        if not record:
            await websocket.send_json({"type": "error", "message": "Mission not found"})
            return
        sent = 0
        while True:
            while sent < len(record.telemetry):
                await websocket.send_json({"type": "telemetry", "data": record.telemetry[sent]})
                sent += 1
            if record.status in {"completed", "mission_aborted"}:
                await websocket.send_json({"type": record.status, "report": record.report, "error": record.error})
                return
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        return
