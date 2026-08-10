from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas import MissionConfig
from backend.simulation import frame, policy_status, run_mission
from mars_edl_env import MarsDeepSpaceEnv

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_config_validation():
    assert client.post("/api/missions", json={"entry_altitude_m": 20}).status_code == 422


def test_simulation_and_serialization():
    telemetry, report = run_mission(MissionConfig(entry_altitude_m=100_000, seed=2))
    assert telemetry and telemetry[-1]["altitude_m"] == 0
    assert report["status"] in {"success", "failure"}
    assert isinstance(telemetry[0]["forces_n"]["gravity"], float)


def test_policy_status_is_honest():
    status = policy_status()
    assert status["mode"] in {"ppo", "deterministic_fallback"}
