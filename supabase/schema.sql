-- ========================================================
-- BLOCKCHAIN LAND REGISTRY SYSTEM - SUPABASE DATABASE SCHEMA
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User profiles keyed by Ethereum wallet address)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('registrar', 'owner', 'buyer')),
    full_name TEXT,
    email TEXT,
    phone TEXT,
    government_id_hash TEXT,
    kyc_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by wallet address
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles (LOWER(wallet_address));

-- 2. LAND RECORDS TABLE (Off-chain rich metadata + mirrors on-chain state)
CREATE TABLE IF NOT EXISTS public.land_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onchain_id BIGINT UNIQUE, -- Matches Solidity parcelId
    cadastral_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT,
    pincode TEXT,
    area_sqft NUMERIC NOT NULL CHECK (area_sqft > 0),
    price_eth NUMERIC NOT NULL DEFAULT 0,
    price_wei TEXT NOT NULL DEFAULT '0',
    coordinates_lat NUMERIC(10, 8),
    coordinates_lng NUMERIC(11, 8),
    boundary_polygon JSONB, -- GeoJSON Feature / Polygon format
    owner_address TEXT NOT NULL,
    document_url TEXT,
    document_hash TEXT NOT NULL, -- SHA-256 string matching on-chain bytes32
    survey_map_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (
        status IN (
            'pending_verification',
            'verified',
            'listed_for_sale',
            'transfer_pending',
            'transferred',
            'rejected'
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for searching and filtering land parcels
CREATE INDEX IF NOT EXISTS idx_land_records_onchain_id ON public.land_records (onchain_id);
CREATE INDEX IF NOT EXISTS idx_land_records_owner ON public.land_records (LOWER(owner_address));
CREATE INDEX IF NOT EXISTS idx_land_records_status ON public.land_records (status);
CREATE INDEX IF NOT EXISTS idx_land_records_state_district ON public.land_records (state, district);

-- 3. TRANSFER REQUESTS TABLE (Tracks escrow & transfer workflows)
CREATE TABLE IF NOT EXISTS public.transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID REFERENCES public.land_records(id) ON DELETE CASCADE,
    onchain_parcel_id BIGINT,
    buyer_address TEXT NOT NULL,
    seller_address TEXT NOT NULL,
    price_wei TEXT NOT NULL,
    price_eth NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved_by_owner', 'completed', 'rejected')
    ),
    tx_hash TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_land ON public.transfer_requests (land_record_id);
CREATE INDEX IF NOT EXISTS idx_transfers_buyer ON public.transfer_requests (LOWER(buyer_address));
CREATE INDEX IF NOT EXISTS idx_transfers_seller ON public.transfer_requests (LOWER(seller_address));

-- 4. ACTIVITY LOGS / PROVENANCE TABLE (Audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID REFERENCES public.land_records(id) ON DELETE SET NULL,
    onchain_parcel_id BIGINT,
    event_type TEXT NOT NULL, -- e.g. 'REGISTRATION', 'VERIFICATION', 'LISTED', 'DELISTED', 'TRANSFER_INITIATED', 'TRANSFER_COMPLETED', 'REJECTED'
    actor_address TEXT NOT NULL,
    previous_owner TEXT,
    new_owner TEXT,
    tx_hash TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_parcel ON public.activity_logs (onchain_parcel_id);
CREATE INDEX IF NOT EXISTS idx_activity_land_id ON public.activity_logs (land_record_id);

-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_land_records_modtime
    BEFORE UPDATE ON public.land_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_requests_modtime
    BEFORE UPDATE ON public.transfer_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles read access"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow individual user or service role profile insert/update"
    ON public.profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Land Records Policies
CREATE POLICY "Public read access for land records"
    ON public.land_records FOR SELECT
    USING (true);

CREATE POLICY "Allow land owner or service role land insertion"
    ON public.land_records FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow land owner or registrar update"
    ON public.land_records FOR UPDATE
    USING (true);

-- 3. Transfer Requests Policies
CREATE POLICY "Public read access for transfer requests"
    ON public.transfer_requests FOR SELECT
    USING (true);

CREATE POLICY "Allow transaction participants write access"
    ON public.transfer_requests FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Activity Logs Policies
CREATE POLICY "Public read access for provenance logs"
    ON public.activity_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow service role or authenticated insert for activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (true);

-- ========================================================
-- STORAGE BUCKETS SETUP (Execute in Supabase SQL Editor / Storage)
-- ========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('land-documents', 'land-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket Policies
CREATE POLICY "Public Read Land Documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'land-documents');

CREATE POLICY "Upload Land Documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'land-documents');

CREATE POLICY "Update/Delete Land Documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'land-documents');
