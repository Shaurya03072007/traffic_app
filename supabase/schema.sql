-- ==============================================================================
-- TRAFFIC VIOLATION DETECTION & ENFORCEMENT MANAGEMENT SYSTEM (TRAFFICWATCH)
-- SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'officer')),
    badge_number VARCHAR(100),
    department VARCHAR(150) DEFAULT 'Traffic Enforcement Division',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. OFFICERS TABLE (Detailed field officer information)
CREATE TABLE IF NOT EXISTS public.officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_number VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    station VARCHAR(150) NOT NULL,
    zone VARCHAR(100) DEFAULT 'Central Traffic Zone',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. VEHICLES REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) DEFAULT 'Motorcycle' CHECK (vehicle_type IN ('Motorcycle', 'Scooter', 'Car', 'Auto Rickshaw', 'Bus', 'Truck')),
    owner_name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(20),
    owner_address TEXT,
    registration_status VARCHAR(50) DEFAULT 'Active' CHECK (registration_status IN ('Active', 'Suspended', 'Expired', 'Blacklisted')),
    insurance_valid_until DATE,
    puc_valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. VIOLATIONS TABLE (Central enforcement record)
CREATE TABLE IF NOT EXISTS public.violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(100) NOT NULL UNIQUE,
    officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- AI Visual Detections
    helmet_violation BOOLEAN DEFAULT FALSE,
    triple_riding BOOLEAN DEFAULT FALSE,
    ai_confidence DOUBLE PRECISION DEFAULT 0.0,
    
    -- Manual Officer Observations (Strictly human-entered)
    minor_riding BOOLEAN DEFAULT FALSE,
    no_license BOOLEAN DEFAULT FALSE,
    drunk_driving BOOLEAN DEFAULT FALSE,
    drunk_driving_notes TEXT,
    
    -- Status & Evidence
    status VARCHAR(50) DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Challan Generated', 'Fine Paid', 'Contested', 'Dismissed')),
    fine_amount INTEGER DEFAULT 0,
    challan_due_date DATE,
    evidence_video_url TEXT,
    evidence_image_url TEXT,
    officer_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. AI DETECTIONS LOG (Frame-level telemetry for audit and verification)
CREATE TABLE IF NOT EXISTS public.ai_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID REFERENCES public.violations(id) ON DELETE CASCADE,
    detection_type VARCHAR(100) NOT NULL, -- 'helmet_violation', 'triple_riding', 'motorcycle', 'rider'
    confidence DOUBLE PRECISION NOT NULL,
    bounding_box JSONB NOT NULL, -- { x, y, width, height }
    frame_number INTEGER NOT NULL,
    timestamp_in_video DOUBLE PRECISION NOT NULL, -- in seconds
    model_name VARCHAR(100) DEFAULT 'YOLOv8-TrafficCustom-v1.2',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. EVIDENCE ASSETS TABLE (Storage reference pointers)
CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID REFERENCES public.violations(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('video/mp4', 'image/jpeg', 'image/png')),
    file_size_bytes BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_violations_vehicle ON public.violations(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_violations_officer ON public.violations(officer_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON public.violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_timestamp ON public.violations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_detections_violation ON public.ai_detections(violation_id);

-- TRIGGER TO AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profiles_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER trigger_update_violations_timestamp
    BEFORE UPDATE ON public.violations
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
