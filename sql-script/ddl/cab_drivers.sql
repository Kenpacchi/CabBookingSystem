CREATE TABLE cab_drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    mobile_number VARCHAR(20),
    vehicle_id BIGINT,
    is_available BOOLEAN,
    accept BOOLEAN,
    x INTEGER,
    y INTEGER
);