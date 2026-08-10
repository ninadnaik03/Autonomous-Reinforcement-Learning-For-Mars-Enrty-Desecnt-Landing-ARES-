from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable
import math
import uuid

import numpy as np

from atmosphere import mars_density
from constants import (
    CD_BODY, CD_CHUTE, CHUTE_AREA, DRY_MASS, DT_PHYSICS, FUEL_MASS,
    MARS_GRAVITY, MAX_THRUST, REFERENCE_AREA, SAFE_LANDING_VEL,
    SAFE_LANDING_VX,
)
from mars_edl_env import ENTRY_AEROSHELL_AREA, MarsDeepSpaceEnv
from backend.schemas import MissionConfig


ROOT = Path(__file__).resolve().parents[1]
MODEL_CANDIDATES = [
    ROOT / "inator_edl_staged_landing_v2.zip",
    ROOT / "inator_edl_fresh_run_v1.zip",
    ROOT / "inator_orbital_final_legend.zip",
]
STATS_CANDIDATES = [
    ROOT / "vec_normalize_edl_staged_v2.pkl",
    ROOT / "vec_normalize_edl_fresh_v1.pkl",
    ROOT / "vec_normalize_final.pkl",
]


def policy_status() -> dict:
    model = next((p for p in MODEL_CANDIDATES if p.exists()), None)
    stats = next((p for p in STATS_CANDIDATES if p.exists()), None)
    return {
        "available": bool(model and stats),
        "mode": "ppo" if model and stats else "deterministic_fallback",
        "model": model.name if model else None,
        "normalization": stats.name if stats else None,
        "reason": None if model and stats else "No trained PPO checkpoint and matching VecNormalize statistics are committed.",
    }


def phase_for(env: MarsDeepSpaceEnv) -> str:
    if env.h <= 0:
        return "touchdown"
    if env.h <= 500:
        return "final_approach"
    if env.h <= 20_000:
        return "powered_descent"
    if env.chute_deployed > 0:
        return "parachute"
    if env.h <= 60_000:
        return "guided_entry"
    return "entry"


def _aero_forces(env: MarsDeepSpaceEnv) -> tuple[float, float, float]:
    rho = mars_density(env.h)
    speed = math.hypot(env.vx - env.wind, env.v)
    if env.h > 60_000:
        area = ENTRY_AEROSHELL_AREA
    elif env.h > 40_000:
        area = 0.6 * CHUTE_AREA
    elif env.h > 20_000:
        area = CHUTE_AREA
    else:
        area = REFERENCE_AREA
    cd = CD_CHUTE if area >= 0.5 * CHUTE_AREA else CD_BODY
    drag = 0.5 * rho * speed * speed * cd * area
    lift = 0.5 * rho * speed * speed * (1.2 if area > REFERENCE_AREA else 0.2) * area
    return float(rho), float(drag), float(lift)


def frame(env: MarsDeepSpaceEnv, reward: float, cumulative: float, previous_v: float | None) -> dict:
    rho, drag, lift = _aero_forces(env)
    speed = math.hypot(env.vx, env.v)
    acceleration = 0.0 if previous_v is None else (env.v - previous_v) / DT_PHYSICS
    heat_flux = 1e-4 * math.sqrt(max(rho, 0.0)) * speed ** 3
    return {
        "mission_time": round(env.steps * DT_PHYSICS, 2),
        "phase": phase_for(env),
        "altitude_m": round(max(env.h, 0.0), 3),
        "horizontal_velocity_ms": round(env.vx, 3),
        "vertical_velocity_ms": round(env.v, 3),
        "speed_ms": round(speed, 3),
        "mach": round(speed / 240.0, 3),
        "fuel_fraction": round(env.fuel / FUEL_MASS, 6),
        "heat_flux_kw_m2": round(heat_flux, 3),
        "g_load": round(abs(acceleration + MARS_GRAVITY) / 9.80665, 3),
        "atmospheric_density_kg_m3": round(rho, 8),
        "downrange_m": round(env.x, 3),
        "target_error_m": round(abs(env.x), 3),
        "position": {"x": round(env.x, 3), "y": round(max(env.h, 0.0), 3), "z": 0.0},
        "orientation": {"pitch": round(env.pitch, 5), "yaw": 0.0, "roll": round(env.last_tilt, 5)},
        "action": {
            "policy_thrust_command": round(float(env.last_action[0]), 5),
            "policy_tilt_command": round(float(env.last_action[1]), 5),
            "applied_throttle": round(env.last_thrust / MAX_THRUST, 5),
            "applied_tilt_rad": round(env.last_tilt, 5),
        },
        "forces_n": {"gravity": round((DRY_MASS + env.fuel) * MARS_GRAVITY, 2), "drag": round(drag, 2), "lift": round(lift, 2), "thrust": round(env.last_thrust, 2)},
        "reward": round(float(reward), 4),
        "cumulative_reward": round(float(cumulative), 4),
    }


