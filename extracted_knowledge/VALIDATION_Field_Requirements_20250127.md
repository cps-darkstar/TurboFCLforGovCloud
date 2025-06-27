# Validation Set: FCL Application Field Requirements

## Field Requirements

| Field | Business Rule | DCSA Requirement | Validation Logic |
|-------|---------------|------------------|------------------|
| company_name | Legal entity name | Must match incorporation docs | Min: 1 char, Max: 500 chars, Required |
| uei | Unique Entity ID | SAM.gov identifier | Exactly 12 alphanumeric chars, Format: ^[A-Z0-9]{12}$ |
| cage_code | Commercial and Government Entity | DoD supplier code | Max: 10 chars, Alphanumeric |
| entity_type | Business structure | Must match SAM.gov | Enum: llc, corporation, public-corporation, general-partnership, limited-partnership, sole-proprietorship |
| foci_status | Foreign interests | Full disclosure required | Array of enums, Cannot mix "no-foci" with other values |
| chat_message | AI assistant input | User queries | Min: 1 char, Max: 2000 chars |
| kmp.full_name | Key person name | Legal name required | Max: 500 chars, Required |
| kmp.role | Position title | DCSA role categories | Max: 100 chars, Required |
| kmp.citizenship_status | Citizenship info | Clearance eligibility | Max: 50 chars, Optional |
| kmp.clearance_level | Security clearance | If applicable | Max: 50 chars, Optional |
| document.name | File identifier | Clear naming required | Max: 500 chars, Required |
| document.size | File size limit | System constraint | Max: 10MB per file |
| document.content_type | File format | Accepted types | PDF, DOC, DOCX only |

## Cross-Field Dependencies

- **IF** entity_type = "public-corporation" **THEN** EDGAR data required
- **IF** entity_type = "llc" **THEN** minimum 4 KMPs required (FSO, ITPSO, SMO, Managing Member)
- **IF** foci_status includes "foreign-ownership" **THEN** ownership percentage required
- **IF** samData.entityStructure exists **THEN** entity_type must align with SAM structure
- **IF** kmp.clearance_required = true **THEN** kmp.citizenship_status must be provided
- **IF** application.status = "submitted" **THEN** all required documents must be uploaded

## Business Error Messages

Map technical errors to business-friendly messages:
- `INVALID_UEI_FORMAT` → "UEI must be exactly 12 characters (letters and numbers only). Example: ABC123DEF456"
- `ENTITY_TYPE_MISMATCH` → "Entity type mismatch: SAM.gov shows '[SAM_TYPE]' but you selected '[USER_TYPE]'. Please verify."
- `FOCI_CONTRADICTION` → "Contradictory FOCI selections: Cannot have both foreign investors and no FOCI."
- `INSUFFICIENT_KMPS` → "LLCs typically require at least 4 KMPs: FSO, ITPSO, SMO, and Managing Member. Ensure all required positions are identified."
- `MISSING_SEC_FILINGS` → "Public corporations must provide SEC filings (10-K, 8-K, DEF 14A)"
- `DOCUMENT_SIZE_EXCEEDED` → "File size exceeds 10MB limit. Please reduce file size or split into multiple documents."
- `INVALID_FILE_TYPE` → "Only PDF, DOC, and DOCX files are accepted for document uploads."

## Edge Cases

- Case 1: **UEI with leading zeros** - System must preserve all characters including leading zeros
- Case 2: **Company names with special characters** - Allow &, ., -, ' but escape properly for database storage
- Case 3: **Multiple DBAs** - Company may operate under different names, legal name takes precedence
- Case 4: **CAGE code expiration** - Codes expire after 5 years, system should validate currency
- Case 5: **Hyphenated entity types** - Internal system uses hyphens, but display names use spaces

## Quality Standards

### Completeness Requirements
- All mandatory fields must be completed before submission
- Document upload status must be "completed" not "pending"
- At least one method of company identification (UEI or CAGE) required

### Data Freshness Requirements
- SAM.gov data cached maximum 24 hours
- EDGAR data for public companies refreshed daily
- CAGE code validation checked against current DoD database

### Accuracy Requirements
- Company name must match exactly (case-insensitive)
- No typos in government identifiers (UEI, CAGE)
- KMP names must match government-issued ID

## Implementation Notes for New System

### Real-Time Validation Strategy:
1. **Field-Level**: Validate immediately on blur/change
2. **Cross-Field**: Validate when dependent fields are modified
3. **Progressive**: Don't validate fields user hasn't reached yet
4. **Async Validation**: SAM.gov checks happen in background
5. **Graceful Degradation**: If external APIs fail, allow manual entry with warnings

### Enhanced UX Patterns:
1. **Input Masks**: Format UEI as XXX-XXX-XXX-XXX for readability
2. **Autocomplete**: Suggest entity types based on partial SAM data
3. **Inline Help**: Explain why each field is required
4. **Progress Indicators**: Show validation status per section
5. **Smart Defaults**: Pre-select common options based on entity type

### API Integration Validation:
1. **SAM.gov**: Validate UEI exists and is active
2. **EDGAR**: Cross-check ownership data for public companies
3. **Debounce**: Wait 500ms after typing stops before API calls
4. **Cache**: Store validated data for session duration
5. **Fallback**: Manual override with supervisor approval

## Test Scenarios

1. **Scenario**: User enters UEI "abc123def456" (lowercase)
   - **Expected**: Auto-convert to uppercase "ABC123DEF456"
   - **Action**: Transform and validate format

2. **Scenario**: Company name "Smith & Jones, LLC." with special characters
   - **Expected**: Accept and properly escape for storage
   - **Action**: Validate against SAM.gov exact match

3. **Scenario**: File upload of 15MB PDF
   - **Expected**: Reject with size error before upload starts
   - **Action**: Client-side validation prevents wasted bandwidth

4. **Scenario**: Public company missing EDGAR CIK
   - **Expected**: Warning but allow progression with explanation
   - **Action**: Flag for manual review during submission

5. **Scenario**: FOCI status changes after initial selection
   - **Expected**: Re-validate all dependent fields
   - **Action**: May require additional documentation based on new status 