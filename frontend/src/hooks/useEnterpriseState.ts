/**
 * Enterprise Application State Management for TurboFCL
 * Comprehensive state management with audit trails and validation
 */

import { auditLogger } from '@/services/auditService';
import { complianceService } from '@/services/complianceService';
import { encryptionService } from '@/services/encryptionService';
import { validationService } from '@/services/validationService';
import {
    ApplicationAction,
    ApplicationState,
    ApplicationStep,
    AuditEvent,
    AuditEventType,
    ClassificationLevel,
    SubmissionStatus,
    ValidationResult
} from '@/types/enterprise';
import { useCallback, useEffect, useReducer, useRef } from 'react';

// Action types for enterprise state management
export enum ApplicationActionType {
  // Navigation actions
  SET_CURRENT_STEP = 'SET_CURRENT_STEP',
  NAVIGATE_TO_STEP = 'NAVIGATE_TO_STEP',
  COMPLETE_STEP = 'COMPLETE_STEP',
  
  // Entity data actions
  UPDATE_ENTITY_DATA = 'UPDATE_ENTITY_DATA',
  VALIDATE_ENTITY_DATA = 'VALIDATE_ENTITY_DATA',
  ENCRYPT_SENSITIVE_DATA = 'ENCRYPT_SENSITIVE_DATA',
  
  // FOCI assessment actions
  START_FOCI_ASSESSMENT = 'START_FOCI_ASSESSMENT',
  UPDATE_FOCI_ASSESSMENT = 'UPDATE_FOCI_ASSESSMENT',
  COMPLETE_FOCI_ASSESSMENT = 'COMPLETE_FOCI_ASSESSMENT',
  
  // Document management actions
  UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
  VALIDATE_DOCUMENT = 'VALIDATE_DOCUMENT',
  REMOVE_DOCUMENT = 'REMOVE_DOCUMENT',
  
  // Validation actions
  ADD_VALIDATION_RESULT = 'ADD_VALIDATION_RESULT',
  CLEAR_VALIDATION_RESULTS = 'CLEAR_VALIDATION_RESULTS',
  RESOLVE_VALIDATION_ERROR = 'RESOLVE_VALIDATION_ERROR',
  
  // Submission actions
  UPDATE_SUBMISSION_STATUS = 'UPDATE_SUBMISSION_STATUS',
  SUBMIT_APPLICATION = 'SUBMIT_APPLICATION',
  SAVE_DRAFT = 'SAVE_DRAFT',
  
  // Audit actions
  LOG_USER_ACTION = 'LOG_USER_ACTION',
  LOG_SECURITY_EVENT = 'LOG_SECURITY_EVENT',
  LOG_COMPLIANCE_EVENT = 'LOG_COMPLIANCE_EVENT',
  
  // Error handling
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  // Reset actions
  RESET_APPLICATION = 'RESET_APPLICATION',
  LOAD_SAVED_APPLICATION = 'LOAD_SAVED_APPLICATION'
}

// Enhanced application action interface
export interface EnterpriseApplicationAction extends ApplicationAction {
  type: ApplicationActionType;
  payload?: any;
  metadata?: {
    timestamp: string;
    userId?: string;
    sessionId: string;
    classification: ClassificationLevel;
    auditRequired?: boolean;
    encryptionRequired?: boolean;
  };
}

// Enterprise configuration for state management
interface EnterpriseStateConfig {
  enableAuditLogging: boolean;
  encryptSensitiveData: boolean;
  validateStateTransitions: boolean;
  classification: ClassificationLevel;
  autoSaveInterval?: number;
  maxValidationErrors?: number;
  complianceMode: 'STANDARD' | 'ENHANCED' | 'MAXIMUM';
}

// Initial application state
const createInitialState = (config: EnterpriseStateConfig): ApplicationState => ({
  currentStep: ApplicationStep.COMPANY_IDENTIFICATION,
  entity: {},
  fociAssessment: undefined,
  documents: [],
  validationResults: [],
  submissionStatus: SubmissionStatus.DRAFT,
  metadata: {
    sessionId: crypto.randomUUID(),
    userId: '',
    classification: config.classification,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: 1,
    userAgent: navigator.userAgent,
    auditTrail: []
  }
});

