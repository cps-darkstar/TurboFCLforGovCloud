# Business Rule: FOCI (Foreign Ownership, Control, or Influence) Assessment

## Purpose
Identifies and evaluates foreign interests that could compromise a company's ability to protect classified information, ensuring national security compliance for facility clearance eligibility.

## Trigger Conditions
- Condition 1: Any foreign ownership stake ≥ 5%
- Condition 2: Foreign nationals on board of directors
- Condition 3: Foreign debt exceeding $10M
- Condition 4: Technology licensing from foreign entities
- Condition 5: Contracts with foreign governments

## Business Logic

### FOCI Determination Matrix

1. **IF foreign_ownership ≥ 5% THEN**
   - Status: FOCI condition exists
   - Required Action: Mitigation plan required
   - Options: SSA, SCA, or Proxy Agreement

2. **ELSE IF foreign_board_members = true THEN**
   - Status: Automatic FOCI condition
   - Required Action: Board resolution excluding foreign members from classified matters
   - Options: Voting Trust Agreement or Proxy Agreement

3. **ELSE IF foreign_debt > $10,000,000 THEN**
   - Status: Financial FOCI condition
   - Required Action: Financial disclosure and mitigation
   - Options: Security Control Agreement with debt monitoring

4. **ELSE IF foreign_technology_licensing = true THEN**
   - Status: Technology FOCI condition
   - Required Action: Technology Control Plan
   - Options: Limited security agreement with technology firewalls

5. **ELSE IF foreign_government_contracts = true THEN**
   - Status: Contractual FOCI condition
   - Required Action: Contract review and isolation measures
   - Options: Special Security Agreement with contract segregation

6. **ELSE no_foci**
   - Status: No FOCI present
   - Required Action: Annual certification of continued status
   - Options: Standard FCL processing

### FOCI Contradiction Detection

**Validation Rule**: Cannot simultaneously select "no-foci" and any FOCI condition
- Error Message: "Contradictory FOCI selections: Cannot have both foreign investors and no FOCI."
- Resolution: Force user to review and correct selections

## Edge Cases Discovered

- Edge case 1: **Indirect foreign ownership** through parent companies or investment funds requires tracing ultimate beneficial ownership
- Edge case 2: **Institutional investors** (mutual funds, index funds) with <10% ownership may be exempted if passive
- Edge case 3: **Treaty country investors** (UK, Canada, Australia) may have streamlined mitigation options
- Edge case 4: **Dual citizens** in key positions trigger FOCI even with US citizenship
- Edge case 5: **Foreign family members** of KMPs may trigger "close and continuing contact" FOCI

## DCSA Compliance Impact

FOCI assessment directly impacts:
- **Eligibility**: Unmitigated FOCI = automatic FCL denial
- **Processing Time**: FOCI cases add 60-120 days to standard timeline
- **Mitigation Costs**: SSA/SCA implementation can cost $50K-$200K
- **Ongoing Compliance**: Annual FOCI reviews and reporting requirements
- **Contract Limitations**: Some contracts prohibited under FOCI mitigation

## Mitigation Strategies Discovered

### 1. Special Security Agreement (SSA)
- For: Significant foreign ownership (>10%)
- Requires: Government-approved board members
- Impact: Most restrictive but allows highest clearance levels

### 2. Security Control Agreement (SCA)
- For: Moderate foreign influence
- Requires: Enhanced security measures
- Impact: Balanced approach for 5-10% ownership

### 3. Proxy Agreement
- For: Complete foreign ownership
- Requires: US citizen proxy holders
- Impact: Foreign owner relinquishes all control

### 4. Voting Trust Agreement
- For: Foreign board influence
- Requires: US trustees for voting rights
- Impact: Preserves ownership while limiting control

## AI-Powered Insights from System

When FOCI conditions detected, system provides:
- **Recommendation**: "Based on your FOCI status, you will likely need a Security Control Agreement (SCA) or Special Security Agreement (SSA). Consider preparing board resolutions and governance modifications."
- **Confidence Level**: 85% (based on pattern matching with similar cases)

## Implementation Notes for New System

### Fresh Approach Recommendations:

1. **FOCI Decision Tree**: Interactive flowchart guiding users through complex FOCI scenarios
2. **Ownership Calculator**: Automated tool to trace indirect foreign ownership
3. **Mitigation Cost Estimator**: Predict compliance costs based on FOCI type
4. **Document Generator**: Auto-create board resolutions and mitigation drafts
5. **FOCI Timeline Predictor**: Show realistic processing times with FOCI
6. **Exemption Checker**: Identify possible exemptions (treaty countries, passive investors)

### Validation Enhancements:

1. **Cross-Reference Checks**: Validate FOCI claims against EDGAR data for public companies
2. **Beneficial Ownership Tracer**: API integration to identify ultimate owners
3. **Contradiction Prevention**: Real-time validation preventing conflicting selections
4. **FOCI Severity Scoring**: Rate FOCI conditions by mitigation complexity

## Test Scenarios

1. **Scenario**: German company owns 15% with board representation
   - **Expected**: Automatic FOCI flagging, SSA recommendation
   - **Validation**: Require board member nationality disclosure

2. **Scenario**: Canadian pension fund owns 8% passively
   - **Expected**: FOCI flag with potential treaty country exemption
   - **Validation**: Verify passive investment status

3. **Scenario**: US company with $50M loan from Japanese bank
   - **Expected**: Financial FOCI requiring debt disclosure
   - **Validation**: Calculate debt-to-asset ratio for severity

4. **Scenario**: Dual US-French citizen as CEO
   - **Expected**: Personnel FOCI requiring mitigation
   - **Validation**: Flag close and continuing foreign contacts

5. **Scenario**: Technology license from Israeli company
   - **Expected**: Technology FOCI with control plan requirement
   - **Validation**: Assess classified program intersection 