/**
 * Enterprise-Grade Type Definitions for TurboFCL
 * Comprehensive type safety for government contracting compliance
 */

// Core Entity Types
export interface CompanyEntity {
  readonly id: string;
  readonly uei: string;
  readonly legalName: string;
  readonly dbaName?: string;
  readonly entityType: EntityType;
  readonly registrationStatus: RegistrationStatus;
  readonly dcaaAuditStatus?: DCAAStatus;
  readonly cageCode?: string;
  readonly dunsNumber?: string;
  readonly taxId: string;
  readonly physicalAddress: Address;
  readonly mailingAddress?: Address;
  readonly primaryContact: ContactInfo;
  readonly establishedDate: string;
  readonly fiscalYearEnd: string;
  readonly employeeCount?: number;
  readonly annualRevenue?: number;
  readonly naicsCodes: NAICSCode[];
  readonly businessCategories: SBACategory[];
  readonly ownershipStructure: OwnershipStructure;
  readonly clearanceRequirements?: ClearanceRequirement[];
  readonly complianceStatus: ComplianceStatus;
  readonly metadata: EntityMetadata;
}

// Strict Entity Types per DCSA requirements
export enum EntityType {
  C_CORPORATION = 'C_CORPORATION',
  S_CORPORATION = 'S_CORPORATION',
  LLC_MEMBER_MANAGED = 'LLC_MEMBER_MANAGED',
  LLC_MANAGER_MANAGED = 'LLC_MANAGER_MANAGED',
  LIMITED_PARTNERSHIP = 'LIMITED_PARTNERSHIP',
  GENERAL_PARTNERSHIP = 'GENERAL_PARTNERSHIP',
  MASTER_LIMITED_PARTNERSHIP = 'MLP',
  PROFESSIONAL_CORPORATION = 'PROFESSIONAL_CORPORATION',
  BENEFIT_CORPORATION = 'BENEFIT_CORPORATION',
  COOPERATIVE = 'COOPERATIVE',
  JOINT_VENTURE = 'JOINT_VENTURE',
  TRIBAL_CORPORATION = 'TRIBAL_CORPORATION',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP'
}

export enum RegistrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export enum DCAAStatus {
  ADEQUATE = 'ADEQUATE',
  INADEQUATE = 'INADEQUATE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  EXEMPT = 'EXEMPT'
}

// Address with validation requirements
export interface Address {
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly addressType: AddressType;
  readonly validatedAt?: string;
  readonly validationSource?: string;
}

export enum AddressType {
  PHYSICAL = 'PHYSICAL',
  MAILING = 'MAILING',
  BILLING = 'BILLING',
  HEADQUARTERS = 'HEADQUARTERS',
  FACILITY = 'FACILITY'
}

// Contact Information
export interface ContactInfo {
  readonly firstName: string;
  readonly lastName: string;
  readonly title: string;
  readonly email: string;
  readonly phone: string;
  readonly mobile?: string;
  readonly fax?: string;
  readonly clearanceLevel?: ClearanceLevel;
  readonly citizenship: string[];
  readonly isKeyManagementPersonnel: boolean;
}

// FOCI Assessment Types
export interface FOCIAssessment {
  readonly assessmentId: string;
  readonly entityId: string;
  readonly assessmentDate: string;
  readonly assessorId: string;
  readonly assessmentType: FOCIAssessmentType;
  readonly riskLevel: FOCIRiskLevel;
  readonly riskScore: number;
  readonly indicators: FOCIIndicator[];
  readonly mitigationMeasures: MitigationMeasure[];
  readonly complianceGaps: ComplianceGap[];
  readonly recommendations: Recommendation[];
  readonly nextReviewDate: string;
  readonly dccsaSubmissionRequired: boolean;
  readonly validationStatus: ValidationStatus;
  readonly metadata: AssessmentMetadata;
}

export enum FOCIRiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum FOCIAssessmentType {
  INITIAL = 'INITIAL',
  ANNUAL = 'ANNUAL',
  TRIGGERED = 'TRIGGERED',
  CHANGE_IN_OWNERSHIP = 'CHANGE_IN_OWNERSHIP',
  DCSA_REQUESTED = 'DCSA_REQUESTED'
}

