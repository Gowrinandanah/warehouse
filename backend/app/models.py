CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
    ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS warehouse_layouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    is_draft INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warehouse_layouts_user_updated
    ON warehouse_layouts(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_layouts_one_draft_per_user
    ON warehouse_layouts(user_id) WHERE is_draft = 1;

CREATE TABLE IF NOT EXISTS simulation_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_layout_id TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    layout_name TEXT NOT NULL,
    layout_data TEXT NOT NULL,
    plan_data TEXT,
    settings_data TEXT NOT NULL,
    result_data TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_user_created
    ON simulation_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_layout_created
    ON simulation_runs(user_id, warehouse_layout_id, created_at DESC);
"""