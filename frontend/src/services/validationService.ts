/**
 * Enterprise Validation Service
 * 
 * This service provides comprehensive validation capabilities for the
 * TurboFCL enterprise system, ensuring data integrity and compliance
 * with business rules and regulatory requirements.
 */

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'date' | 'numeric' | 'regex' | 'custom' | 'clearance' | 'business';
  value?: any;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fieldResults: Record<string, FieldValidationResult>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error';
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning';
  value?: any;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  value?: any;
  normalizedValue?: any;
}

export interface BusinessValidationContext {
  entityType?: string;
  clearanceLevel?: string;
  userRoles?: string[];
  complianceRequirements?: string[];
}

class ValidationService {
  private customValidators: Map<string, (value: any, context?: any) => Promise<ValidationResult>> = new Map();
  private businessRules: Map<string, (value: any, context: BusinessValidationContext) => Promise<ValidationResult>> = new Map();

  constructor() {
    this.initializeDefaultValidators();
    this.initializeBusinessRules();
  }

  private initializeDefaultValidators(): void {
    // Register custom validators
    this.registerValidator('ein', this.validateEIN.bind(this));
    this.registerValidator('duns', this.validateDUNS.bind(this));
    this.registerValidator('cage_code', this.validateCAGECode.bind(this));
    this.registerValidator('security_clearance', this.validateSecurityClearance.bind(this));
    this.registerValidator('classification', this.validateClassification.bind(this));
  }

  private initializeBusinessRules(): void {
    // Register business rules
    this.registerBusinessRule('foci_ownership', this.validateFOCIOwnership.bind(this));
    this.registerBusinessRule('facility_clearance', this.validateFacilityClearance.bind(this));
    this.registerBusinessRule('compliance_status', this.validateComplianceStatus.bind(this));
  }

  /**
   * Register a custom validator
   */
  registerValidator(
    name: string,
    validator: (value: any, context?: any) => Promise<ValidationResult>
  ): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Register a business rule validator
   */
  registerBusinessRule(
    name: string,
    rule: (value: any, context: BusinessValidationContext) => Promise<ValidationResult>
  ): void {
    this.businessRules.set(name, rule);
  }

  /**
   * Validate a single field
   */
  async validateField(
    value: any,
    rules: ValidationRule[],
    context?: BusinessValidationContext
  ): Promise<FieldValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let normalizedValue = value;

