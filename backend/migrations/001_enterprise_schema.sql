-- Enterprise Database Schema for TurboFCL
-- Production-grade PostgreSQL schema with comprehensive audit trails
-- Supports NISPOM compliance and FedRAMP requirements

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_audit";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Custom types for enterprise compliance
CREATE TYPE entity_type_enum AS ENUM (
    'C_CORPORATION',
    'S_CORPORATION', 
    'LLC_MEMBER_MANAGED',
    'LLC_MANAGER_MANAGED',
    'LIMITED_PARTNERSHIP',
    'GENERAL_PARTNERSHIP',
    'MASTER_LIMITED_PARTNERSHIP',
    'PROFESSIONAL_CORPORATION',
    'BENEFIT_CORPORATION',
    'COOPERATIVE',
    'JOINT_VENTURE',
    'TRIBAL_CORPORATION',
    'SOLE_PROPRIETORSHIP'
);

CREATE TYPE registration_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE', 
    'EXPIRED',
    'PENDING',
    'SUSPENDED',
    'CANCELLED'
);

CREATE TYPE classification_level AS ENUM (
    'UNCLASSIFIED',
    'CUI',
    'CONFIDENTIAL', 
    'SECRET',
    'TOP_SECRET'
);

CREATE TYPE clearance_level AS ENUM (
    'NONE',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI'
);

CREATE TYPE foci_risk_level AS ENUM (
    'NONE',
    'LOW',
    'MEDIUM', 
    'HIGH',
    'CRITICAL'
);

CREATE TYPE validation_status AS ENUM (
    'PENDING',
    'PASSED',
    'FAILED',
    'WARNING',
    'REQUIRES_REVIEW'
);

CREATE TYPE audit_operation AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'SELECT',
    'TRUNCATE'
);

CREATE TYPE submission_status AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'VALIDATION_PENDING',
    'VALIDATION_FAILED',
    'READY_FOR_SUBMISSION',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'REQUIRES_CLARIFICATION'
);

-- Core entities table with comprehensive compliance tracking
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uei CHAR(12) NOT NULL UNIQUE CHECK (uei ~ '^[A-Z0-9]{12}$'),
    legal_name TEXT NOT NULL CHECK (length(legal_name) >= 2 AND length(legal_name) <= 200),
    dba_name TEXT CHECK (length(dba_name) <= 200),
    entity_type entity_type_enum NOT NULL,
    
    -- Encrypted PII fields
    tax_id_encrypted BYTEA NOT NULL,
    tax_id_hash TEXT NOT NULL, -- For searching without decryption
    
    registration_status registration_status_enum NOT NULL DEFAULT 'PENDING',
    cage_code CHAR(5) CHECK (cage_code ~ '^[A-Z0-9]{5}$'),
    duns_number CHAR(9) CHECK (duns_number ~ '^[0-9]{9}$'),
    
    -- Business information
    established_date DATE NOT NULL CHECK (established_date <= CURRENT_DATE),
    fiscal_year_end DATE NOT NULL,
    employee_count INTEGER CHECK (employee_count >= 0),
    annual_revenue DECIMAL(15,2) CHECK (annual_revenue >= 0),
    
    -- Foreign ownership tracking
    foreign_ownership_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (foreign_ownership_percentage >= 0 AND foreign_ownership_percentage <= 100),
    ownership_tiers INTEGER DEFAULT 1 CHECK (ownership_tiers >= 1 AND ownership_tiers <= 10),
    
    -- Compliance timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    next_review_date DATE,
    sam_last_updated TIMESTAMPTZ,
    
    -- Data governance
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    data_classification classification_level NOT NULL DEFAULT 'CUI',
    retention_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 years'),
    
    -- Soft delete for audit compliance
    deleted_at TIMESTAMPTZ,
    deletion_reason TEXT,
    
    -- Constraints
    CONSTRAINT valid_fiscal_year CHECK (fiscal_year_end > established_date),
    CONSTRAINT valid_retention CHECK (retention_date > created_at::date)
);

-- Comprehensive contact information
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('PRIMARY', 'BILLING', 'TECHNICAL', 'SECURITY', 'LEGAL')),
    
    -- Personal information (encrypted)
    first_name_encrypted BYTEA NOT NULL,
    last_name_encrypted BYTEA NOT NULL,
    title TEXT NOT NULL,
    email_encrypted BYTEA NOT NULL,
    phone_encrypted BYTEA NOT NULL,
    mobile_encrypted BYTEA,
    
    -- Security information
    clearance_level clearance_level DEFAULT 'NONE',
    citizenship TEXT[] NOT NULL DEFAULT '{"US"}',
    is_key_management_personnel BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    UNIQUE(entity_id, contact_type)
);