// Enterprise state reducer with comprehensive validation
const enterpriseApplicationReducer = (
  state: ApplicationState, 
  action: EnterpriseApplicationAction
): ApplicationState => {
  const timestamp = new Date().toISOString();
  
  // Create audit event for this action
  const auditEvent: AuditEvent = {
    eventId: crypto.randomUUID(),
    timestamp,
    eventType: mapActionToAuditEvent(action.type),
    userId: action.metadata?.userId || state.metadata.userId,
    sessionId: action.metadata?.sessionId || state.metadata.sessionId,
    description: `Application state updated: ${action.type}`,
    metadata: {
      actionType: action.type,
      payload: sanitizeForAudit(action.payload),
      previousStep: state.currentStep
    },
    riskLevel: determineRiskLevel(action.type, action.payload)
  };

  // Base state update
  let newState: ApplicationState = {
    ...state,
    metadata: {
      ...state.metadata,
      lastModified: timestamp,
      version: state.metadata.version + 1,
      auditTrail: [...state.metadata.auditTrail, auditEvent]
    }
  };

  // Process action based on type
  switch (action.type) {
    case ApplicationActionType.SET_CURRENT_STEP:
      return {
        ...newState,
        currentStep: action.payload.step
      };

    case ApplicationActionType.NAVIGATE_TO_STEP:
      // Validate step transition
      const isValidTransition = validateStepTransition(state.currentStep, action.payload.step);
      if (!isValidTransition) {
        return {
          ...newState,
          validationResults: [
            ...state.validationResults,
            createValidationError('STEP_TRANSITION_INVALID', `Cannot navigate from ${state.currentStep} to ${action.payload.step}`)
          ]
        };
      }
      
      return {
        ...newState,
        currentStep: action.payload.step
      };

    case ApplicationActionType.UPDATE_ENTITY_DATA:
      const updatedEntity = {
        ...state.entity,
        ...action.payload.data
      };
      
      return {
        ...newState,
        entity: updatedEntity,
        submissionStatus: SubmissionStatus.IN_PROGRESS
      };

    case ApplicationActionType.START_FOCI_ASSESSMENT:
      return {
        ...newState,
        fociAssessment: {
          assessmentId: crypto.randomUUID(),
          entityId: state.entity.id || '',
          assessmentDate: timestamp,
          assessorId: action.metadata?.userId || '',
          assessmentType: action.payload.assessmentType || 'INITIAL',
          riskLevel: 'NONE',
          riskScore: 0,
          indicators: [],
          mitigationMeasures: [],
          complianceGaps: [],
          recommendations: [],
          nextReviewDate: '',
          dccsaSubmissionRequired: false,
          validationStatus: 'PENDING',
          metadata: {
            methodology: 'Enterprise FOCI Assessment v2.0',
            toolsUsed: ['TurboFCL Enterprise'],
            dataSourcesConsulted: ['SAM.gov', 'Entity Records'],
            assumptions: [],
            limitations: [],
            confidenceLevel: 'MEDIUM',
            qualityAssurance: {
              reviewedBy: '',
              reviewDate: '',
              approvedBy: '',
              approvalDate: ''
            }
          }
        }
      };

    case ApplicationActionType.UPDATE_FOCI_ASSESSMENT:
      if (!state.fociAssessment) {
        return newState;
      }
      
      return {
        ...newState,
        fociAssessment: {
          ...state.fociAssessment,
          ...action.payload.data
        }
      };

    case ApplicationActionType.UPLOAD_DOCUMENT:
      return {
        ...newState,
        documents: [
          ...state.documents,
          {
            documentId: crypto.randomUUID(),
            documentType: action.payload.documentType,
            fileName: action.payload.fileName,
            fileSize: action.payload.fileSize,
            contentType: action.payload.contentType,
            classification: action.payload.classification || newState.metadata.classification,
            uploadedAt: timestamp,
            uploadedBy: action.metadata?.userId || '',
            validationStatus: 'PENDING',
            requiredFor: action.payload.requiredFor || [],
            metadata: {
              checksum: action.payload.checksum,
              encryptionStatus: 'ENCRYPTED_AT_REST',
              retentionPeriod: 2555, // 7 years in days
              accessLevel: 'CONFIDENTIAL',
              virusScanStatus: 'PENDING'
            }
          }
        ]
      };

    case ApplicationActionType.ADD_VALIDATION_RESULT:
      return {
        ...newState,
        validationResults: [
          ...state.validationResults,
          {
            validationId: crypto.randomUUID(),
            validationType: action.payload.validationType,
            status: action.payload.status,
            severity: action.payload.severity,
            message: action.payload.message,
            field: action.payload.field,
            suggestions: action.payload.suggestions || [],
            regulatoryReference: action.payload.regulatoryReference,
            timestamp
          }
        ]
      };

    case ApplicationActionType.CLEAR_VALIDATION_RESULTS:
      return {
        ...newState,
        validationResults: action.payload?.field 
          ? state.validationResults.filter(v => v.field !== action.payload.field)
          : []
      };

    case ApplicationActionType.UPDATE_SUBMISSION_STATUS:
      return {
        ...newState,
        submissionStatus: action.payload.status
      };

    case ApplicationActionType.RESET_APPLICATION:
      return createInitialState({
        enableAuditLogging: true,
        encryptSensitiveData: true,
        validateStateTransitions: true,
        classification: newState.metadata.classification,
        complianceMode: 'ENHANCED'
      });

    default:
      return newState;
  }
};

