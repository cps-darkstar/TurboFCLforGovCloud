-- TurboFCL Database Schema
-- PostgreSQL with pgvector extension for AI/ML capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User management table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(500) NOT NULL,
    security_clearance VARCHAR(50),
    dcsa_facility_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FCL Applications table
CREATE TABLE fcl_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- Cognito sub
    company_name VARCHAR(500) NOT NULL,
    uei VARCHAR(12),
    cage_code VARCHAR(10),
    entity_type VARCHAR(100) NOT NULL,
    sam_data JSONB,
    edgar_data JSONB,
    foci_status JSONB NOT NULL DEFAULT '["no-foci"]',
    validation_issues JSONB DEFAULT '[]',
    ai_insights JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft',
    tracking_number VARCHAR(100),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_entity_type CHECK (
        entity_type IN (
            'sole-proprietorship',
            'general-partnership', 
            'limited-partnership',
            'corporation',
            'public-corporation',
            'llc'
        )
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('draft', 'in-progress', 'submitted', 'under-review', 'approved', 'rejected')
    ),
    CONSTRAINT valid_uei CHECK (
        uei IS NULL OR (LENGTH(uei) = 12 AND uei ~ '^[A-Z0-9]{12}$')
    )
);

-- Document embeddings for RAG system
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES fcl_applications(id) ON DELETE CASCADE,
    document_name VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),
    chunk_text TEXT,
    embedding vector(768), -- 768-dimensional embeddings
    metadata JSONB DEFAULT '{}',
    s3_key VARCHAR(1000), -- S3 object key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Key Management Personnel table
CREATE TABLE key_management_personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES fcl_applications(id) ON DELETE CASCADE,
    full_name VARCHAR(500) NOT NULL,
    role VARCHAR(100) NOT NULL,
    citizenship_status VARCHAR(50),
    clearance_required BOOLEAN DEFAULT true,
    clearance_level VARCHAR(50),
    extracted_by_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application audit log
CREATE TABLE application_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES fcl_applications(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history for AI interactions
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    application_id UUID REFERENCES fcl_applications(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance

-- FCL Applications indexes
CREATE INDEX idx_fcl_applications_user_id ON fcl_applications(user_id);
CREATE INDEX idx_fcl_applications_status ON fcl_applications(status);
CREATE INDEX idx_fcl_applications_entity_type ON fcl_applications(entity_type);
CREATE INDEX idx_fcl_applications_created_at ON fcl_applications(created_at);
CREATE INDEX idx_fcl_applications_uei ON fcl_applications(uei) WHERE uei IS NOT NULL;
CREATE INDEX idx_fcl_applications_cage_code ON fcl_applications(cage_code) WHERE cage_code IS NOT NULL;

-- Document embeddings indexes for vector similarity search
CREATE INDEX idx_document_embeddings_application_id ON document_embeddings(application_id);
CREATE INDEX idx_document_embeddings_type ON document_embeddings(document_type);
CREATE INDEX idx_document_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- KMP indexes
CREATE INDEX idx_kmp_application_id ON key_management_personnel(application_id);
CREATE INDEX idx_kmp_role ON key_management_personnel(role);

-- Audit log indexes
CREATE INDEX idx_audit_log_application_id ON application_audit_log(application_id);
CREATE INDEX idx_audit_log_user_id ON application_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON application_audit_log(created_at);

-- Chat history indexes
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_application_id ON chat_history(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);

-- Full-text search indexes
CREATE INDEX idx_fcl_applications_company_name_gin ON fcl_applications USING gin(company_name gin_trgm_ops);
CREATE INDEX idx_document_embeddings_text_gin ON document_embeddings USING gin(chunk_text gin_trgm_ops);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fcl_applications_updated_at BEFORE UPDATE ON fcl_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kmp_updated_at BEFORE UPDATE ON key_management_personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log application changes
CREATE OR REPLACE FUNCTION log_application_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO application_audit_log (application_id, user_id, action, details)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for application audit logging
CREATE TRIGGER fcl_applications_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fcl_applications
    FOR EACH ROW EXECUTE FUNCTION log_application_change();

-- Insert initial system configuration
INSERT INTO system_config (key, value, description) VALUES
('app_version', '"1.0.0"', 'Application version'),
('maintenance_mode', 'false', 'System maintenance mode flag'),
('max_file_size_mb', '10', 'Maximum file upload size in MB'),
('allowed_file_types', '["pdf", "doc", "docx"]', 'Allowed document file types'),
('sam_cache_ttl_hours', '24', 'SAM.gov data cache TTL in hours'),
('ai_confidence_threshold', '0.7', 'Minimum AI confidence threshold'),
('foci_ownership_threshold', '5.0', 'FOCI foreign ownership percentage threshold'),
('processing_time_estimates', '{"standard": "45-90 days", "with_foci": "60-120 days", "complex_foci": "90-180 days"}', 'Processing time estimates by complexity');

-- Create views for common queries

-- Application summary view
CREATE VIEW application_summary AS
SELECT 
    a.id,
    a.company_name,
    a.entity_type,
    a.status,
    a.created_at,
    a.updated_at,
    COUNT(DISTINCT k.id) as kmp_count,
    COUNT(DISTINCT d.id) as document_count,
    CASE 
        WHEN a.validation_issues::text = '[]' THEN 0
        ELSE jsonb_array_length(a.validation_issues)
    END as validation_issue_count
FROM fcl_applications a
LEFT JOIN key_management_personnel k ON a.id = k.application_id
LEFT JOIN document_embeddings d ON a.id = d.application_id
GROUP BY a.id, a.company_name, a.entity_type, a.status, a.created_at, a.updated_at, a.validation_issues;

-- User activity view
CREATE VIEW user_activity AS
SELECT 
    user_id,
    COUNT(DISTINCT application_id) as total_applications,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_applications,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_applications,
    MAX(updated_at) as last_activity
FROM fcl_applications
GROUP BY user_id;

-- Document processing status view
CREATE VIEW document_processing_status AS
SELECT 
    application_id,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as processed_documents,
    COUNT(CASE WHEN metadata->>'extracted_kmps' IS NOT NULL THEN 1 END) as documents_with_kmps,
    MAX(created_at) as last_upload
FROM document_embeddings
GROUP BY application_id;

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO turbofcl_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO turbofcl_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO turbofcl_app;