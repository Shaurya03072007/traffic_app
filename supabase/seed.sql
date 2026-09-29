-- ==============================================================================
-- SUPABASE SEED DATA (TRAFFICWATCH DEMO & TEST SUITE)
-- Seed accounts, Indian vehicle registrations, violation records & AI detections
-- ==============================================================================

-- 1. Create Mock Admin & Officer Profiles (Assumes auth.users entries or standalone demo usage)
-- Note: In production Supabase, UUIDs correspond to auth.users.id
DO $$
DECLARE
    admin_uuid UUID := 'a0000000-0000-0000-0000-000000000001';
    officer1_uuid UUID := 'b0000000-0000-0000-0000-000000000002';
    officer2_uuid UUID := 'c0000000-0000-0000-0000-000000000003';
    officer1_id UUID := 'd0000000-0000-0000-0000-000000000001';
    officer2_id UUID := 'e0000000-0000-0000-0000-000000000002';
    v1_id UUID := 'f0000000-0000-0000-0000-000000000001';
    v2_id UUID := 'f0000000-0000-0000-0000-000000000002';
    v3_id UUID := 'f0000000-0000-0000-0000-000000000003';
    v4_id UUID := 'f0000000-0000-0000-0000-000000000004';
    v5_id UUID := 'f0000000-0000-0000-0000-000000000005';