    for (const rule of rules) {
      try {
        const result = await this.applyValidationRule(value, rule, context);
        
        if (!result.isValid) {
          if (result.errors.length > 0) {
            errors.push(...result.errors.map(e => e.message));
          }
          if (result.warnings.length > 0) {
            warnings.push(...result.warnings.map(w => w.message));
          }
        }

        // Apply normalization if the validator provides it
        if (result.fieldResults && Object.keys(result.fieldResults).length > 0) {
          const fieldResult = Object.values(result.fieldResults)[0];
          if (fieldResult.normalizedValue !== undefined) {
            normalizedValue = fieldResult.normalizedValue;
          }
        }
      } catch (error) {
        errors.push(`Validation error: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      value,
      normalizedValue
    };
  }

  /**
   * Validate an entire object
   */
  async validateObject(
    data: Record<string, any>,
    validationSchema: Record<string, ValidationRule[]>,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fieldResults: Record<string, FieldValidationResult> = {};

    // Validate each field
    for (const [field, rules] of Object.entries(validationSchema)) {
      const value = data[field];
      const fieldResult = await this.validateField(value, rules, context);
      
      fieldResults[field] = fieldResult;

      // Convert field errors to validation errors
      fieldResult.errors.forEach(message => {
        errors.push({
          field,
          message,
          code: this.generateErrorCode(field, message),
          severity: 'error',
          value
        });
      });

      // Convert field warnings to validation warnings
      fieldResult.warnings.forEach(message => {
        warnings.push({
          field,
          message,
          code: this.generateWarningCode(field, message),
          severity: 'warning',
          value
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldResults
    };
  }

  /**
   * Validate business entity data
   */
  async validateBusinessEntity(
    entityData: Record<string, any>,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    const validationSchema: Record<string, ValidationRule[]> = {
      name: [
        { field: 'name', type: 'required', message: 'Business entity name is required' }
      ],
      entity_type: [
        { field: 'entity_type', type: 'required', message: 'Entity type is required' }
      ],
      duns_number: [
        { field: 'duns_number', type: 'custom', value: 'duns', message: 'Invalid DUNS number format' }
      ],
      ein: [
        { field: 'ein', type: 'custom', value: 'ein', message: 'Invalid EIN format' }
      ],
      cage_code: [
        { field: 'cage_code', type: 'custom', value: 'cage_code', message: 'Invalid CAGE code format' }
      ]
    };

    return await this.validateObject(entityData, validationSchema, context);
  }

  /**
   * Validate FCL application data
   */
  async validateFCLApplication(
    applicationData: Record<string, any>,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    const validationSchema: Record<string, ValidationRule[]> = {
      facility_name: [
        { field: 'facility_name', type: 'required', message: 'Facility name is required' }
      ],
      clearance_level: [
        { field: 'clearance_level', type: 'custom', value: 'security_clearance', message: 'Invalid security clearance level' }
      ],
      purpose: [
        { field: 'purpose', type: 'required', message: 'Purpose is required' }
      ],
      estimated_start_date: [
        { field: 'estimated_start_date', type: 'date', message: 'Invalid start date' }
      ],
      estimated_end_date: [
        { field: 'estimated_end_date', type: 'date', message: 'Invalid end date' }
      ]
    };

    const result = await this.validateObject(applicationData, validationSchema, context);

    // Business rule validation
    if (applicationData.estimated_start_date && applicationData.estimated_end_date) {
      const startDate = new Date(applicationData.estimated_start_date);
      const endDate = new Date(applicationData.estimated_end_date);
      
      if (endDate <= startDate) {
        result.errors.push({
          field: 'estimated_end_date',
          message: 'End date must be after start date',
          code: 'DATE_RANGE_INVALID',
          severity: 'error',
          value: applicationData.estimated_end_date
        });
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate FOCI assessment data
   */
  async validateFOCIAssessment(
    assessmentData: Record<string, any>,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    const validationSchema: Record<string, ValidationRule[]> = {
      assessment_type: [
        { field: 'assessment_type', type: 'required', message: 'Assessment type is required' }
      ],
      scope: [
        { field: 'scope', type: 'required', message: 'Assessment scope is required' }
      ]
    };

    const result = await this.validateObject(assessmentData, validationSchema, context);

    // Apply FOCI-specific business rules
    if (context) {
      const businessRuleResult = await this.applyBusinessRule('foci_ownership', assessmentData, context);
      this.mergeValidationResults(result, businessRuleResult);
    }

    return result;
  }

  // Private validation methods

  private async applyValidationRule(
    value: any,
    rule: ValidationRule,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule);
      
      case 'email':
        return this.validateEmail(value, rule);
      
      case 'phone':
        return this.validatePhone(value, rule);
      
      case 'date':
        return this.validateDate(value, rule);
      
      case 'numeric':
        return this.validateNumeric(value, rule);
      
      case 'regex':
        return this.validateRegex(value, rule);
      
      case 'custom':
        return await this.applyCustomValidator(value, rule, context);
      
      case 'business':
        return await this.applyBusinessRule(rule.value, value, context);
      
      default:
        return {
          isValid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
    }
  }

  private validateRequired(value: any, rule: ValidationRule): ValidationResult {
    const isValid = value !== null && value !== undefined && value !== '';
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || `${rule.field} is required`,
        code: 'REQUIRED_FIELD_MISSING',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private validateEmail(value: any, rule: ValidationRule): ValidationResult {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private validatePhone(value: any, rule: ValidationRule): ValidationResult {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const phoneRegex = /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
    const isValid = phoneRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || 'Invalid phone number format',
        code: 'INVALID_PHONE_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private validateDate(value: any, rule: ValidationRule): ValidationResult {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const date = new Date(value);
    const isValid = !isNaN(date.getTime());
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || 'Invalid date format',
        code: 'INVALID_DATE_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private validateNumeric(value: any, rule: ValidationRule): ValidationResult {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const isValid = !isNaN(Number(value));
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || 'Must be a valid number',
        code: 'INVALID_NUMERIC_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private validateRegex(value: any, rule: ValidationRule): ValidationResult {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const regex = new RegExp(rule.value);
    const isValid = regex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: rule.field,
        message: rule.message || 'Invalid format',
        code: 'REGEX_VALIDATION_FAILED',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private async applyCustomValidator(
    value: any,
    rule: ValidationRule,
    context?: any
  ): Promise<ValidationResult> {
    const validator = this.customValidators.get(rule.value);
    if (!validator) {
      return {
        isValid: false,
        errors: [{
          field: rule.field,
          message: `Unknown validator: ${rule.value}`,
          code: 'UNKNOWN_VALIDATOR',
          severity: 'error' as const,
          value
        }],
        warnings: [],
        fieldResults: {}
      };
    }
    
    return await validator(value, context);
  }

  private async applyBusinessRule(
    ruleName: string,
    value: any,
    context?: BusinessValidationContext
  ): Promise<ValidationResult> {
    const rule = this.businessRules.get(ruleName);
    if (!rule) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        fieldResults: {}
      };
    }
    
    return await rule(value, context || {});
  }

  // Custom validators

  private async validateEIN(value: any): Promise<ValidationResult> {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const einRegex = /^\d{2}-\d{7}$/;
    const isValid = einRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: 'ein',
        message: 'EIN must be in format XX-XXXXXXX',
        code: 'INVALID_EIN_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private async validateDUNS(value: any): Promise<ValidationResult> {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const dunsRegex = /^\d{9}$/;
    const isValid = dunsRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: 'duns_number',
        message: 'DUNS number must be 9 digits',
        code: 'INVALID_DUNS_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private async validateCAGECode(value: any): Promise<ValidationResult> {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const cageRegex = /^[A-Z0-9]{5}$/;
    const isValid = cageRegex.test(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: 'cage_code',
        message: 'CAGE code must be 5 alphanumeric characters',
        code: 'INVALID_CAGE_CODE_FORMAT',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private async validateSecurityClearance(value: any): Promise<ValidationResult> {
    if (!value) return { isValid: true, errors: [], warnings: [], fieldResults: {} };
    
    const validClearances = ['CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'SCI', 'SAP'];
    const isValid = validClearances.includes(value);
    
    return {
      isValid,
      errors: isValid ? [] : [{
        field: 'clearance_level',
        message: 'Invalid security clearance level',
        code: 'INVALID_CLEARANCE_LEVEL',
        severity: 'error' as const,
        value
      }],
      warnings: [],
      fieldResults: {}
    };
  }

  private async validateClassification(value: any): Promise<ValidationResult> {
    return await this.validateSecurityClearance(value);
  }

  // Business rule validators

  private async validateFOCIOwnership(
    value: any,
    context: BusinessValidationContext
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];
    
    // Check for foreign ownership thresholds
    if (value && typeof value === 'object' && value.foreign_ownership_percentage) {
      const percentage = parseFloat(value.foreign_ownership_percentage);
      
      if (percentage > 25) {
        warnings.push({
          field: 'foreign_ownership_percentage',
          message: 'Foreign ownership exceeds 25% threshold - additional FOCI mitigation may be required',
          code: 'FOCI_THRESHOLD_EXCEEDED',
          severity: 'warning',
          value: percentage
        });
      }
    }
    
    return {
      isValid: true,
      errors: [],
      warnings,
      fieldResults: {}
    };
  }

  private async validateFacilityClearance(
    value: any,
    context: BusinessValidationContext
  ): Promise<ValidationResult> {
    // Implement facility clearance business rules
    return {
      isValid: true,
      errors: [],
      warnings: [],
      fieldResults: {}
    };
  }

  private async validateComplianceStatus(
    value: any,
    context: BusinessValidationContext
  ): Promise<ValidationResult> {
    // Implement compliance status business rules
    return {
      isValid: true,
      errors: [],
      warnings: [],
      fieldResults: {}
    };
  }

  // Helper methods

  private generateErrorCode(field: string, message: string): string {
    return `${field.toUpperCase()}_ERROR_${Date.now()}`;
  }

  private generateWarningCode(field: string, message: string): string {
    return `${field.toUpperCase()}_WARNING_${Date.now()}`;
  }

  private mergeValidationResults(target: ValidationResult, source: ValidationResult): void {
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.isValid = target.isValid && source.isValid;
    Object.assign(target.fieldResults, source.fieldResults);
  }
}

// Export singleton instance
export const validationService = new ValidationService();
export default validationService;
