import re

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a valid email address.")
        return email


class RegisterRequest(LoginRequest):
    full_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Enter your name.")
        return name


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str


class WarehouseLayoutRequest(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=100)
    data: dict

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Enter a layout name.")
        return name


class SimulationSettingsData(BaseModel):
    orders: int = Field(ge=1, le=5000)
    walkingSpeed: float = Field(gt=0, le=3)
    pickSeconds: float = Field(gt=0, le=300)


class SimulationMetricsData(BaseModel):
    totalDistance: float = Field(ge=0)
    averageDistance: float = Field(ge=0)
    completionMinutes: float = Field(ge=0)
    throughput: float = Field(ge=0)
    spaceUtilization: float = Field(ge=0, le=100)
    unreachableShelves: int = Field(ge=0)


class SimulationResultData(BaseModel):
    completedOrders: int = Field(ge=0, le=5000)
    visits: list[int] = Field(max_length=10000)
    metrics: SimulationMetricsData


class SimulationLayoutData(BaseModel):
    width: int = Field(ge=1, le=100)
    height: int = Field(ge=1, le=100)
    cells: list[Literal["empty", "shelf", "station", "obstacle"]] = Field(max_length=10000)
    metersPerCell: float | None = Field(default=None, gt=0)
    footprintPercent: float | None = Field(default=None, ge=0, le=100)

    @field_validator("cells")
    @classmethod
    def match_cell_count(cls, cells: list[str], info):
        width = info.data.get("width")
        height = info.data.get("height")
        if width is not None and height is not None and len(cells) != width * height:
            raise ValueError("Cell count must match the layout dimensions.")
        return cells


class SimulationRunRequest(BaseModel):
    warehouse_layout_id: str = Field(min_length=1, max_length=100)
    warehouse_name: str = Field(min_length=1, max_length=100)
    layout_name: str = Field(min_length=1, max_length=100)
    layout: SimulationLayoutData
    plan: dict | None = None
    settings: SimulationSettingsData
    result: SimulationResultData

    @field_validator("warehouse_name", "layout_name")
    @classmethod
    def normalize_run_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("A warehouse and layout name are required.")
        return name


class SimulationRunDeleteResponse(BaseModel):
    deleted: bool