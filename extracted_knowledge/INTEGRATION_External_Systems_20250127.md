# Integration: External System Patterns

## Business Purpose
TurboFCL integrates with government and commercial APIs to automate data retrieval, validate information accuracy, and ensure compliance with DCSA requirements for facility clearance applications.

## Data Flow Architecture

### SAM.gov Integration
- **Input**: 12-character UEI (Unique Entity Identifier)
- **Process**: Real-time API call when UEI length >= 10 characters
- **Output**: Company registration data including:
  - Legal business name
  - CAGE code
  - Entity structure
  - State of incorporation
  - Principal place of business
  - Registration status
  - Last update date

### EDGAR SEC Integration  
- **Input**: Company name or CIK (Central Index Key)
- **Process**: API call triggered for public corporations only
- **Output**: Financial disclosure data including:
  - SEC filings (10-K, 8-K, DEF 14A)
  - Ownership percentages (institutional, foreign, insider)
  - Filing dates and descriptions

### AWS SageMaker ML Endpoints
- **GPT-NeoX Endpoint**: Text generation for AI chat responses
- **Embedding Endpoint**: Document vectorization for semantic search
- **NER Endpoint**: Named Entity Recognition for KMP extraction

## Constraints Discovered

### Rate Limits
- SAM.gov: 100 calls/hour (implied from deployment guide)
- EDGAR: No specific limit mentioned but daily refresh suggested
- SageMaker: Auto-scaling from 1-5 instances for GPT model

### Data Formats
- UEI: Exactly 12 uppercase alphanumeric characters
- CAGE: Up to 10 alphanumeric characters
- API Responses: JSON format expected
- Document embeddings: 768-dimensional vectors

### Authentication Requirements
- SAM.gov: API key required (rotated every 90 days)
- AWS Cognito: JWT tokens for user authentication
- SageMaker: IAM role-based access

### Error Conditions
- SAM.gov entity not found or inactive registration
- Network timeouts (1500ms delay simulated)
- Entity type mismatches between user selection and SAM data
- API unavailability requiring manual fallback

## Business Rules Applied

### Rule 1: Entity Structure Validation
- SAM.gov entity structure must align with user selection
- Mismatches trigger validation error requiring correction
- Example: "LIMITED LIABILITY COMPANY" must match "llc" selection

### Rule 2: Data Freshness Requirements  
- SAM.gov data cached maximum 24 hours
- EDGAR data refreshed daily for public companies
- Real-time validation preferred over stale data

### Rule 3: Automatic Data Population
- When valid UEI entered, pre-fill all available fields
- Reduce manual entry errors
- Show visual confirmation of data retrieval

### Rule 4: Fallback Handling
- If APIs unavailable, allow manual entry
- Display warning about unverified data
- Flag for manual review during submission

## Lessons for New Implementation

### What Worked
- **Auto-fetch on UEI entry**: Reduces user effort significantly
- **Visual loading indicators**: Users understand system is working
- **Parallel API calls**: Fetch SAM and EDGAR data simultaneously
- **Caching strategy**: 24-hour cache prevents redundant calls

### What Didn't Work (Inferred)
- **Tight coupling to APIs**: System fails if external services down
- **No offline mode**: Users blocked without connectivity
- **Limited error messages**: Technical errors shown to users
- **No partial data handling**: All-or-nothing approach

### Recommendations

1. **Implement Circuit Breakers**
   - Fail fast if API consistently unavailable
   - Automatic fallback to cached data
   - Gradual service restoration

2. **Enhanced Error Handling**
   - User-friendly messages for each error type
   - Actionable steps to resolve issues
   - Support contact for persistent problems

3. **Progressive Data Loading**
   - Show partial data as it arrives
   - Allow users to continue with available info
   - Background retry for failed calls

4. **API Response Validation**
   - Schema validation for all responses
   - Handle missing or null fields gracefully
   - Log anomalies for investigation

5. **Monitoring & Alerting**
   - Track API success rates
   - Alert on degraded performance
   - Dashboard for integration health

## Integration Timing Patterns

### Synchronous Operations
- UEI validation: Immediate on field blur
- Entity type matching: Real-time comparison
- Field validation: Instant feedback

### Asynchronous Operations  
- SAM.gov data fetch: Background with spinner
- EDGAR retrieval: Parallel to other operations
- Document processing: Queue-based with status updates

### Debouncing Strategy
- Wait 500ms after typing stops before API calls
- Prevents excessive requests during data entry
- Improves perceived performance

## Security Considerations

### Data in Transit
- All API calls over HTTPS/TLS 1.2+
- JWT tokens for authentication
- No sensitive data in URL parameters

### Data at Rest
- Cached API responses encrypted
- S3 documents with KMS encryption
- Database fields encrypted for PII

### Access Control
- Cognito user pools for authentication
- IAM roles for service permissions
- Row-level security in database

## Test Scenarios for Integration

1. **SAM.gov Timeout**
   - Simulate 5-second delay
   - Expected: Timeout error, manual entry option
   - User message: "SAM.gov is not responding. You can enter data manually."

2. **Invalid UEI Format**
   - Input: "ABC123" (too short)
   - Expected: No API call triggered
   - Validation: "UEI must be 12 characters"

3. **Expired SAM Registration**
   - API returns inactive status
   - Expected: Warning with explanation
   - Action: Block submission, require update

4. **EDGAR Missing Data**
   - Public company with no SEC filings
   - Expected: Warning but allow progression
   - Note: Flag for manual review

5. **Concurrent API Failures**
   - Both SAM and EDGAR unavailable
   - Expected: Graceful degradation
   - Allow: Full manual entry mode 