def deterministic_action(env: MarsDeepSpaceEnv) -> np.ndarray:
    """Fallback only. The environment's staged guidance remains the applied controller."""
    horizontal = float(np.clip(-env.vx / 100.0, -1.0, 1.0))
    return np.array([0.0, horizontal], dtype=np.float32)


def run_mission(config: MissionConfig, callback: Callable[[dict], None] | None = None) -> tuple[list[dict], dict]:
    policy = policy_status()
    vec_env = None
    model = None
    if policy["available"]:
        from stable_baselines3 import PPO
        from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

        raw_env = DummyVecEnv([lambda: MarsDeepSpaceEnv(config.model_dump())])
        raw_env.seed(config.seed)
        vec_env = VecNormalize.load(str(ROOT / policy["normalization"]), raw_env)
        vec_env.training = False
        vec_env.norm_reward = False
        model = PPO.load(str(ROOT / policy["model"]), env=vec_env)
        observation = vec_env.reset()
        env = raw_env.envs[0]
    else:
        env = MarsDeepSpaceEnv(config.model_dump())
        observation, _ = env.reset(seed=config.seed)
    telemetry: list[dict] = []
    cumulative = 0.0
    previous_v = None
    done = False
    truncated = False
    while not (done or truncated):
        if model is not None and vec_env is not None:
            action, _ = model.predict(observation, deterministic=True)
            observation, rewards, dones, _ = vec_env.step(action)
            reward = float(rewards[0])
            done = bool(dones[0])
            truncated = False
        else:
            action = deterministic_action(env)
            observation, reward, done, truncated, _ = env.step(action)
        cumulative += reward
        if env.steps % 10 == 0 or done or truncated:
            item = frame(env, reward, cumulative, previous_v)
            telemetry.append(item)
            if callback:
                callback(item)
        previous_v = env.v
    last = telemetry[-1]
    success = env.h <= 0 and abs(env.v) < SAFE_LANDING_VEL and abs(env.vx) < SAFE_LANDING_VX
    report = {
        "status": "success" if success else "failure",
        "failure_reason": None if success else ("excessive_touchdown_velocity" if env.h <= 0 else "simulation_aborted"),
        "guidance_mode": policy["mode"],
        "landing_error_m": last["target_error_m"],
        "touchdown_velocity_ms": last["speed_ms"],
        "vertical_velocity_ms": last["vertical_velocity_ms"],
        "fuel_remaining_fraction": last["fuel_fraction"],
        "peak_heat_flux_kw_m2": max(x["heat_flux_kw_m2"] for x in telemetry),
        "peak_g_load": max(x["g_load"] for x in telemetry),
        "max_mach": max(x["mach"] for x in telemetry),
        "flight_duration_s": last["mission_time"],
        "cumulative_reward": last["cumulative_reward"],
    }
    return telemetry, report


@dataclass
class MissionRecord:
    id: str
    config: MissionConfig
    status: str = "queued"
    telemetry: list[dict] = field(default_factory=list)
    report: dict | None = None
    error: str | None = None

    @classmethod
    def create(cls, config: MissionConfig) -> "MissionRecord":
        return cls(id=f"EDL-{uuid.uuid4().hex[:6].upper()}", config=config)