// Utility functions
function mapActionToAuditEvent(actionType: ApplicationActionType): AuditEventType {
  const mapping: Record<ApplicationActionType, AuditEventType> = {
    [ApplicationActionType.SET_CURRENT_STEP]: AuditEventType.USER_ACTION,
    [ApplicationActionType.NAVIGATE_TO_STEP]: AuditEventType.USER_ACTION,
    [ApplicationActionType.UPDATE_ENTITY_DATA]: AuditEventType.ENTITY_UPDATED,
    [ApplicationActionType.START_FOCI_ASSESSMENT]: AuditEventType.FOCI_ASSESSMENT_STARTED,
    [ApplicationActionType.COMPLETE_FOCI_ASSESSMENT]: AuditEventType.FOCI_ASSESSMENT_COMPLETED,
    [ApplicationActionType.UPLOAD_DOCUMENT]: AuditEventType.DOCUMENT_UPLOADED,
    [ApplicationActionType.SUBMIT_APPLICATION]: AuditEventType.SUBMISSION_CREATED,
    // ... add more mappings
  };
  
  return mapping[actionType] || AuditEventType.USER_ACTION;
}

function determineRiskLevel(actionType: ApplicationActionType, payload: any): string {
  // Determine risk level based on action and payload
  const highRiskActions = [
    ApplicationActionType.ENCRYPT_SENSITIVE_DATA,
    ApplicationActionType.SUBMIT_APPLICATION,
    ApplicationActionType.LOG_SECURITY_EVENT
  ];
  
  if (highRiskActions.includes(actionType)) {
    return 'HIGH';
  }
  
  return 'LOW';
}

