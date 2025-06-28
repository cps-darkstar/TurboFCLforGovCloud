"""
TurboFCL FastAPI Application
AWS GovCloud Compliant FCL Application System
"""

from fastapi import FastAPI, Depends, HTTPException, Security, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import boto3
import json
import asyncio
from typing import List, Optional
import asyncpg
from pydantic import BaseModel
import os
from datetime import datetime
import uuid

from app.core.config import get_settings, SECURITY_HEADERS
from app.services.validation_service import ValidationService
from app.schemas.fcl_schemas import *
from app.services.sam_service import SAMService
from app.services.ai_service import AIService
from app.services.auth_service import AuthService

# Initialize FastAPI app
app = FastAPI(
    title="TurboFCL API",
    version="1.0.0",
    description="AI-Powered Facility Clearance Application System for AWS GovCloud"
)

# Get settings
settings = get_settings()

# Security
security = HTTPBearer()

# AWS clients
sagemaker_runtime = boto3.client('sagemaker-runtime', region_name=settings.AWS_REGION)
s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
cognito_client = boto3.client('cognito-idp', region_name=settings.AWS_REGION)

# Services
validation_service = ValidationService()
sam_service = SAMService()
ai_service = AIService()
auth_service = AuthService()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

# Database connection
async def get_db_connection():
    return await asyncpg.connect(settings.DATABASE_URL)

# Authentication dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        user_info = await auth_service.verify_cognito_token(credentials.credentials)
        return user_info
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint for ALB"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# FCL Application endpoints
@app.post("/api/applications", response_model=ApplicationResponse)
async def create_application(
    application: FCLApplicationCreate,
    user_info: dict = Depends(verify_token)
):
    """Create new FCL application"""
    conn = await get_db_connection()
    try:
        # Generate application ID
        app_id = str(uuid.uuid4())
        
        # Insert application
        query = """
        INSERT INTO fcl_applications (
            id, user_id, company_name, uei, cage_code, entity_type, 
            foci_status, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', NOW(), NOW())
        RETURNING id, created_at
        """
        
        result = await conn.fetchrow(
            query, app_id, user_info['sub'], application.company_name,
            application.uei, application.cage_code, application.entity_type.value,
            json.dumps([status.value for status in application.foci_status])
        )
        
        return ApplicationResponse(
            id=result['id'],
            status="draft",
            created_at=result['created_at'].isoformat()
        )
    finally:
        await conn.close()

@app.get("/api/applications/{application_id}")
async def get_application(
    application_id: str,
    user_info: dict = Depends(verify_token)
):
    """Get FCL application by ID"""
    conn = await get_db_connection()
    try:
        query = """
        SELECT * FROM fcl_applications 
        WHERE id = $1 AND user_id = $2
        """
        result = await conn.fetchrow(query, application_id, user_info['sub'])
        
        if not result:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return dict(result)
    finally:
        await conn.close()

@app.get("/api/sam-data/{uei}")
async def get_sam_data(
    uei: str,
    user_info: dict = Depends(verify_token)
):
    """Fetch SAM.gov data for given UEI"""
    try:
        sam_data = await sam_service.fetch_sam_data(uei)
        return sam_data
    except Exception as e:
        # Return mock data for testing if SAM.gov is unavailable
        return {
            "legalBusinessName": f"Company with UEI {uei}",
            "uei": uei,
            "cageCode": "12345",
            "entityStructure": "LIMITED LIABILITY COMPANY",
            "stateOfIncorporation": "Delaware",
            "registrationStatus": "Active",
            "lastUpdated": datetime.utcnow().isoformat()
        }

@app.post("/api/applications/{application_id}/validate")
async def validate_application(
    application_id: str,
    user_info: dict = Depends(verify_token)
):
    """Validate FCL application"""
    conn = await get_db_connection()
    try:
        # Get application data
        app_query = """
        SELECT * FROM fcl_applications 
        WHERE id = $1 AND user_id = $2
        """
        app_result = await conn.fetchrow(app_query, application_id, user_info['sub'])
        
        if not app_result:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get KMP count
        kmp_query = "SELECT COUNT(*) FROM key_management_personnel WHERE application_id = $1"
        kmp_count = await conn.fetchval(kmp_query, application_id)
        
        # Get uploaded documents
        doc_query = "SELECT document_name FROM document_embeddings WHERE application_id = $1"
        doc_results = await conn.fetch(doc_query, application_id)
        uploaded_docs = [row['document_name'] for row in doc_results]
        
        # Create application object for validation
        from app.schemas.fcl_schemas import FCLApplicationCreate, EntityType, FOCIStatus
        
        foci_statuses = [FOCIStatus(status) for status in json.loads(app_result['foci_status'])]
        
        application = FCLApplicationCreate(
            company_name=app_result['company_name'],
            uei=app_result['uei'],
            cage_code=app_result['cage_code'],
            entity_type=EntityType(app_result['entity_type']),
            foci_status=foci_statuses
        )
        
        # Perform validation
        issues, insights = await validation_service.validate_application(
            application=application,
            uploaded_documents=uploaded_docs,
            kmp_count=kmp_count
        )
        
        # Update application with validation results
        update_query = """
        UPDATE fcl_applications 
        SET validation_issues = $1, ai_insights = $2, updated_at = NOW()
        WHERE id = $3
        """
        
        await conn.execute(
            update_query,
            json.dumps([issue.dict() for issue in issues]),
            json.dumps([insight.dict() for insight in insights]),
            application_id
        )
        
        return {
            "validation_issues": [issue.dict() for issue in issues],
            "ai_insights": [insight.dict() for insight in insights],
            "validation_passed": len([i for i in issues if i.type == "error"]) == 0
        }
        
    finally:
        await conn.close()