-- Physical and mailing addresses
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    address_type TEXT NOT NULL CHECK (address_type IN ('PHYSICAL', 'MAILING', 'BILLING', 'HEADQUARTERS', 'FACILITY')),
    
    street1 TEXT NOT NULL CHECK (length(street1) >= 1),
    street2 TEXT,
    city TEXT NOT NULL CHECK (length(city) >= 1),
    state CHAR(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
    zip_code TEXT NOT NULL CHECK (zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
    country CHAR(2) NOT NULL DEFAULT 'US',
    
    -- Validation tracking
    validated_at TIMESTAMPTZ,
    validation_source TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(entity_id, address_type)
);

-- NAICS codes for business classification
CREATE TABLE entity_naics_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    naics_code CHAR(6) NOT NULL CHECK (naics_code ~ '^[0-9]{6}$'),
    description TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(entity_id, naics_code)
);

-- SBA business categories and certifications
CREATE TABLE entity_sba_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'LARGE_BUSINESS',
        'SMALL_BUSINESS',
        'SMALL_DISADVANTAGED_BUSINESS',
        'WOMAN_OWNED_SMALL_BUSINESS', 
        'VETERAN_OWNED_SMALL_BUSINESS',
        'HUBZONE_SMALL_BUSINESS',
        'EIGHT_A_CERTIFIED'
    )),
    certification_number TEXT,
    expiration_date DATE,
    certifying_agency TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(entity_id, category)
);

-- Ownership structure tracking
CREATE TABLE ownership_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owned_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    owner_entity_id UUID REFERENCES entities(id) ON DELETE RESTRICT,
    owner_individual_name TEXT, -- For individual owners
    owner_type TEXT NOT NULL CHECK (owner_type IN (
        'INDIVIDUAL',
        'CORPORATION', 
        'PARTNERSHIP',
        'LLC',
        'TRUST',
        'GOVERNMENT',
        'PENSION_FUND',
        'INVESTMENT_FUND',
        'OTHER'
    )),
    
    -- Ownership details
    ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    voting_percentage DECIMAL(5,2) CHECK (voting_percentage >= 0 AND voting_percentage <= 100),
    share_class TEXT,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('DIRECT', 'INDIRECT', 'BENEFICIAL', 'NOMINEE', 'TRUSTEE')),
    
    -- Foreign ownership indicators
    is_foreign BOOLEAN NOT NULL DEFAULT FALSE,
    is_controlling BOOLEAN NOT NULL DEFAULT FALSE,
    citizenship TEXT[],
    
    -- Effective dates
    acquisition_date DATE NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT valid_dates CHECK (
        effective_date >= acquisition_date AND 
        (termination_date IS NULL OR termination_date > effective_date)
    ),
    CONSTRAINT owner_identification CHECK (
        (owner_entity_id IS NOT NULL AND owner_individual_name IS NULL) OR
        (owner_entity_id IS NULL AND owner_individual_name IS NOT NULL)
    )
);

-- FOCI assessments with comprehensive tracking
CREATE TABLE foci_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN (
        'INITIAL',
        'ANNUAL', 
        'TRIGGERED',
        'CHANGE_IN_OWNERSHIP',
        'DCSA_REQUESTED'
    )),
    
    -- Assessment results
    risk_level foci_risk_level NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    dccsa_submission_required BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Assessment metadata
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessor_id UUID NOT NULL,
    methodology TEXT NOT NULL,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    
    -- Review information
    reviewed_by UUID,
    review_date DATE,
    approved_by UUID,
    approval_date DATE,
    next_review_date DATE NOT NULL,
    
    -- Validation
    validation_status validation_status NOT NULL DEFAULT 'PENDING',
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_review_dates CHECK (
        (reviewed_by IS NULL) = (review_date IS NULL) AND
        (approved_by IS NULL) = (approval_date IS NULL) AND
        next_review_date > assessment_date
    )
);

