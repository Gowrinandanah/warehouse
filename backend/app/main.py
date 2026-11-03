import os
import json
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .database import database_session, initialize_database
from .schemas import (
    LoginRequest,
    RegisterRequest,
    SimulationRunRequest,
    UserResponse,
    WarehouseLayoutRequest,
)
from .security import (
    create_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)

SESSION_COOKIE = "warehouse_session"
SESSION_LIFETIME = 7 * 24 * 60 * 60
COOKIE_SECURE = os.environ.get("WAREHOUSE_COOKIE_SECURE", "false").lower() == "true"
DUMMY_PASSWORD_HASH = hash_password("invalid-login-padding")


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Warehouse Digital Twin API", lifespan=lifespan)
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "WAREHOUSE_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def issue_session(response: Response, user_id: str) -> None:
    token = create_session_token()
    expires_at = int(time.time()) + SESSION_LIFETIME
    with database_session() as connection:
        connection.execute(
            "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hash_session_token(token), user_id, expires_at),
        )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_LIFETIME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def get_session_user(token: str | None) -> UserResponse:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in."
        )
    now = int(time.time())
    with database_session() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.email, users.full_name
            FROM auth_sessions
            JOIN users ON users.id = auth_sessions.user_id
            WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
            """,
            (hash_session_token(token), now),
        ).fetchone()
        connection.execute(
            "DELETE FROM auth_sessions WHERE expires_at <= ?", (now,)
        )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
        )
    return UserResponse(**dict(row))


def require_session_user(request: Request) -> UserResponse:
    return get_session_user(request.cookies.get(SESSION_COOKIE))


@app.post("/api/auth/register", response_model=UserResponse, status_code=201)
def register(payload: RegisterRequest, response: Response) -> UserResponse:
    user_id = secrets.token_urlsafe(16)
    password_hash = hash_password(payload.password)
    try:
        with database_session() as connection:
            connection.execute(
                """
                INSERT INTO users (id, email, full_name, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, payload.email, payload.full_name, password_hash, int(time.time())),
            )
    except sqlite3.IntegrityError as error:
        if "users.email" in str(error).lower() or "unique" in str(error).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from error
        raise
    issue_session(response, user_id)
    return UserResponse(id=user_id, email=payload.email, full_name=payload.full_name)


