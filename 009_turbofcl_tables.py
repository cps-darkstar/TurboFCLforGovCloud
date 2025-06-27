"""Add TurboFCL tables with pgvector support

Revision ID: 009_turbofcl_tables
Revises: 008_feature_flags
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers
revision = '009_turbofcl_tables'
down_revision = '008_feature_flags'
branch_labels = None
depends_on = None

def upgrade():
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    op.execute('CREATE EXTENSION IF NOT EXISTS btree_gin')
    
    # Create fcl_applications table
    op.create_table(
        'fcl_applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('company_name', sa.String(500), nullable=False),
        sa.Column('uei', sa.String(12)),
        sa.Column('cage_code', sa.String(10)),
        sa.Column('entity_type', sa.String(100)),
        sa.Column('ownership_structure', sa.Text()),
        sa.Column('sam_data', postgresql.JSONB()),
        sa.Column('edgar_data', postgresql.JSONB()),
        sa.Column('foci_status', postgresql.JSONB()),
        sa.Column('validation_issues', postgresql.JSONB()),
        sa.Column('ai_insights', postgresql.JSONB()),
        sa.Column('status', sa.String(50), nullable=False, default='draft'),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True)),
        sa.Column('submitted_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    
    # Create document_embeddings table for RAG
    op.create_table(
        'document_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fcl_applications.id')),
        sa.Column('document_name', sa.String(500), nullable=False),
        sa.Column('document_type', sa.String(100)),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(768)),  # 768-dim embeddings
        sa.Column('metadata', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    
    # Create key_management_personnel table
    op.create_table(
        'key_management_personnel',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fcl_applications.id'), nullable=False),
        sa.Column('full_name', sa.String(500), nullable=False),
        sa.Column('role', sa.String(100), nullable=False),
        sa.Column('citizenship_status', sa.String(50)),
        sa.Column('clearance_required', sa.Boolean(), default=True),
        sa.Column('clearance_level', sa.String(50)),
        sa.Column('extracted_by_ai', sa.Boolean(), default=False),
        sa.Column('confidence_score', sa.Float()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    
    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fcl_applications.id'), nullable=False),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('s3_key', sa.String(1000), nullable=False),
        sa.Column('size', sa.BigInteger()),
        sa.Column('content_type', sa.String(100)),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('extracted_data', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True))
    )
    
    # Create chat_history table
    op.create_table(
        'chat_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fcl_applications.id')),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('sources', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    
    # Create indexes
    op.create_index('idx_fcl_applications_user_id', 'fcl_applications', ['user_id'])
    op.create_index('idx_fcl_applications_status', 'fcl_applications', ['status'])
    op.create_index('idx_fcl_applications_uei', 'fcl_applications', ['uei'])
    
    # Vector similarity search index
    op.execute('CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops)')
    op.create_index('idx_embeddings_application_id', 'document_embeddings', ['application_id'])
    op.create_index('idx_embeddings_document_type', 'document_embeddings', ['document_type'])
    
    op.create_index('idx_kmp_application_id', 'key_management_personnel', ['application_id'])
    op.create_index('idx_documents_application_id', 'documents', ['application_id'])
    op.create_index('idx_documents_status', 'documents', ['status'])
    
    op.create_index('idx_chat_history_user_id', 'chat_history', ['user_id'])
    op.create_index('idx_chat_history_application_id', 'chat_history', ['application_id'])

def downgrade():
    # Drop indexes
    op.drop_index('idx_chat_history_application_id')
    op.drop_index('idx_chat_history_user_id')
    op.drop_index('idx_documents_status')
    op.drop_index('idx_documents_application_id')
    op.drop_index('idx_kmp_application_id')
    op.drop_index('idx_embeddings_document_type')
    op.drop_index('idx_embeddings_application_id')
    op.drop_index('idx_embeddings_vector')
    op.drop_index('idx_fcl_applications_uei')
    op.drop_index('idx_fcl_applications_status')
    op.drop_index('idx_fcl_applications_user_id')
    
    # Drop tables
    op.drop_table('chat_history')
    op.drop_table('documents')
    op.drop_table('key_management_personnel')
    op.drop_table('document_embeddings')
    op.drop_table('fcl_applications')
    
    # Drop extensions (optional, as they might be used by other tables)
    # op.execute('DROP EXTENSION IF EXISTS vector')
    # op.execute('DROP EXTENSION IF EXISTS pg_trgm')
    # op.execute('DROP EXTENSION IF EXISTS btree_gin') 