-- FOCI indicators for detailed risk analysis
CREATE TABLE foci_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES foci_assessments(id) ON DELETE CASCADE,
    indicator_type TEXT NOT NULL CHECK (indicator_type IN (
        'FOREIGN_OWNERSHIP',
        'FOREIGN_CONTROL',
        'FOREIGN_INFLUENCE',
        'TECHNOLOGY_TRANSFER',
        'FOREIGN_INVESTMENT',
        'EXPORT_CONTROL',
        'INTERNATIONAL_AGREEMENTS'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('INFORMATIONAL', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL')),
    description TEXT NOT NULL,
    evidence TEXT[] NOT NULL,
    mitigation_required BOOLEAN NOT NULL DEFAULT FALSE,
    nispom_reference TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mitigation measures for FOCI compliance
CREATE TABLE mitigation_measures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES foci_assessments(id) ON DELETE CASCADE,
    measure_type TEXT NOT NULL CHECK (measure_type IN (
        'BOARD_RESOLUTION',
        'PROXY_AGREEMENT',
        'SPECIAL_SECURITY_AGREEMENT',
        'VOTING_TRUST',
        'TECHNOLOGY_CONTROL_PLAN',
        'NETWORK_SECURITY_AGREEMENT',
        'OTHER'
    )),
    description TEXT NOT NULL,
    
    -- Implementation tracking
    implementation_date DATE,
    status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN (
        'PROPOSED',
        'APPROVED', 
        'IMPLEMENTED',
        'MONITORING',
        'EXPIRED',
        'SUPERSEDED'
    )),
    effectiveness_rating TEXT CHECK (effectiveness_rating IN (
        'NOT_ASSESSED',
        'INEFFECTIVE',
        'PARTIALLY_EFFECTIVE', 
        'EFFECTIVE',
        'HIGHLY_EFFECTIVE'
    )),
    
    -- Review information
    review_date DATE NOT NULL,
    responsible_party TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document management with encryption support
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'ARTICLES_OF_INCORPORATION',
        'BYLAWS',
        'OPERATING_AGREEMENT',
        'PARTNERSHIP_AGREEMENT',
        'STOCK_CERTIFICATES',
        'VOTING_AGREEMENTS',
        'BOARD_RESOLUTIONS',
        'FINANCIAL_STATEMENTS',
        'OWNERSHIP_DISCLOSURE',
        'KMP_IDENTIFICATION',
        'DCAA_AUDIT_REPORT',
        'FOCI_MITIGATION_PLAN',
        'OTHER'
    )),
    
    -- File information
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    content_type TEXT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA-256 hash for integrity
    
    -- Security and classification
    classification classification_level NOT NULL DEFAULT 'CUI',
    encryption_status TEXT NOT NULL DEFAULT 'ENCRYPTED_AT_REST' CHECK (encryption_status IN (
        'UNENCRYPTED',
        'ENCRYPTED_AT_REST',
        'ENCRYPTED_IN_TRANSIT', 
        'END_TO_END_ENCRYPTED'
    )),
    access_level TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (access_level IN (
        'PUBLIC',
        'INTERNAL',
        'CONFIDENTIAL',
        'RESTRICTED'
    )),
    
    -- Document processing
    virus_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (virus_scan_status IN (
        'PENDING',
        'CLEAN',
        'INFECTED',
        'QUARANTINED',
        'ERROR'
    )),
    virus_scan_date TIMESTAMPTZ,
    ocr_status TEXT DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'COMPLETED', 'FAILED', 'NOT_APPLICABLE')),
    extracted_text TEXT,
    ocr_confidence DECIMAL(4,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),
    
    -- Validation
    validation_status validation_status NOT NULL DEFAULT 'PENDING',
    
    -- Retention and compliance
    retention_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'),
    
    -- Audit fields
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_retention_date CHECK (retention_date > uploaded_at::date)
);

-- Application submissions tracking
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    submission_status submission_status NOT NULL DEFAULT 'DRAFT',
    
    -- Application metadata
    application_type TEXT NOT NULL DEFAULT 'FCL_APPLICATION',
    classification classification_level NOT NULL DEFAULT 'CUI',
    
    -- Progress tracking
    current_step TEXT NOT NULL DEFAULT 'COMPANY_IDENTIFICATION',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Submission information
    submitted_at TIMESTAMPTZ,
    submitted_by UUID,
    dcsa_reference_number TEXT,
    
    -- Review tracking
    assigned_reviewer UUID,
    review_started_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    
    -- Decision information
    decision TEXT CHECK (decision IN ('APPROVED', 'REJECTED', 'REQUIRES_CLARIFICATION', NULL)),
    decision_date DATE,
    decision_by UUID,
    decision_rationale TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    CONSTRAINT valid_submission CHECK (
        (submitted_at IS NULL) = (submitted_by IS NULL) AND
        (submitted_at IS NULL) = (dcsa_reference_number IS NULL)
    ),
    CONSTRAINT valid_review CHECK (
        (assigned_reviewer IS NULL) = (review_started_at IS NULL)
    ),
    CONSTRAINT valid_decision CHECK (
        (decision IS NULL) = (decision_date IS NULL) AND
        (decision IS NULL) = (decision_by IS NULL)
    )
);

