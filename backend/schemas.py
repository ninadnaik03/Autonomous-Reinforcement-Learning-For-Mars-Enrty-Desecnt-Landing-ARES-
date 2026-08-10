from typing import Literal
from pydantic import BaseModel, Field


class MissionConfig(BaseModel):
    preset: Literal["nominal", "high_wind", "thin_atmosphere", "entry_error", "low_fuel"] = "nominal"
    seed: int = Field(default=7, ge=0, le=1_000_000)
    entry_altitude_m: float = Field(default=118_000, ge=100_000, le=130_000)
    vertical_velocity_ms: float = Field(default=-1_800, ge=-2_400, le=-1_200)
    horizontal_velocity_ms: float = Field(default=20, ge=-250, le=250)
    downrange_m: float = Field(default=2_000, ge=-10_000, le=10_000)
    wind_ms: float = Field(default=4, ge=-45, le=45)
    initial_fuel_kg: float = Field(default=9_000, ge=3_000, le=9_000)


class MissionCreated(BaseModel):
    mission_id: str
    status: str
    guidance_mode: str
