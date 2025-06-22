CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('CAB', 'BIKE', 'AUTO')),
    vehicle_number VARCHAR(50) NOT NULL UNIQUE
);