-- Validation results for comprehensive compliance checking
CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    validation_type TEXT NOT NULL CHECK (validation_type IN (
        'FORMAT_VALIDATION',
        'BUSINESS_RULE',
        'REGULATORY_COMPLIANCE',
        'EXTERNAL_VERIFICATION',
        'AI_VALIDATION'
    )),
    
    -- Validation details
    status validation_status NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    field_name TEXT,
    suggestions TEXT[],
    regulatory_reference TEXT,
    
    -- Resolution tracking
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT entity_or_application CHECK (
        (entity_id IS NOT NULL AND application_id IS NULL) OR
        (entity_id IS NULL AND application_id IS NOT NULL) OR
        (entity_id IS NOT NULL AND application_id IS NOT NULL)
    )
);

-- Comprehensive audit logging with JSONB for flexibility
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation_type audit_operation NOT NULL,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Session information
    user_id UUID,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Security classification
    compliance_event BOOLEAN DEFAULT FALSE,
    risk_level foci_risk_level DEFAULT 'LOW',
    data_classification classification_level DEFAULT 'CUI',
    
    -- Temporal information
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Retention (7-year requirement per NISPOM)
    purge_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 years')
);

-- User management for enterprise access control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE CHECK (length(username) >= 3),
    email TEXT NOT NULL UNIQUE,
    
    -- Security information
    password_hash TEXT NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted BYTEA,
    clearance_level clearance_level DEFAULT 'NONE',
    
    -- Profile information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    job_title TEXT,
    department TEXT,
    
    -- Account status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Security tracking
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_clearance CHECK (
        clearance_level IN ('NONE', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'TOP_SECRET_SCI')
    )
);

-- User entity access control for multi-tenant security
CREATE TABLE user_entity_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('READ', 'write', 'admin')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID NOT NULL REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, entity_id),
    
    CONSTRAINT valid_revocation CHECK (
        (revoked_at IS NULL) = (revoked_by IS NULL) AND
        (revoked_at IS NULL OR revoked_at > granted_at)
    )
);

-- Create indexes for performance and compliance queries
CREATE INDEX idx_entities_uei ON entities(uei);
CREATE INDEX idx_entities_cage_code ON entities(cage_code) WHERE cage_code IS NOT NULL;
CREATE INDEX idx_entities_duns ON entities(duns_number) WHERE duns_number IS NOT NULL;
CREATE INDEX idx_entities_status ON entities(registration_status);
CREATE INDEX idx_entities_classification ON entities(data_classification);
CREATE INDEX idx_entities_review_date ON entities(next_review_date);

CREATE INDEX idx_ownership_relations_owned_entity ON ownership_relations(owned_entity_id);
CREATE INDEX idx_ownership_relations_owner_entity ON ownership_relations(owner_entity_id);
CREATE INDEX idx_ownership_relations_foreign ON ownership_relations(is_foreign) WHERE is_foreign = TRUE;
CREATE INDEX idx_ownership_relations_controlling ON ownership_relations(is_controlling) WHERE is_controlling = TRUE;
CREATE INDEX idx_ownership_relations_effective ON ownership_relations(effective_date, termination_date);

CREATE INDEX idx_foci_assessments_entity ON foci_assessments(entity_id);
CREATE INDEX idx_foci_assessments_risk_level ON foci_assessments(risk_level);
CREATE INDEX idx_foci_assessments_review_date ON foci_assessments(next_review_date);
CREATE INDEX idx_foci_assessments_status ON foci_assessments(validation_status);