BEGIN

    -- Insert Profiles
    INSERT INTO public.profiles (id, email, full_name, role, badge_number, department, phone)
    VALUES 
    (admin_uuid, 'admin@trafficpolice.gov.in', 'ACP R. K. Deshmukh', 'admin', 'ACP-7701', 'HQ Traffic Management & Enforcement', '+91 98490 11223'),
    (officer1_uuid, 'officer.sharma@trafficpolice.gov.in', 'Sub-Inspector Vikram Sharma', 'officer', 'SI-4421', 'Cyberabad Traffic Police', '+91 94401 55432'),
    (officer2_uuid, 'officer.verma@trafficpolice.gov.in', 'Head Constable Priya Verma', 'officer', 'HC-8819', 'Madhapur Zone Enforcement', '+91 99882 33441')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Officers
    INSERT INTO public.officers (id, profile_id, badge_number, name, station, zone, phone)
    VALUES
    (officer1_id, officer1_uuid, 'SI-4421', 'Sub-Inspector Vikram Sharma', 'Cyberabad Traffic Station', 'West Zone', '+91 94401 55432'),
    (officer2_id, officer2_uuid, 'HC-8819', 'Head Constable Priya Verma', 'Madhapur Traffic Outpost', 'Hitech City Corridor', '+91 99882 33441')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Registered Vehicles (Indian format)
    INSERT INTO public.vehicles (vehicle_number, vehicle_type, owner_name, owner_phone, registration_status, insurance_valid_until, puc_valid_until)
    VALUES
    ('TS09EA4412', 'Motorcycle', 'Rajesh Kumar Reddy', '+91 98765 43210', 'Active', '2027-05-14', '2026-11-20'),
    ('TS07JH8821', 'Scooter', 'Sunita Sundaram', '+91 91234 56780', 'Active', '2026-12-01', '2026-10-15'),
    ('DL04BC8921', 'Motorcycle', 'Manish Gupta', '+91 97112 34567', 'Suspended', '2025-08-10', '2025-09-01'),
    ('KA05EQ7714', 'Motorcycle', 'Kiran Narayan', '+91 94800 12345', 'Active', '2028-01-30', '2027-02-14'),
    ('MH12TR3321', 'Motorcycle', 'Aditya Joshi', '+91 98220 99881', 'Active', '2027-04-18', '2026-12-25'),
    ('AP28BK9001', 'Car', 'Venkat Rao', '+91 99490 88771', 'Active', '2026-09-30', '2026-10-01')
    ON CONFLICT (vehicle_number) DO NOTHING;

    -- Insert Violations
    INSERT INTO public.violations (
        id, case_number, officer_id, vehicle_number, location, latitude, longitude,
        timestamp, helmet_violation, triple_riding, ai_confidence,
        minor_riding, no_license, drunk_driving, status, fine_amount, challan_due_date,
        evidence_video_url, evidence_image_url, officer_remarks
    )
    VALUES
    (
        v1_id, 'TRF-2026-000101', officer1_id, 'TS09EA4412', 
        'Cyber Towers Junction, Hitech City, Hyderabad', 17.4504, 78.3808,
        NOW() - INTERVAL '2 hours', TRUE, FALSE, 0.94,
        FALSE, FALSE, FALSE, 'Challan Generated', 1000, CURRENT_DATE + 30,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
        'Rider was proceeding towards Mindspace without protective headgear. Captured on high-definition patrol bodycam.'
    ),
    (
        v2_id, 'TRF-2026-000102', officer1_id, 'TS07JH8821', 
        'Inorbit Mall Crossroads, Madhapur, Hyderabad', 17.4359, 78.3867,
        NOW() - INTERVAL '5 hours', TRUE, TRUE, 0.91,
        TRUE, TRUE, FALSE, 'Pending Review', 3500, CURRENT_DATE + 30,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
        'Three youths observed on two-wheeler at high speed. Driver appears underage without driving licence.'
    ),
    (
        v3_id, 'TRF-2026-000103', officer2_id, 'DL04BC8921', 
        'Kukatpally Y-Junction, NH-65, Hyderabad', 17.4875, 78.4116,
        NOW() - INTERVAL '1 day', FALSE, TRUE, 0.88,
        FALSE, FALSE, TRUE, 'Challan Generated', 12000, CURRENT_DATE + 15,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
        'Three passengers on vehicle. Driver stopped at checkpoint; breathalyzer test recorded BAC 68mg/100ml. Vehicle impounded.'
    ),
    (
        v4_id, 'TRF-2026-000104', officer2_id, 'KA05EQ7714', 
        'Gachibowli Outer Ring Road Entry, Hyderabad', 17.4401, 78.3489,
        NOW() - INTERVAL '1 day 4 hours', TRUE, FALSE, 0.96,
        FALSE, FALSE, FALSE, 'Fine Paid', 1000, CURRENT_DATE + 20,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800&q=80',
        'Pillion and rider both without standard BIS helmets.'
    ),
    (
        v5_id, 'TRF-2026-000105', officer1_id, 'MH12TR3321', 
        'Bio-Diversity Park Circle, Old Mumbai Highway', 17.4298, 78.3789,
        NOW() - INTERVAL '2 days', TRUE, TRUE, 0.92,
        FALSE, TRUE, FALSE, 'Pending Review', 3000, CURRENT_DATE + 30,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80',
        'Multiple riders without safety helmets. Vehicle was not carrying original registration or insurance documents.'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert AI Detections Telemetry
    INSERT INTO public.ai_detections (violation_id, detection_type, confidence, bounding_box, frame_number, timestamp_in_video, model_name)
    VALUES
    (v1_id, 'helmet_violation', 0.94, '{"x": 142, "y": 88, "width": 86, "height": 92}', 45, 1.5, 'YOLOv8-TrafficCustom-v1.2'),
    (v1_id, 'motorcycle', 0.97, '{"x": 110, "y": 120, "width": 180, "height": 260}', 45, 1.5, 'YOLOv8-TrafficCustom-v1.2'),
    (v2_id, 'triple_riding', 0.91, '{"x": 90, "y": 70, "width": 240, "height": 310}', 82, 2.7, 'YOLOv8-TrafficCustom-v1.2'),
    (v2_id, 'helmet_violation', 0.93, '{"x": 105, "y": 60, "width": 60, "height": 70}', 82, 2.7, 'YOLOv8-TrafficCustom-v1.2'),
    (v3_id, 'triple_riding', 0.88, '{"x": 80, "y": 75, "width": 260, "height": 320}', 110, 3.6, 'YOLOv8-TrafficCustom-v1.2')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Evidence records
    INSERT INTO public.evidence (violation_id, storage_path, file_type, file_size_bytes)
    VALUES
    (v1_id, 'evidence/2026/09/TRF-2026-000101/video.mp4', 'video/mp4', 14200000),
    (v1_id, 'evidence/2026/09/TRF-2026-000101/frame_045.jpg', 'image/jpeg', 480000),
    (v2_id, 'evidence/2026/09/TRF-2026-000102/video.mp4', 'video/mp4', 18900000),
    (v2_id, 'evidence/2026/09/TRF-2026-000102/frame_082.jpg', 'image/jpeg', 520000)
    ON CONFLICT (id) DO NOTHING;

END $$;
