CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sensor_nodes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL,
    battery_level DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hydro_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(50) REFERENCES sensor_nodes(id),
    water_level_cm DOUBLE PRECISION NOT NULL,
    rainfall_rate_mm DOUBLE PRECISION NOT NULL,
    flood_probability DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hydro_logs_timestamp ON hydro_logs(timestamp DESC);
