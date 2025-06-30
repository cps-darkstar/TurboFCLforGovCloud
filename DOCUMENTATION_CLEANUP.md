# Documentation Cleanup Plan

## Files Identified for Removal

The following files contain outdated information that conflicts with the new enterprise architecture and should be archived or removed:

### Legacy Documentation Files

1. **TURBOFCL_GOVCLOUD_README.md** - Outdated AI-focused description, conflicts with enterprise architecture
2. **turbofcl-deployment-guide.md** - Legacy deployment guide, superseded by enterprise infrastructure
3. **cost-optimization.md** - Outdated cost analysis, no longer applicable to enterprise architecture

### Extracted Knowledge Base (Outdated)

The `extracted_knowledge/` directory contains files from January 2025 that predate the enterprise overhaul:

- `BUSINESS_RULES_FCL_Requirements_20250127.md`
- `BUSINESS_RULES_FOCI_Assessment_20250127.md`
- `FCL_Knowledge_Summary_20250127.md`
- `INTEGRATION_External_Systems_20250127.md`
- `VALIDATION_Field_Requirements_20250127.md`
- `WORKFLOW_FCL_Application_Process_20250127.md`

These files represent requirements gathering from the pre-enterprise phase and may contain outdated assumptions.

## Recommended Actions

### Immediate Removal

- Move legacy README files to `docs/archive/` directory
- Remove outdated deployment and cost optimization guides
- Archive extracted knowledge files with clear version labeling

### Documentation Migration

- Extract still-relevant requirements from archived files
- Integrate valid business rules into new enterprise documentation
- Update all references to point to current enterprise documentation

## New Documentation Structure

### Current Documentation (Keep & Maintain)

- `README.md` - Main project overview (updated)
- `VERSION.md` - Versioning schema (updated)
- `CHANGELOG.md` - Change history (updated)
- `docs/README.md` - Documentation index
- `ENTERPRISE_IMPLEMENTATION_STATUS.md` - Current implementation status

### Planned Documentation (To Create)

- `docs/INSTALLATION.md` - Enterprise installation guide
- `docs/CONFIGURATION.md` - Configuration management
- `docs/DEPLOYMENT.md` - Production deployment for enterprise
- `docs/USER_GUIDE.md` - End-user documentation
- `docs/ADMIN_GUIDE.md` - System administration
- `docs/API.md` - Complete API reference
- `docs/SECURITY.md` - Security architecture
- `docs/COMPLIANCE.md` - Regulatory compliance documentation

## Cleanup Execution

Execute the cleanup by:

1. Creating archive directory structure
2. Moving outdated files to archive with proper version labeling
3. Updating all internal references
4. Creating redirect notices for major documentation moves
5. Updating the main README to reflect new documentation structure