export interface FOCIIndicator {
  readonly indicatorType: FOCIIndicatorType;
  readonly severity: FOCISeverity;
  readonly description: string;
  readonly evidence: string[];
  readonly mitigationRequired: boolean;
  readonly nispomReference: string;
}

export enum FOCIIndicatorType {
  FOREIGN_OWNERSHIP = 'FOREIGN_OWNERSHIP',
  FOREIGN_CONTROL = 'FOREIGN_CONTROL',
  FOREIGN_INFLUENCE = 'FOREIGN_INFLUENCE',
  TECHNOLOGY_TRANSFER = 'TECHNOLOGY_TRANSFER',
  FOREIGN_INVESTMENT = 'FOREIGN_INVESTMENT',
  EXPORT_CONTROL = 'EXPORT_CONTROL',
  INTERNATIONAL_AGREEMENTS = 'INTERNATIONAL_AGREEMENTS'
}

export enum FOCISeverity {
  INFORMATIONAL = 'INFORMATIONAL',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

// Ownership Structure
export interface OwnershipStructure {
  readonly totalShares?: number;
  readonly shareClasses: ShareClass[];
  readonly owners: Owner[];
  readonly votingAgreements: VotingAgreement[];
  readonly boardComposition: BoardMember[];
  readonly managementStructure: ManagementStructure;
  readonly subsidiaries: Subsidiary[];
  readonly parentCompanies: ParentCompany[];
  readonly ownershipTiers: number;
  readonly foreignOwnershipPercentage: number;
}

export interface Owner {
  readonly ownerId: string;
  readonly ownerType: OwnerType;
  readonly name: string;
  readonly citizenship?: string[];
  readonly ownershipPercentage: number;
  readonly votingPercentage?: number;
  readonly shareClass?: string;
  readonly acquisitionDate: string;
  readonly isForeign: boolean;
  readonly isControlling: boolean;
  readonly relationshipType: OwnershipRelationType;
}

export enum OwnerType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATION = 'CORPORATION',
  PARTNERSHIP = 'PARTNERSHIP',
  LLC = 'LLC',
  TRUST = 'TRUST',
  GOVERNMENT = 'GOVERNMENT',
  PENSION_FUND = 'PENSION_FUND',
  INVESTMENT_FUND = 'INVESTMENT_FUND',
  OTHER = 'OTHER'
}

export enum OwnershipRelationType {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  BENEFICIAL = 'BENEFICIAL',
  NOMINEE = 'NOMINEE',
  TRUSTEE = 'TRUSTEE'
}

// Security Classifications
export enum ClassificationLevel {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CUI = 'CUI',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET'
}

export enum ClearanceLevel {
  NONE = 'NONE',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
  TOP_SECRET_SCI = 'TOP_SECRET_SCI'
}

// Application State Management
export interface ApplicationState {
  readonly currentStep: ApplicationStep;
  readonly entity: Partial<CompanyEntity>;
  readonly fociAssessment?: Partial<FOCIAssessment>;
  readonly documents: DocumentSubmission[];
  readonly validationResults: ValidationResult[];
  readonly submissionStatus: SubmissionStatus;
  readonly metadata: ApplicationMetadata;
}

export enum ApplicationStep {
  COMPANY_IDENTIFICATION = 'COMPANY_IDENTIFICATION',
  ENTITY_STRUCTURE = 'ENTITY_STRUCTURE',
  OWNERSHIP_ANALYSIS = 'OWNERSHIP_ANALYSIS',
  FOCI_ASSESSMENT = 'FOCI_ASSESSMENT',
  KMP_IDENTIFICATION = 'KMP_IDENTIFICATION',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  AI_VALIDATION = 'AI_VALIDATION',
  FINAL_REVIEW = 'FINAL_REVIEW',
  SUBMISSION = 'SUBMISSION'
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATION_PENDING = 'VALIDATION_PENDING',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  READY_FOR_SUBMISSION = 'READY_FOR_SUBMISSION',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_CLARIFICATION = 'REQUIRES_CLARIFICATION'
}

// Validation and Compliance
export interface ValidationResult {
  readonly validationId: string;
  readonly validationType: ValidationType;
  readonly status: ValidationStatus;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly field?: string;
  readonly suggestions: string[];
  readonly regulatoryReference?: string;
  readonly timestamp: string;
}