CREATE INDEX idx_documents_entity ON documents(entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_classification ON documents(classification);
CREATE INDEX idx_documents_validation ON documents(validation_status);
CREATE INDEX idx_documents_retention ON documents(retention_date);

CREATE INDEX idx_applications_entity ON applications(entity_id);
CREATE INDEX idx_applications_status ON applications(submission_status);
CREATE INDEX idx_applications_step ON applications(current_step);
CREATE INDEX idx_applications_reviewer ON applications(assigned_reviewer) WHERE assigned_reviewer IS NOT NULL;

CREATE INDEX idx_audit_events_table_record ON audit_events(table_name, record_id);
CREATE INDEX idx_audit_events_user ON audit_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_audit_events_compliance ON audit_events(compliance_event) WHERE compliance_event = TRUE;
CREATE INDEX idx_audit_events_purge ON audit_events(purge_date);

CREATE INDEX idx_validation_results_entity ON validation_results(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_validation_results_application ON validation_results(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_validation_results_status ON validation_results(status);
CREATE INDEX idx_validation_results_severity ON validation_results(severity);

-- Row-level security policies for multi-tenant compliance
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE foci_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Function to get current user ID from context
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS policies for entity access control
CREATE POLICY entity_access_policy ON entities
    FOR ALL TO authenticated_users
    USING (
        EXISTS (
            SELECT 1 FROM user_entity_access uea
            WHERE uea.user_id = current_user_id()
            AND uea.entity_id = entities.id
            AND uea.revoked_at IS NULL
        )
    );

-- Similar policies for related tables
CREATE POLICY contact_access_policy ON contacts
    FOR ALL TO authenticated_users
    USING (
        EXISTS (
            SELECT 1 FROM user_entity_access uea
            WHERE uea.user_id = current_user_id()
            AND uea.entity_id = contacts.entity_id
            AND uea.revoked_at IS NULL
        )
    );

-- Trigger functions for audit trail automation
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_events (
            table_name, record_id, operation_type, old_values, 
            user_id, session_id, compliance_event
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP::audit_operation, to_jsonb(OLD),
            current_user_id(), COALESCE(current_setting('app.session_id', true)::UUID, uuid_generate_v4()),
            TRUE
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_events (
            table_name, record_id, operation_type, old_values, new_values,
            changed_fields, user_id, session_id, compliance_event
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_operation, to_jsonb(OLD), to_jsonb(NEW),
            (SELECT array_agg(key) FROM jsonb_each_text(to_jsonb(NEW)) WHERE to_jsonb(OLD) ->> key IS DISTINCT FROM to_jsonb(NEW) ->> key),
            current_user_id(), COALESCE(current_setting('app.session_id', true)::UUID, uuid_generate_v4()),
            TRUE
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_events (
            table_name, record_id, operation_type, new_values,
            user_id, session_id, compliance_event
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_operation, to_jsonb(NEW),
            current_user_id(), COALESCE(current_setting('app.session_id', true)::UUID, uuid_generate_v4()),
            TRUE
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers on all critical tables
CREATE TRIGGER audit_entities_trigger
    AFTER INSERT OR UPDATE OR DELETE ON entities
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ownership_relations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ownership_relations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_foci_assessments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON foci_assessments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_applications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON applications
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers for timestamp maintenance
CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ownership_relations_updated_at
    BEFORE UPDATE ON ownership_relations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foci_assessments_updated_at
    BEFORE UPDATE ON foci_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention and cleanup procedures
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS void AS $$
BEGIN
    -- Clean up expired audit events (after 7 years per NISPOM)
    DELETE FROM audit_events WHERE purge_date < CURRENT_DATE;
    
    -- Clean up expired documents based on retention policy
    DELETE FROM documents WHERE retention_date < CURRENT_DATE;
    
    -- Log cleanup activity
    INSERT INTO audit_events (
        table_name, record_id, operation_type, new_values,
        user_id, compliance_event
    ) VALUES (
        'SYSTEM_CLEANUP', uuid_generate_v4(), 'DELETE', 
        jsonb_build_object('cleanup_date', CURRENT_DATE, 'operation', 'data_retention_cleanup'),
        '00000000-0000-0000-0000-000000000000'::UUID, TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Create role for authenticated users
CREATE ROLE authenticated_users;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated_users;
GRANT DELETE ON audit_events, validation_results TO authenticated_users;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated_users;

-- Comments for documentation
COMMENT ON TABLE entities IS 'Core company entity information with comprehensive compliance tracking';
COMMENT ON TABLE foci_assessments IS 'Foreign Ownership, Control, or Influence assessments per NISPOM requirements';
COMMENT ON TABLE audit_events IS 'Comprehensive audit trail for compliance and security monitoring';
COMMENT ON TABLE ownership_relations IS 'Complete ownership structure tracking with foreign ownership indicators';
COMMENT ON TABLE documents IS 'Secure document management with encryption and classification support';
COMMENT ON TABLE applications IS 'FCL application submission and review workflow tracking';

-- Initial system user for bootstrap
INSERT INTO users (
    id, username, email, password_hash, first_name, last_name, 
    job_title, is_active, is_verified, clearance_level
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'system', 'system@turbofcl.gov', 
    '$2b$12$placeholder_hash_for_system_user',
    'System', 'User', 'System Administrator',
    TRUE, TRUE, 'TOP_SECRET'
) ON CONFLICT (id) DO NOTHING;