function sanitizeForAudit(payload: any): any {
  if (!payload) return payload;
  
  // Remove sensitive data from audit logs
  const sanitized = { ...payload };
  const sensitiveFields = ['taxId', 'ssn', 'password', 'token'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function validateStepTransition(currentStep: ApplicationStep, targetStep: ApplicationStep): boolean {
  // Define valid step transitions
  const validTransitions: Record<ApplicationStep, ApplicationStep[]> = {
    [ApplicationStep.COMPANY_IDENTIFICATION]: [
      ApplicationStep.ENTITY_STRUCTURE,
      ApplicationStep.COMPANY_IDENTIFICATION
    ],
    [ApplicationStep.ENTITY_STRUCTURE]: [
      ApplicationStep.OWNERSHIP_ANALYSIS,
      ApplicationStep.COMPANY_IDENTIFICATION,
      ApplicationStep.ENTITY_STRUCTURE
    ],
    [ApplicationStep.OWNERSHIP_ANALYSIS]: [
      ApplicationStep.FOCI_ASSESSMENT,
      ApplicationStep.ENTITY_STRUCTURE,
      ApplicationStep.OWNERSHIP_ANALYSIS
    ],
    [ApplicationStep.FOCI_ASSESSMENT]: [
      ApplicationStep.KMP_IDENTIFICATION,
      ApplicationStep.OWNERSHIP_ANALYSIS,
      ApplicationStep.FOCI_ASSESSMENT
    ],
    [ApplicationStep.KMP_IDENTIFICATION]: [
      ApplicationStep.DOCUMENT_UPLOAD,
      ApplicationStep.FOCI_ASSESSMENT,
      ApplicationStep.KMP_IDENTIFICATION
    ],
    [ApplicationStep.DOCUMENT_UPLOAD]: [
      ApplicationStep.AI_VALIDATION,
      ApplicationStep.KMP_IDENTIFICATION,
      ApplicationStep.DOCUMENT_UPLOAD
    ],
    [ApplicationStep.AI_VALIDATION]: [
      ApplicationStep.FINAL_REVIEW,
      ApplicationStep.DOCUMENT_UPLOAD,
      ApplicationStep.AI_VALIDATION
    ],
    [ApplicationStep.FINAL_REVIEW]: [
      ApplicationStep.SUBMISSION,
      ApplicationStep.AI_VALIDATION,
      ApplicationStep.FINAL_REVIEW
    ],
    [ApplicationStep.SUBMISSION]: [
      ApplicationStep.SUBMISSION
    ]
  };
  
  return validTransitions[currentStep]?.includes(targetStep) || false;
}

function createValidationError(code: string, message: string): ValidationResult {
  return {
    validationId: crypto.randomUUID(),
    validationType: 'BUSINESS_RULE',
    status: 'FAILED',
    severity: 'ERROR',
    message,
    suggestions: [],
    timestamp: new Date().toISOString()
  };
}

// Main hook for enterprise application state
export const useEnterpriseApplicationState = (config: EnterpriseStateConfig) => {
  const [state, dispatch] = useReducer(
    enterpriseApplicationReducer,
    config,
    createInitialState
  );
  
  const auditTimeoutRef = useRef<NodeJS.Timeout>();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced dispatch with audit logging and encryption
  const dispatchWithAudit = useCallback(async (action: Omit<EnterpriseApplicationAction, 'metadata'>) => {
    const enhancedAction: EnterpriseApplicationAction = {
      ...action,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: state.metadata.userId,
        sessionId: state.metadata.sessionId,
        classification: config.classification,
        auditRequired: config.enableAuditLogging,
        encryptionRequired: config.encryptSensitiveData
      }
    };

    // Validate state transition if enabled
    if (config.validateStateTransitions) {
      const isValidTransition = validateActionAllowed(state, enhancedAction);
      if (!isValidTransition) {
        throw new Error(`Invalid action: ${action.type} not allowed in current state`);
      }
    }

    // Encrypt sensitive data if required
    if (config.encryptSensitiveData && isSensitiveAction(enhancedAction)) {
      enhancedAction.payload = await encryptionService.encryptSensitiveFields(
        enhancedAction.payload,
        config.classification
      );
    }

    // Log audit event if required
    if (config.enableAuditLogging) {
      // Debounce audit logging to avoid overwhelming the system
      if (auditTimeoutRef.current) {
        clearTimeout(auditTimeoutRef.current);
      }
      
      auditTimeoutRef.current = setTimeout(async () => {
        await auditLogger.logStateChange({
          sessionId: state.metadata.sessionId,
          actionType: enhancedAction.type,
          timestamp: enhancedAction.metadata!.timestamp,
          classification: config.classification,
          userId: state.metadata.userId,
          previousState: sanitizeForAudit(state),
          changes: sanitizeForAudit(enhancedAction.payload)
        });
      }, 1000);
    }

    dispatch(enhancedAction);
  }, [state, config]);

  // Auto-save functionality
  useEffect(() => {
    if (config.autoSaveInterval && state.submissionStatus === SubmissionStatus.IN_PROGRESS) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        dispatchWithAudit({
          type: ApplicationActionType.SAVE_DRAFT,
          payload: { autoSave: true }
        });
      }, config.autoSaveInterval);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state, config.autoSaveInterval, dispatchWithAudit]);

  // Validation service integration
  const validateCurrentStep = useCallback(async () => {
    try {
      const validationResults = await validationService.validateStep(
        state.currentStep,
        state.entity,
        config.classification
      );
      
      // Clear previous validation results for this step
      await dispatchWithAudit({
        type: ApplicationActionType.CLEAR_VALIDATION_RESULTS,
        payload: { step: state.currentStep }
      });
      
      // Add new validation results
      for (const result of validationResults) {
        await dispatchWithAudit({
          type: ApplicationActionType.ADD_VALIDATION_RESULT,
          payload: result
        });
      }
      
      return validationResults;
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }, [state.currentStep, state.entity, config.classification, dispatchWithAudit]);

  // Compliance check integration
  const checkCompliance = useCallback(async () => {
    try {
      const complianceResults = await complianceService.checkCompliance(
        state.entity,
        state.fociAssessment,
        state.documents
      );
      
      return complianceResults;
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw error;
    }
  }, [state.entity, state.fociAssessment, state.documents]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (auditTimeoutRef.current) {
        clearTimeout(auditTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    dispatch: dispatchWithAudit,
    validateCurrentStep,
    checkCompliance,
    metadata: state.metadata
  };
};

// Utility functions
function validateActionAllowed(state: ApplicationState, action: EnterpriseApplicationAction): boolean {
  // Implement business rules for action validation
  // For example, prevent certain actions based on submission status
  if (state.submissionStatus === SubmissionStatus.SUBMITTED) {
    const readOnlyActions = [
      ApplicationActionType.UPDATE_ENTITY_DATA,
      ApplicationActionType.UPLOAD_DOCUMENT,
      ApplicationActionType.UPDATE_FOCI_ASSESSMENT
    ];
    
    return !readOnlyActions.includes(action.type);
  }
  
  return true;
}

function isSensitiveAction(action: EnterpriseApplicationAction): boolean {
  const sensitiveActions = [
    ApplicationActionType.UPDATE_ENTITY_DATA,
    ApplicationActionType.ENCRYPT_SENSITIVE_DATA,
    ApplicationActionType.UPLOAD_DOCUMENT
  ];
  
  return sensitiveActions.includes(action.type);
}

export default useEnterpriseApplicationState;