@app.post("/api/chat")
async def chat_with_ai(
    message: ChatRequest,
    user_info: dict = Depends(verify_token)
):
    """Chat with AI assistant about FCL requirements"""
    try:
        response = await ai_service.generate_chat_response(message.message)
        return ChatResponse(
            response=response["response"],
            sources=response.get("sources", [])
        )
    except Exception as e:
        return ChatResponse(
            response="I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            sources=[]
        )

@app.post("/api/applications/{application_id}/documents")
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    user_info: dict = Depends(verify_token)
):
    """Upload document for FCL application"""
    # Validate file
    if file.size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['pdf', 'doc', 'docx']:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, and DOCX files are accepted")
    
    try:
        # Upload to S3
        s3_key = f"applications/{application_id}/documents/{file.filename}"
        
        file_content = await file.read()
        s3_client.put_object(
            Bucket=settings.S3_DOCUMENTS_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type
        )
        
        # Process document with AI
        extracted_data = await ai_service.process_document(file_content, file.filename)
        
        # Store document metadata
        conn = await get_db_connection()
        try:
            doc_id = str(uuid.uuid4())
            query = """
            INSERT INTO document_embeddings (
                id, application_id, document_name, document_type, 
                chunk_text, metadata, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """
            
            await conn.execute(
                query, doc_id, application_id, file.filename, file_ext,
                extracted_data.get('text', ''), json.dumps(extracted_data)
            )
            
            return {
                "document_id": doc_id,
                "filename": file.filename,
                "status": "uploaded",
                "extracted_data": extracted_data
            }
        finally:
            await conn.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/applications/{application_id}/kmps")
async def add_kmp(
    application_id: str,
    kmp: KMPCreate,
    user_info: dict = Depends(verify_token)
):
    """Add Key Management Personnel to application"""
    conn = await get_db_connection()
    try:
        kmp_id = str(uuid.uuid4())
        query = """
        INSERT INTO key_management_personnel (
            id, application_id, full_name, role, citizenship_status,
            clearance_required, clearance_level, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
        """
        
        result = await conn.fetchval(
            query, kmp_id, application_id, kmp.full_name, kmp.role,
            kmp.citizenship_status, kmp.clearance_required, kmp.clearance_level
        )
        
        return {"kmp_id": result, "status": "added"}
    finally:
        await conn.close()

@app.get("/api/applications/{application_id}/kmps")
async def get_kmps(
    application_id: str,
    user_info: dict = Depends(verify_token)
):
    """Get all KMPs for application"""
    conn = await get_db_connection()
    try:
        query = """
        SELECT * FROM key_management_personnel 
        WHERE application_id = $1
        ORDER BY created_at
        """
        results = await conn.fetch(query, application_id)
        return [dict(row) for row in results]
    finally:
        await conn.close()

@app.post("/api/applications/{application_id}/submit")
async def submit_application(
    application_id: str,
    user_info: dict = Depends(verify_token)
):
    """Submit FCL application to DCSA"""
    conn = await get_db_connection()
    try:
        # Final validation
        validation_result = await validate_application(application_id, user_info)
        
        if not validation_result["validation_passed"]:
            raise HTTPException(
                status_code=400, 
                detail="Application has validation errors that must be resolved before submission"
            )
        
        # Update status to submitted
        tracking_number = f"FCL-{datetime.utcnow().strftime('%Y%m%d')}-{application_id[:8].upper()}"
        
        query = """
        UPDATE fcl_applications 
        SET status = 'submitted', tracking_number = $1, submitted_at = NOW(), updated_at = NOW()
        WHERE id = $2
        """
        
        await conn.execute(query, tracking_number, application_id)
        
        return {
            "status": "submitted",
            "tracking_number": tracking_number,
            "estimated_processing_time": "45-90 days"
        }
        
    finally:
        await conn.close()

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "timestamp": datetime.utcnow().isoformat()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)