export enum ValidationType {
  FORMAT_VALIDATION = 'FORMAT_VALIDATION',
  BUSINESS_RULE = 'BUSINESS_RULE',
  REGULATORY_COMPLIANCE = 'REGULATORY_COMPLIANCE',
  EXTERNAL_VERIFICATION = 'EXTERNAL_VERIFICATION',
  AI_VALIDATION = 'AI_VALIDATION'
}

export enum ValidationStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW'
}

export enum ValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Metadata for audit trails
export interface EntityMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly version: number;
  readonly dataClassification: ClassificationLevel;
  readonly retentionDate?: string;
  readonly auditTrail: AuditEvent[];
}

export interface ApplicationMetadata {
  readonly sessionId: string;
  readonly userId: string;
  readonly classification: ClassificationLevel;
  readonly createdAt: string;
  readonly lastModified: string;
  readonly version: number;
  readonly userAgent: string;
  readonly ipAddress?: string;
  readonly auditTrail: AuditEvent[];
}

export interface AuditEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly eventType: AuditEventType;
  readonly userId: string;
  readonly sessionId: string;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
  readonly riskLevel: FOCIRiskLevel;
}

export enum AuditEventType {
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  FOCI_ASSESSMENT_STARTED = 'FOCI_ASSESSMENT_STARTED',
  FOCI_ASSESSMENT_COMPLETED = 'FOCI_ASSESSMENT_COMPLETED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  VALIDATION_PERFORMED = 'VALIDATION_PERFORMED',
  SUBMISSION_CREATED = 'SUBMISSION_CREATED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  SECURITY_EVENT = 'SECURITY_EVENT',
  COMPLIANCE_EVENT = 'COMPLIANCE_EVENT'
}

// API Response Types
export interface APIResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: APIError;
  readonly metadata: ResponseMetadata;
}

export interface APIError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
}

export interface ResponseMetadata {
  readonly requestId: string;
  readonly timestamp: string;
  readonly processingTime: number;
  readonly version: string;
  readonly classification: ClassificationLevel;
}

// Form State Types
export interface FormState<T> {
  readonly data: T;
  readonly errors: Record<string, string>;
  readonly touched: Record<string, boolean>;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  readonly isSubmitting: boolean;
}

// Document Management
export interface DocumentSubmission {
  readonly documentId: string;
  readonly documentType: DocumentType;
  readonly fileName: string;
  readonly fileSize: number;
  readonly contentType: string;
  readonly classification: ClassificationLevel;
  readonly uploadedAt: string;
  readonly uploadedBy: string;
  readonly validationStatus: ValidationStatus;
  readonly requiredFor: ApplicationStep[];
  readonly metadata: DocumentMetadata;
}

export enum DocumentType {
  ARTICLES_OF_INCORPORATION = 'ARTICLES_OF_INCORPORATION',
  BYLAWS = 'BYLAWS',
  OPERATING_AGREEMENT = 'OPERATING_AGREEMENT',
  PARTNERSHIP_AGREEMENT = 'PARTNERSHIP_AGREEMENT',
  STOCK_CERTIFICATES = 'STOCK_CERTIFICATES',
  VOTING_AGREEMENTS = 'VOTING_AGREEMENTS',
  BOARD_RESOLUTIONS = 'BOARD_RESOLUTIONS',
  FINANCIAL_STATEMENTS = 'FINANCIAL_STATEMENTS',
  OWNERSHIP_DISCLOSURE = 'OWNERSHIP_DISCLOSURE',
  KMP_IDENTIFICATION = 'KMP_IDENTIFICATION',
  DCAA_AUDIT_REPORT = 'DCAA_AUDIT_REPORT',
  FOCI_MITIGATION_PLAN = 'FOCI_MITIGATION_PLAN',
  OTHER = 'OTHER'
}

export interface DocumentMetadata {
  readonly checksum: string;
  readonly encryptionStatus: EncryptionStatus;
  readonly retentionPeriod: number;
  readonly accessLevel: AccessLevel;
  readonly virusScanStatus: VirusScanStatus;
  readonly extractedText?: string;
  readonly ocrConfidence?: number;
}

export enum EncryptionStatus {
  UNENCRYPTED = 'UNENCRYPTED',
  ENCRYPTED_AT_REST = 'ENCRYPTED_AT_REST',
  ENCRYPTED_IN_TRANSIT = 'ENCRYPTED_IN_TRANSIT',
  END_TO_END_ENCRYPTED = 'END_TO_END_ENCRYPTED'
}