@app.post("/api/auth/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response) -> UserResponse:
    with database_session() as connection:
        row = connection.execute(
            "SELECT id, email, full_name, password_hash FROM users WHERE email = ?",
            (payload.email,),
        ).fetchone()
    password_hash = row["password_hash"] if row is not None else DUMMY_PASSWORD_HASH
    password_is_valid = verify_password(payload.password, password_hash)
    if row is None or not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    issue_session(response, row["id"])
    return UserResponse(id=row["id"], email=row["email"], full_name=row["full_name"])


@app.get("/api/auth/me", response_model=UserResponse)
def current_user(request: Request) -> UserResponse:
    return get_session_user(request.cookies.get(SESSION_COOKIE))


@app.post("/api/auth/logout", status_code=204)
def logout(request: Request, response: Response) -> Response:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with database_session() as connection:
            connection.execute(
                "DELETE FROM auth_sessions WHERE token_hash = ?",
                (hash_session_token(token),),
            )
    response.delete_cookie(
        key=SESSION_COOKIE, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/"
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/layouts")
def list_layouts(request: Request) -> list[dict]:
    user = require_session_user(request)
    with database_session() as connection:
        rows = connection.execute(
            """
            SELECT id, name, data, is_draft, updated_at
            FROM warehouse_layouts
            WHERE user_id = ?
            ORDER BY is_draft DESC, updated_at DESC
            """,
            (user.id,),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "data": json.loads(row["data"]),
            "is_draft": bool(row["is_draft"]),
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


@app.put("/api/layouts/draft")
def save_layout_draft(payload: WarehouseLayoutRequest, request: Request) -> dict:
    user = require_session_user(request)
    now = int(time.time())
    with database_session() as connection:
        existing = connection.execute(
            "SELECT id FROM warehouse_layouts WHERE user_id = ? AND is_draft = 1",
            (user.id,),
        ).fetchone()
        layout_id = existing["id"] if existing else secrets.token_urlsafe(16)
        connection.execute(
            """
            INSERT INTO warehouse_layouts (id, user_id, name, data, is_draft, updated_at)
            VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                data = excluded.data,
                updated_at = excluded.updated_at
            WHERE warehouse_layouts.user_id = excluded.user_id
            """,
            (layout_id, user.id, payload.name, json.dumps(payload.data), now),
        )
    return {"id": layout_id, "name": payload.name, "is_draft": True, "updated_at": now}


@app.post("/api/layouts")
def save_layout(payload: WarehouseLayoutRequest, request: Request) -> dict:
    user = require_session_user(request)
    now = int(time.time())
    layout_id = payload.id or secrets.token_urlsafe(16)
    with database_session() as connection:
        if payload.id:
            updated = connection.execute(
                """
                UPDATE warehouse_layouts
                SET name = ?, data = ?, is_draft = 0, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (payload.name, json.dumps(payload.data), now, layout_id, user.id),
            )
            if updated.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Layout not found.",
                )
        else:
            connection.execute(
                """
                INSERT INTO warehouse_layouts (id, user_id, name, data, is_draft, updated_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (layout_id, user.id, payload.name, json.dumps(payload.data), now),
            )
    return {"id": layout_id, "name": payload.name, "is_draft": False, "updated_at": now}


@app.delete("/api/layouts/{layout_id}", status_code=204)
def delete_layout(layout_id: str, request: Request, response: Response) -> Response:
    user = require_session_user(request)
    with database_session() as connection:
        connection.execute(
            "DELETE FROM warehouse_layouts WHERE id = ? AND user_id = ? AND is_draft = 0",
            (layout_id, user.id),
        )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/simulation-runs")
def list_simulation_runs(request: Request) -> list[dict]:
    user = require_session_user(request)
    with database_session() as connection:
        rows = connection.execute(
            """
            SELECT id, warehouse_layout_id, warehouse_name, layout_name,
                   layout_data, plan_data, settings_data, result_data, created_at
            FROM simulation_runs
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (user.id,),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "warehouse_layout_id": row["warehouse_layout_id"],
            "warehouse_name": row["warehouse_name"],
            "layout_name": row["layout_name"],
            "layout": json.loads(row["layout_data"]),
            "plan": json.loads(row["plan_data"]) if row["plan_data"] else None,
            "settings": json.loads(row["settings_data"]),
            "result": json.loads(row["result_data"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


@app.post("/api/simulation-runs", status_code=201)
def create_simulation_run(payload: SimulationRunRequest, request: Request) -> dict:
    user = require_session_user(request)
    with database_session() as connection:
        layout = connection.execute(
            """
            SELECT id FROM warehouse_layouts
            WHERE id = ? AND user_id = ? AND is_draft = 0
            """,
            (payload.warehouse_layout_id, user.id),
        ).fetchone()
        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved warehouse layout not found.",
            )
        run_id = secrets.token_urlsafe(16)
        created_at = int(time.time())
        connection.execute(
            """
            INSERT INTO simulation_runs (
                id, user_id, warehouse_layout_id, warehouse_name, layout_name,
                layout_data, plan_data, settings_data, result_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                user.id,
                payload.warehouse_layout_id,
                payload.warehouse_name,
                payload.layout_name,
                payload.layout.model_dump_json(),
                json.dumps(payload.plan) if payload.plan is not None else None,
                payload.settings.model_dump_json(),
                payload.result.model_dump_json(),
                created_at,
            ),
        )
    return {"id": run_id, "created_at": created_at}


@app.delete("/api/simulation-runs/{run_id}", status_code=204)
def delete_simulation_run(run_id: str, request: Request, response: Response) -> Response:
    user = require_session_user(request)
    with database_session() as connection:
        connection.execute(
            "DELETE FROM simulation_runs WHERE id = ? AND user_id = ?",
            (run_id, user.id),
        )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response