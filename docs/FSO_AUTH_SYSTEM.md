# TurboFCL FSO Authentication System

## Overview

This simplified authentication system is designed for the testing phase of TurboFCL, focusing on Facility Security Officer (FSO) centric user management. The system supports 5-10 testers at ISI and a few at DARPA.

## Key Concepts

### FSO as Primary User

- **FSO** is the primary user and FCL application package owner by default
- **FSO** serves as the admin for their company with full permissions
- **FSO** can create additional users (KMP, security personnel) for their company

### One FCL Case Per Company

- Each business entity/firm has **only one FCL case** at any given time
- FCL status progresses from "NOT_STARTED" → "APPLICATION_COMPONENTS_COMPLETE" → "APPLICATION_GENERATED_READY_TO_SUBMIT" → "SUBMITTED_TO_DCSA"
- All users from a company are contributors to the single FCL application

### User Hierarchy

1. **FSO** - Primary admin, owns FCL application package
2. **KMP** (Key Management Personnel) - Can be granted read/write access by FSO
3. **Security Personnel** - Additional company users managed by FSO

## System Components

### Backend Services

- `FSO_AuthService` - Main authentication and user management service
- `fso_auth.py` - API endpoints for FSO operations
- `fso_schemas.py` - Pydantic models for validation

### Frontend Components

- `FSOAccountRequest.tsx` - Public form for requesting access
- `FSOLogin.tsx` - FSO login interface
- `FSODashboard.tsx` - Main dashboard showing FCL status

## API Endpoints

### Public Endpoints

- `POST /api/v1/auth/request-account` - Request account access
- `POST /api/v1/auth/register-fso` - Register new FSO account
- `POST /api/v1/auth/login` - FSO login

### Authenticated Endpoints

- `GET /api/v1/auth/fcl-status/{company_id}` - Get FCL application status
- `POST /api/v1/auth/company-users` - Create new company user
- `GET /api/v1/auth/company-users/{company_id}` - List company users
- `PUT /api/v1/auth/user-permissions` - Update user permissions
- `GET /api/v1/auth/status` - Get system status for dashboard

## Account Request Flow

1. **User visits your URL** and fills out the account request form
2. **Form includes**:

   - FSO name and contact information
   - Company name
   - UEI (Unique Entity Identifier) from SAM.gov
   - Optional: Personnel count and request reason

3. **If no UEI provided**: System redirects to SAM.gov for entity registration
4. **Request processed**: FSO receives credentials to complete registration
5. **FSO registers**: Creates account, company entity, and initial FCL case

## FCL Application Components

The system tracks these required components:

- **Company Profile** - Basic company information
- **Key Management Personnel** - KMP details and clearances
- **Business Structure** - Corporate structure and ownership
- **Foreign Ownership** - FOCI assessment if applicable
- **Facility Information** - Physical facility details
- **Security Procedures** - Security protocols and procedures

## User Management

### FSO Capabilities

- Create additional users for their company
- Assign roles (KMP, Security Personnel, etc.)
- Grant permissions (read, write, admin)
- Manage FCL application progress
- Submit application when complete

### Permission Levels

- **Read**: View application status and documents
- **Write**: Edit application components
- **Admin**: Full access including user management (FSO only)

## Testing Configuration

For the testing phase:

- Any valid email format is accepted for login
- Password validation is simplified
- Mock data is used for FCL status
- All account requests are auto-approved

## Database Schema (Simplified)

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR, -- 'FSO', 'KMP', 'SECURITY_PERSONNEL'
  is_admin BOOLEAN,
  company_id UUID,
  created_at TIMESTAMP
)

-- Companies table
companies (
  id UUID PRIMARY KEY,
  name VARCHAR,
  uei VARCHAR(12),
  primary_fso_id UUID,
  fcl_application_id UUID,
  created_at TIMESTAMP
)

-- FCL Applications table
fcl_applications (
  id UUID PRIMARY KEY,
  company_id UUID,
  primary_fso_id UUID,
  status VARCHAR,
  progress_percentage FLOAT,
  components JSONB,
  created_at TIMESTAMP,
  last_updated TIMESTAMP
)
```

## Security Considerations

- Session tokens for authentication
- Input validation on all forms
- SQL injection prevention
- XSS protection
- HTTPS enforcement (production)

## Next Steps

1. **Complete backend implementation** with actual database operations
2. **Implement proper password hashing** (bcrypt)
3. **Add email verification** for account activation
4. **Integrate with SAM.gov API** for UEI validation
5. **Add comprehensive logging** and audit trails
6. **Implement proper error handling** and user feedback

## Testing Users

For the testing phase, you can create test accounts for:

- **ISI Testers**: 5-10 accounts for different companies
- **DARPA Users**: A few accounts for oversight/testing
- **Coleman (Admin)**: Administrative access to all companies

## Support

For issues or questions during testing:

- Check application logs for errors
- Review API responses for validation errors
- Contact system administrator for account issues