export enum AccessLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

export enum VirusScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  QUARANTINED = 'QUARANTINED',
  ERROR = 'ERROR'
}

// Additional supporting types for comprehensive coverage
export interface NAICSCode {
  readonly code: string;
  readonly description: string;
  readonly isPrimary: boolean;
}

export interface SBACategory {
  readonly category: SBACategoryType;
  readonly certificationNumber?: string;
  readonly expirationDate?: string;
  readonly certifyingAgency: string;
}

export enum SBACategoryType {
  LARGE_BUSINESS = 'LARGE_BUSINESS',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
  SMALL_DISADVANTAGED_BUSINESS = 'SMALL_DISADVANTAGED_BUSINESS',
  WOMAN_OWNED_SMALL_BUSINESS = 'WOMAN_OWNED_SMALL_BUSINESS',
  VETERAN_OWNED_SMALL_BUSINESS = 'VETERAN_OWNED_SMALL_BUSINESS',
  HUBZONE_SMALL_BUSINESS = 'HUBZONE_SMALL_BUSINESS',
  EIGHT_A_CERTIFIED = 'EIGHT_A_CERTIFIED'
}

export interface ClearanceRequirement {
  readonly level: ClearanceLevel;
  readonly facility: string;
  readonly contractNumbers: string[];
  readonly requiredPersonnel: number;
  readonly currentPersonnel: number;
  readonly expirationDate?: string;
}

export interface ComplianceStatus {
  readonly overallStatus: ComplianceStatusType;
  readonly lastReviewDate: string;
  readonly nextReviewDate: string;
  readonly openFindings: ComplianceFinding[];
  readonly certifications: Certification[];
}

export enum ComplianceStatusType {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  CONDITIONALLY_COMPLIANT = 'CONDITIONALLY_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_CERTIFICATION = 'PENDING_CERTIFICATION'
}

export interface ComplianceFinding {
  readonly findingId: string;
  readonly severity: ValidationSeverity;
  readonly description: string;
  readonly regulatoryReference: string;
  readonly dueDate: string;
  readonly status: FindingStatus;
}

export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  OVERDUE = 'OVERDUE'
}

export interface Certification {
  readonly certificationType: CertificationType;
  readonly certificationNumber: string;
  readonly issuedDate: string;
  readonly expirationDate: string;
  readonly issuingAuthority: string;
  readonly status: CertificationStatus;
}

export enum CertificationType {
  ISO_9001 = 'ISO_9001',
  ISO_27001 = 'ISO_27001',
  SOC_2 = 'SOC_2',
  CMMC = 'CMMC',
  FEDRAMP = 'FEDRAMP',
  DCAA = 'DCAA',
  CUSTOM = 'CUSTOM'
}

export enum CertificationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  PENDING_RENEWAL = 'PENDING_RENEWAL'
}

// Additional complex types for enterprise features
export interface ShareClass {
  readonly className: string;
  readonly shareType: ShareType;
  readonly totalShares: number;
  readonly votingRights: VotingRights;
  readonly dividendRights: DividendRights;
  readonly liquidationPreference?: number;
}

export enum ShareType {
  COMMON = 'COMMON',
  PREFERRED = 'PREFERRED',
  RESTRICTED = 'RESTRICTED',
  CONVERTIBLE = 'CONVERTIBLE'
}

export interface VotingRights {
  readonly hasVotingRights: boolean;
  readonly votesPerShare: number;
  readonly restrictions?: string[];
}

export interface DividendRights {
  readonly dividendRate?: number;
  readonly isParticipating: boolean;
  readonly isCumulative: boolean;
}

export interface VotingAgreement {
  readonly agreementId: string;
  readonly parties: string[];
  readonly subject: string;
  readonly effectiveDate: string;
  readonly expirationDate?: string;
  readonly restrictions: string[];
}

export interface BoardMember {
  readonly memberId: string;
  readonly name: string;
  readonly position: BoardPosition;
  readonly appointedBy: string;
  readonly appointedDate: string;
  readonly termExpiration?: string;
  readonly citizenship: string[];
  readonly clearanceLevel?: ClearanceLevel;
  readonly isIndependent: boolean;
}

