-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Role-based access control for 'admin' and 'officer' roles
-- ==============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user role from auth.users
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. PROFILES POLICIES
-- Admins can view and update all profiles
CREATE POLICY "Admins full access on profiles"
    ON public.profiles
    FOR ALL
    USING (public.get_user_role() = 'admin');

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 2. OFFICERS POLICIES
-- Admins have full access
CREATE POLICY "Admins full access on officers"
    ON public.officers
    FOR ALL
    USING (public.get_user_role() = 'admin');

-- Officers can view active officers in their station
CREATE POLICY "Officers can view active officers"
    ON public.officers
    FOR SELECT
    USING (public.get_user_role() IN ('admin', 'officer'));

-- 3. VEHICLES POLICIES
-- Both admin and officers need to look up registration details
CREATE POLICY "Authorized personnel can view vehicles"
    ON public.vehicles
    FOR SELECT
    USING (public.get_user_role() IN ('admin', 'officer'));

-- Only admins or system backend can insert/update vehicle registry
CREATE POLICY "Admins can modify vehicles"
    ON public.vehicles
    FOR ALL
    USING (public.get_user_role() = 'admin');

-- 4. VIOLATIONS POLICIES
-- Admins can view and modify all violations
CREATE POLICY "Admins full access on violations"
    ON public.violations
    FOR ALL
    USING (public.get_user_role() = 'admin');

-- Officers can view violations they booked
CREATE POLICY "Officers can view own violations"
    ON public.violations
    FOR SELECT
    USING (
        public.get_user_role() = 'officer' 
        AND officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
    );

-- Officers can insert new violations
CREATE POLICY "Officers can insert violations"
    ON public.violations
    FOR INSERT
    WITH CHECK (
        public.get_user_role() = 'officer'
        AND officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
    );

-- Officers can update pending violations they booked (e.g., adding remarks before final submission)
CREATE POLICY "Officers can update own pending violations"
    ON public.violations
    FOR UPDATE
    USING (
        public.get_user_role() = 'officer'
        AND status = 'Pending Review'
        AND officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
    );

-- 5. AI DETECTIONS POLICIES
CREATE POLICY "Admins full access on ai_detections"
    ON public.ai_detections
    FOR ALL
    USING (public.get_user_role() = 'admin');

CREATE POLICY "Officers view detections for their cases"
    ON public.ai_detections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.violations v
            WHERE v.id = ai_detections.violation_id
            AND v.officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
        )
    );

-- 6. EVIDENCE POLICIES
CREATE POLICY "Admins full access on evidence"
    ON public.evidence
    FOR ALL
    USING (public.get_user_role() = 'admin');

CREATE POLICY "Officers view evidence for their cases"
    ON public.evidence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.violations v
            WHERE v.id = evidence.violation_id
            AND v.officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
        )
    );

CREATE POLICY "Officers insert evidence"
    ON public.evidence
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.violations v
            WHERE v.id = evidence.violation_id
            AND v.officer_id IN (SELECT id FROM public.officers WHERE profile_id = auth.uid())
        )
    );
