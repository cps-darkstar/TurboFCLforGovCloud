# Business Rule: FCL Application Requirements by Entity Type

## Purpose
Ensures defense contractors submit all required documentation and identify all Key Management Personnel (KMP) based on their specific business entity structure, as mandated by DCSA for facility clearance eligibility.

## Trigger Conditions
- Condition 1: User selects entity type during FCL application
- Condition 2: Entity type must match SAM.gov registration
- Condition 3: Different entity types have different documentation and KMP requirements

## Business Logic

### Entity Type Requirements Matrix

1. **IF entity_type = "sole-proprietorship" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate  
     - Recent changes to company Structure
   - Required KMPs:
     - Owner of sole proprietorship
     - Senior Management Official (SMO)
     - FSO (Facility Security Officer)
     - ITPSO (Information Technology Professional Security Officer)

2. **ELSE IF entity_type = "general-partnership" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate
     - Partnership Agreement
     - Legal Organization Chart
     - Board/Company Meeting Minutes
     - Recent changes to company Structure
     - FSO/ITPSO Appointment Letter
     - KMP Citizenship Verification
     - Signed undated DD Form 441
     - Signed SF 328
   - Required KMPs:
     - SMO
     - FSO
     - ITPSO
     - All General Partners

3. **ELSE IF entity_type = "limited-partnership" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate
     - Partnership Agreement
     - Certificate of Limited Partnership
     - Legal Organization Chart
     - Board/Company Meeting Minutes
     - Recent changes to company structure
     - FSO/ITPSO Appointment Letter
     - KMP Citizenship Verification
     - Signed undated DD Form 441
     - Signed SF 328
   - Required KMPs:
     - SMO
     - FSO
     - ITPSO
     - All General Partners
     - Limited Partners (if working on classified contracts)

4. **ELSE IF entity_type = "corporation" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate
     - Articles of Incorporation
     - By-Laws
     - Stock Ledger
     - Legal Organization Chart
     - Board/Company Meeting Minutes
     - Recent changes to company structure
     - FSO/ITPSO Appointment Letter
     - KMP Citizenship Verification
     - Signed undated DD Form 441
     - Signed SF 328
   - Required KMPs:
     - SMO
     - FSO
     - ITPSO
     - Chairman of the Board
     - Vice Chair of Board (if applicable)
     - Corporate Officials (if requiring classified access)

5. **ELSE IF entity_type = "public-corporation" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate
     - Articles of Incorporation
     - By-Laws
     - Stock Ledger
     - Most recent SEC filings
     - Legal Organization Chart
     - Board/Company Meeting Minutes
     - Recent changes to company Structure
     - FSO/ITPSO Appointment Letter
     - KMP Citizenship Verification
     - Signed undated DD Form 441
     - Signed SF 328
   - Required KMPs:
     - SMO
     - FSO
     - ITPSO
     - Chairman of the Board
     - Vice Chair of Board (if applicable)
     - Corporate Officials (if requiring classified access)

6. **ELSE IF entity_type = "llc" THEN**
   - Required Documents:
     - Business License
     - Fictitious Name Certificate
     - Certificate of Formation or Articles of Organization
     - Legal Organization Chart
     - Operating Agreement
     - LLC Meeting Minutes
     - Recent changes to company structure
     - FSO/ITPSO Appointment Letter
     - KMP Citizenship Verification
     - Signed undated DD Form 441
     - Signed SF 328
   - Required KMPs:
     - SMO
     - FSO
     - ITPSO
     - LLC Members (if requiring classified access)
     - Managers

## Edge Cases Discovered

- Edge case 1: **Public corporations** require SEC filings that private corporations don't - specifically Forms 10-K, 8-K, and DEF 14A for foreign ownership disclosure
- Edge case 2: **Limited Partners** only need to be identified as KMPs if they will be working on classified contracts - passive investors may be excluded
- Edge case 3: **Sole proprietorships** have the fewest requirements but are rare for FCL due to personal liability concerns
- Edge case 4: **Entity type mismatch** between user selection and SAM.gov registration triggers automatic validation error

## DCSA Compliance Impact

This rule ensures complete documentation submission and proper identification of all individuals who will have access to or influence over classified information. Missing any required document or KMP will result in:
- Application rejection by DCSA
- Processing delays (typical 45-90 day timeline can extend to 180+ days)
- Potential need for complete resubmission
- Risk of contract award delays or loss

## Implementation Notes for New System

### Fresh Approach Recommendations:

1. **Dynamic Form Generation**: Build forms that automatically adjust required fields based on entity type selection
2. **Progressive Disclosure**: Show requirements incrementally to avoid overwhelming users
3. **SAM.gov Pre-validation**: Auto-populate entity type from SAM.gov data to prevent mismatches
4. **Document Checklist UI**: Visual progress tracker showing which documents are uploaded/missing
5. **KMP Role Templates**: Pre-populated role descriptions to ensure proper identification
6. **Validation at Each Step**: Don't wait until submission to catch missing requirements
7. **Smart Help System**: Context-aware tooltips explaining why each document is needed

### AI Enhancement Opportunities:

1. **Document Classification**: Use NLP to verify uploaded documents match requirements
2. **KMP Extraction**: Automatically identify potential KMPs from uploaded org charts
3. **Completeness Scoring**: ML model to predict application approval likelihood
4. **Missing Document Detection**: Proactively identify gaps before submission

## Test Scenarios

1. **Scenario**: User selects LLC but SAM.gov shows Corporation
   - **Expected**: Validation error with clear message about mismatch
   - **Action**: Force user to resolve discrepancy before proceeding

2. **Scenario**: Public company uploads financial statements but not SEC filings
   - **Expected**: Warning that SEC filings (10-K, 8-K, DEF 14A) are specifically required
   - **Action**: Block submission until proper SEC documents uploaded

3. **Scenario**: Partnership identifies only managing partners as KMPs
   - **Expected**: Validation requiring ALL general partners to be listed
   - **Action**: Dynamic form to add additional partner entries

4. **Scenario**: LLC with 3 members lists only FSO and ITPSO
   - **Expected**: Warning that minimum 4 KMPs required (add SMO and Managing Member)
   - **Action**: Suggest missing roles based on entity structure 