export enum BoardPosition {
  CHAIRMAN = 'CHAIRMAN',
  VICE_CHAIRMAN = 'VICE_CHAIRMAN',
  DIRECTOR = 'DIRECTOR',
  INDEPENDENT_DIRECTOR = 'INDEPENDENT_DIRECTOR',
  OBSERVER = 'OBSERVER'
}

export interface ManagementStructure {
  readonly ceo: string;
  readonly cfo?: string;
  readonly coo?: string;
  readonly cto?: string;
  readonly generalCounsel?: string;
  readonly facilitySecurityOfficer: string;
  readonly seniorManagementOfficial: string;
  readonly otherOfficers: Officer[];
}

export interface Officer {
  readonly officerId: string;
  readonly name: string;
  readonly title: string;
  readonly appointedDate: string;
  readonly reportingStructure: string[];
  readonly clearanceLevel?: ClearanceLevel;
  readonly citizenship: string[];
  readonly isKeyPersonnel: boolean;
}

export interface Subsidiary {
  readonly subsidiaryId: string;
  readonly name: string;
  readonly ownershipPercentage: number;
  readonly jurisdiction: string;
  readonly businessPurpose: string;
  readonly hasGovernmentContracts: boolean;
  readonly clearanceRequired: boolean;
}

export interface ParentCompany {
  readonly parentId: string;
  readonly name: string;
  readonly ownershipPercentage: number;
  readonly jurisdiction: string;
  readonly isPublic: boolean;
  readonly isForeign: boolean;
  readonly stockExchange?: string;
  readonly tickerSymbol?: string;
}

export interface MitigationMeasure {
  readonly measureId: string;
  readonly measureType: MitigationType;
  readonly description: string;
  readonly implementationDate?: string;
  readonly status: MitigationStatus;
  readonly effectiveness: EffectivenessRating;
  readonly reviewDate: string;
  readonly responsibleParty: string;
}

export enum MitigationType {
  BOARD_RESOLUTION = 'BOARD_RESOLUTION',
  PROXY_AGREEMENT = 'PROXY_AGREEMENT',
  SPECIAL_SECURITY_AGREEMENT = 'SPECIAL_SECURITY_AGREEMENT',
  VOTING_TRUST = 'VOTING_TRUST',
  TECHNOLOGY_CONTROL_PLAN = 'TECHNOLOGY_CONTROL_PLAN',
  NETWORK_SECURITY_AGREEMENT = 'NETWORK_SECURITY_AGREEMENT',
  OTHER = 'OTHER'
}

export enum MitigationStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  IMPLEMENTED = 'IMPLEMENTED',
  MONITORING = 'MONITORING',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum EffectivenessRating {
  NOT_ASSESSED = 'NOT_ASSESSED',
  INEFFECTIVE = 'INEFFECTIVE',
  PARTIALLY_EFFECTIVE = 'PARTIALLY_EFFECTIVE',
  EFFECTIVE = 'EFFECTIVE',
  HIGHLY_EFFECTIVE = 'HIGHLY_EFFECTIVE'
}

export interface ComplianceGap {
  readonly gapId: string;
  readonly requirement: string;
  readonly currentState: string;
  readonly requiredState: string;
  readonly severity: ValidationSeverity;
  readonly remediation: string;
  readonly timeline: string;
  readonly cost?: number;
  readonly riskOfNonCompliance: string;
}

export interface Recommendation {
  readonly recommendationId: string;
  readonly category: RecommendationCategory;
  readonly priority: RecommendationPriority;
  readonly title: string;
  readonly description: string;
  readonly rationale: string;
  readonly implementation: string;
  readonly timeline: string;
  readonly cost?: number;
  readonly benefit: string;
  readonly regulatoryBasis?: string;
}

export enum RecommendationCategory {
  GOVERNANCE = 'GOVERNANCE',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  OPERATIONAL = 'OPERATIONAL',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL'
}

export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AssessmentMetadata {
  readonly methodology: string;
  readonly toolsUsed: string[];
  readonly dataSourcesConsulted: string[];
  readonly assumptions: string[];
  readonly limitations: string[];
  readonly confidenceLevel: ConfidenceLevel;
  readonly qualityAssurance: QualityAssuranceInfo;
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export interface QualityAssuranceInfo {
  readonly reviewedBy: string;
  readonly reviewDate: string;
  readonly reviewComments?: string;
  readonly approvedBy: string;
  readonly approvalDate: string;
}
