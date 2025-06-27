/**
 * TurboFCL Validation Hooks
 * Implements all validation logic from extracted knowledge
 */

import { useState, useCallback, useEffect } from 'react';
import {
  VALIDATION_PATTERNS,
  ERROR_MESSAGES,
  ENTITY_REQUIREMENTS,
  SAM_TO_ENTITY_MAP,
  FOCI_CONDITIONS,
  FOCI_THRESHOLDS,
  EntityType
} from '../constants/businessRules';
import { ApplicationData, ValidationIssue } from '../types/turbofcl';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// Field-level validation functions
export const validateUEI = (uei: string): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!uei) {
    return { isValid: true, errors, warnings }; // Optional field
  }

  // Convert to uppercase for validation
  const upperUEI = uei.toUpperCase();

  if (!VALIDATION_PATTERNS.UEI.test(upperUEI)) {
    errors.push({
      type: 'error',
      field: 'uei',
      message: ERROR_MESSAGES.INVALID_UEI_FORMAT,
      source: 'Field Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateCompanyName = (name: string): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      type: 'error',
      field: 'companyName',
      message: 'Company name is required',
      source: 'Field Validation'
    });
  } else if (name.length > VALIDATION_PATTERNS.COMPANY_NAME_MAX_LENGTH) {
    errors.push({
      type: 'error',
      field: 'companyName',
      message: `Company name must be less than ${VALIDATION_PATTERNS.COMPANY_NAME_MAX_LENGTH} characters`,
      source: 'Field Validation'
    });
  }

  // Check for special characters that need escaping
  const specialChars = ['&', '.', '-', "'"];
  const hasSpecialChars = specialChars.some(char => name.includes(char));
  if (hasSpecialChars) {
    warnings.push({
      type: 'warning',
      field: 'companyName',
      message: 'Company name contains special characters. Ensure it matches your SAM.gov registration exactly.',
      source: 'Field Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Cross-field validation
export const validateEntityTypeSAMMatch = (
  selectedType: EntityType,
  samEntityStructure?: string
): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!samEntityStructure) {
    return { isValid: true, errors, warnings };
  }

  const expectedType = SAM_TO_ENTITY_MAP[samEntityStructure.toUpperCase()];
  
  if (!expectedType) {
    warnings.push({
      type: 'warning',
      field: 'entityType',
      message: `Unknown SAM.gov entity structure: ${samEntityStructure}`,
      source: 'SAM.gov Validation'
    });
  } else if (expectedType !== selectedType) {
    errors.push({
      type: 'error',
      field: 'entityType',
      message: ERROR_MESSAGES.ENTITY_TYPE_MISMATCH
        .replace('{samType}', samEntityStructure)
        .replace('{userType}', selectedType),
      source: 'SAM.gov Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// FOCI validation
export const validateFOCIStatus = (fociStatus: string[]): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check for contradictions
  if (fociStatus.includes(FOCI_CONDITIONS.NO_FOCI) && fociStatus.length > 1) {
    errors.push({
      type: 'error',
      field: 'fociStatus',
      message: ERROR_MESSAGES.FOCI_CONTRADICTION,
      source: 'FOCI Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// KMP validation
export const validateKMPCount = (
  entityType: EntityType,
  kmpCount: number
): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const requirements = ENTITY_REQUIREMENTS[entityType];
  if (!requirements) {
    return { isValid: true, errors, warnings };
  }

  if (kmpCount < requirements.minKmpCount) {
    errors.push({
      type: 'error',
      field: 'kmps',
      message: ERROR_MESSAGES.INSUFFICIENT_KMPS
        .replace('{entityType}', entityType)
        .replace('{minCount}', requirements.minKmpCount.toString()),
      source: 'KMP Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Document validation
export const validateDocument = (file: File): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check file size
  const maxSizeBytes = VALIDATION_PATTERNS.DOCUMENT_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push({
      type: 'error',
      field: 'document',
      message: ERROR_MESSAGES.DOCUMENT_SIZE_EXCEEDED,
      source: 'Document Validation'
    });
  }

  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!VALIDATION_PATTERNS.ALLOWED_DOCUMENT_TYPES.includes(fileExtension)) {
    errors.push({
      type: 'error',
      field: 'document',
      message: ERROR_MESSAGES.INVALID_FILE_TYPE,
      source: 'Document Validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Main validation hook
export const useApplicationValidation = (applicationData: ApplicationData) => {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    fieldErrors: Record<string, ValidationIssue[]>;
  }>({
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {}
  });

  const validateField = useCallback((fieldName: string, value: any) => {
    let result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    switch (fieldName) {
      case 'uei':
        result = validateUEI(value);
        break;
      case 'companyName':
        result = validateCompanyName(value);
        break;
      case 'entityType':
        if (applicationData.samData?.entityStructure) {
          result = validateEntityTypeSAMMatch(value, applicationData.samData.entityStructure);
        }
        break;
      case 'fociStatus':
        result = validateFOCIStatus(value);
        break;
      case 'kmps':
        if (applicationData.entityType) {
          result = validateKMPCount(applicationData.entityType as EntityType, value.length);
        }
        break;
    }

    return result;
  }, [applicationData.samData, applicationData.entityType]);

  const validateAll = useCallback(() => {
    const allErrors: ValidationIssue[] = [];
    const allWarnings: ValidationIssue[] = [];
    const fieldErrors: Record<string, ValidationIssue[]> = {};

    // Validate each field
    const fieldsToValidate = [
      { name: 'companyName', value: applicationData.companyName },
      { name: 'uei', value: applicationData.uei },
      { name: 'entityType', value: applicationData.entityType },
      { name: 'fociStatus', value: applicationData.fociStatus },
      { name: 'kmps', value: applicationData.kmps }
    ];

    fieldsToValidate.forEach(({ name, value }) => {
      const result = validateField(name, value);
      
      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
        fieldErrors[name] = result.errors;
      }
      
      if (result.warnings.length > 0) {
        allWarnings.push(...result.warnings);
      }
    });

    // Additional cross-field validations
    if (applicationData.entityType === 'public-corporation' && 
        !applicationData.edgarData?.filings?.length) {
      allErrors.push({
        type: 'error',
        field: 'documents',
        message: ERROR_MESSAGES.MISSING_SEC_FILINGS,
        source: 'Cross-field Validation'
      });
    }

    setValidationState({
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      fieldErrors
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }, [applicationData, validateField]);

  // Auto-validate on data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAll();
    }, 500); // Debounce validation

    return () => clearTimeout(timeoutId);
  }, [applicationData, validateAll]);

  return {
    ...validationState,
    validateField,
    validateAll,
    validateDocument
  };
};

// FOCI assessment hook
export const useFOCIAssessment = (ownershipData: {
  foreignOwnershipPercentage?: number;
  foreignDebt?: number;
  hasForeignBoardMembers?: boolean;
  hasForeignTechnology?: boolean;
  hasForeignContracts?: boolean;
}) => {
  const [fociAssessment, setFOCIAssessment] = useState<{
    hasFOCI: boolean;
    conditions: string[];
    mitigationRequired?: string;
    processingTimeImpact: string;
  }>({
    hasFOCI: false,
    conditions: [],
    processingTimeImpact: '45-90 days'
  });

  useEffect(() => {
    const conditions: string[] = [];
    let mitigationRequired: string | undefined;

    // Check foreign ownership percentage
    const foreignOwnership = ownershipData.foreignOwnershipPercentage || 0;
    if (foreignOwnership >= FOCI_THRESHOLDS.FOREIGN_OWNERSHIP_PERCENTAGE) {
      conditions.push(FOCI_CONDITIONS.FOREIGN_OWNERSHIP);
      
      if (foreignOwnership >= FOCI_THRESHOLDS.MITIGATION_OWNERSHIP_HIGH) {
        mitigationRequired = 'SSA'; // Special Security Agreement
      } else {
        mitigationRequired = 'SCA'; // Security Control Agreement
      }
    }

    // Check foreign debt
    const foreignDebt = ownershipData.foreignDebt || 0;
    if (foreignDebt > FOCI_THRESHOLDS.FOREIGN_DEBT_THRESHOLD) {
      conditions.push(FOCI_CONDITIONS.FOREIGN_DEBT);
      if (!mitigationRequired) {
        mitigationRequired = 'SCA';
      }
    }

    // Check board members
    if (ownershipData.hasForeignBoardMembers) {
      conditions.push(FOCI_CONDITIONS.FOREIGN_BOARD_MEMBERS);
      if (!mitigationRequired) {
        mitigationRequired = 'VTA'; // Voting Trust Agreement
      }
    }

    // Check technology and contracts
    if (ownershipData.hasForeignTechnology) {
      conditions.push(FOCI_CONDITIONS.FOREIGN_TECHNOLOGY);
      if (!mitigationRequired) {
        mitigationRequired = 'LSA'; // Limited Security Agreement
      }
    }

    if (ownershipData.hasForeignContracts) {
      conditions.push(FOCI_CONDITIONS.FOREIGN_CONTRACTS);
      if (!mitigationRequired) {
        mitigationRequired = 'LSA';
      }
    }

    const hasFOCI = conditions.length > 0;
    const processingTimeImpact = hasFOCI ? '60-120 days' : '45-90 days';

    setFOCIAssessment({
      hasFOCI,
      conditions,
      mitigationRequired,
      processingTimeImpact
    });
  }, [ownershipData]);

  return fociAssessment;
}; 