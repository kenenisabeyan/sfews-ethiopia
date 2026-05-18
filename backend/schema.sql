CREATE TABLE IF NOT EXISTS sensor_nodes (
    node_id SERIAL PRIMARY KEY,
    node_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    battery_level INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hydro_logs (
    log_id BIGSERIAL PRIMARY KEY,
    node_id INT NOT NULL REFERENCES sensor_nodes(node_id),
    water_level_cm DECIMAL(10,2) NOT NULL,
    rainfall_rate_mm DECIMAL(10,2) NOT NULL,
    flood_probability DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_subscribers (
    subscriber_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    village_zone VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed Data for 5 Target Pilot Stations along the Awash River stretch
INSERT INTO sensor_nodes (node_name, latitude, longitude, status, battery_level)
VALUES 
    ('Awash Station Alpha', 8.9806, 38.7578, 'Active', 100),
    ('Awash Station Beta', 8.9754, 38.7621, 'Active', 95),
    ('Awash Station Gamma', 8.9701, 38.7680, 'Active', 88),
    ('Awash Station Delta', 8.9655, 38.7755, 'Active', 92),
    ('Awash Station Epsilon', 8.9602, 38.7820, 'Maintenance', 45);

-- Seed some alert subscribers
INSERT INTO alert_subscribers (full_name, phone_number, village_zone, is_active)
VALUES 
    ('Abebe Bekele', '+251911234567', 'Zone 1 - Riverside', TRUE),
    ('Tigist Haile', '+251922345678', 'Zone 2 - Valley', TRUE);
