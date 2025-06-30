/**
 * Enterprise-Grade Type Definitions for TurboFCL
 * Comprehensive type safety for government contracting compliance
 */

// NAICS and SBA Category Types
export interface NAICSCode {
  readonly code: string;
  readonly title: string;
  readonly description?: string;
  readonly size_standards?: string;
  readonly exceptions?: string;
}

export interface SBACategory {
  readonly category: SBACategoryType;
  readonly naicsCode: string;
  readonly employeeThreshold?: number;
  readonly revenueThreshold?: number;
  readonly certified: boolean;
  readonly certificationDate?: string;
  readonly expirationDate?: string;
}

export enum SBACategoryType {
  SMALL_BUSINESS = 'SMALL_BUSINESS',
  LARGE_BUSINESS = 'LARGE_BUSINESS',
  WOMAN_OWNED = 'WOMAN_OWNED',
  MINORITY_OWNED = 'MINORITY_OWNED',
  VETERAN_OWNED = 'VETERAN_OWNED',
  SERVICE_DISABLED_VETERAN = 'SERVICE_DISABLED_VETERAN',
  HUBZONE = 'HUBZONE',
  EIGHT_A = '8A',
  ECONOMICALLY_DISADVANTAGED = 'ECONOMICALLY_DISADVANTAGED',
  HISTORICALLY_BLACK_COLLEGE = 'HBCU',
  ALASKA_NATIVE_CORPORATION = 'ANC',
  INDIAN_TRIBAL_GOVERNMENT = 'INDIAN_TRIBAL'
}

// Clearance and Compliance Types
export interface ClearanceRequirement {
  readonly level: ClearanceLevel;
  readonly classification: ClassificationLevel;
  readonly required: boolean;
  readonly personnelCount?: number;
  readonly facilityRequirement?: boolean;
  readonly description?: string;
}

export interface ComplianceStatus {
  readonly overall: ValidationStatus;
  readonly foci: FOCIRiskLevel;
  readonly security: ValidationStatus;
  readonly financial: ValidationStatus;
  readonly lastUpdated: string;
  readonly nextReview?: string;
  readonly violations?: ComplianceViolation[];
}

export interface ComplianceViolation {
  readonly id: string;
  readonly type: string;
  readonly severity: ValidationSeverity;
  readonly description: string;
  readonly discoveredDate: string;
  readonly status: string;
  readonly remediation?: string;
}

// Assessment and Mitigation Types
export interface MitigationMeasure {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly implementation: string;
  readonly effectiveness: EffectivenessRating;
  readonly cost?: number;
  readonly timeline?: string;
  readonly responsible?: string;
  readonly status: ImplementationStatus;
}

export enum EffectivenessRating {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ImplementationStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

export interface ComplianceGap {
  readonly id: string;
  readonly requirement: string;
  readonly current: string;
  readonly gap: string;
  readonly severity: ValidationSeverity;
  readonly priority: number;
  readonly remediation?: string;
}

export interface Recommendation {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly priority: number;
  readonly effort: string;
  readonly impact: string;
  readonly timeline?: string;
}

export interface AssessmentMetadata {
  readonly version: string;
  readonly assessor: string;
  readonly methodology: string;
  readonly standards: string[];
  readonly tools: string[];
  readonly limitations?: string[];
}

// Ownership and Corporate Structure Types
export interface ShareClass {
  readonly class: string;
  readonly type: ShareType;
  readonly votingRights: boolean;
  readonly votingRatio?: number;
  readonly liquidationPreference?: number;
  readonly dividendRights: boolean;
  readonly convertible: boolean;
  readonly outstanding: number;
  readonly authorized: number;
}

export enum ShareType {
  COMMON = 'COMMON',
  PREFERRED = 'PREFERRED',
  VOTING = 'VOTING',
  NON_VOTING = 'NON_VOTING',
  CONVERTIBLE = 'CONVERTIBLE',
  PARTICIPATING = 'PARTICIPATING'
}

export interface VotingAgreement {
  readonly id: string;
  readonly type: VotingAgreementType;
  readonly parties: string[];
  readonly subject: string;
  readonly terms: string;
  readonly effectiveDate: string;
  readonly expirationDate?: string;
  readonly votingPower: number;
}

export enum VotingAgreementType {
  POOLING = 'POOLING',
  TRUST = 'TRUST',
  PROXY = 'PROXY',
  IRREVOCABLE_PROXY = 'IRREVOCABLE_PROXY',
  MANAGEMENT = 'MANAGEMENT',
  CONTROL = 'CONTROL'
}

export interface BoardMember {
  readonly id: string;
  readonly name: string;
  readonly position: BoardPosition;
  readonly appointedBy?: string;
  readonly term: string;
  readonly independent: boolean;
  readonly citizenship: string;
  readonly clearanceLevel?: ClearanceLevel;
  readonly votingPower?: number;
}

export enum BoardPosition {
  CHAIRMAN = 'CHAIRMAN',
  VICE_CHAIRMAN = 'VICE_CHAIRMAN',
  DIRECTOR = 'DIRECTOR',
  INDEPENDENT_DIRECTOR = 'INDEPENDENT_DIRECTOR',
  LEAD_DIRECTOR = 'LEAD_DIRECTOR',
  AUDIT_COMMITTEE = 'AUDIT_COMMITTEE',
  COMPENSATION_COMMITTEE = 'COMPENSATION_COMMITTEE',
  NOMINATING_COMMITTEE = 'NOMINATING_COMMITTEE'
}

export interface ManagementStructure {
  readonly ceo: string;
  readonly cfo?: string;
  readonly coo?: string;
  readonly cto?: string;
  readonly generalCounsel?: string;
  readonly keyManagement: KeyManager[];
  readonly organizationChart?: string;
  readonly reportingStructure: string;
}

export interface KeyManager {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly citizenship: string;
  readonly clearanceLevel?: ClearanceLevel;
  readonly startDate: string;
  readonly responsibilities: string[];
}

export interface Subsidiary {
  readonly id: string;
  readonly name: string;
  readonly uei?: string;
  readonly jurisdiction: string;
  readonly ownershipPercentage: number;
  readonly operationalControl: boolean;
  readonly votingControl: boolean;
  readonly purpose: string;
  readonly active: boolean;
}

export interface ParentCompany {
  readonly id: string;
  readonly name: string;
  readonly uei?: string;
  readonly jurisdiction: string;
  readonly ownershipPercentage: number;
  readonly controlType: ControlType;
  readonly ultimateParent: boolean;
  readonly publiclyTraded: boolean;
  readonly stockExchange?: string;
}

export enum ControlType {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  BENEFICIAL = 'BENEFICIAL',
  VOTING = 'VOTING',
  OPERATIONAL = 'OPERATIONAL',
  FINANCIAL = 'FINANCIAL'
}

// Confidence and Analysis Types
export enum ConfidenceLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  CERTAIN = 'CERTAIN'
}

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

// Initial Access and DARPA Bridges Integration Types
export interface InitialAccessRequest {
  readonly requestId: string;
  readonly source: AccessSource;
  readonly timestamp: string;
  readonly bridgesFormData: BridgesFormData;
  readonly contactInference: ContactInference;
  readonly provisioningStatus: ProvisioningStatus;
  readonly secureLink?: SecureProvisioningLink;
  readonly metadata: AccessRequestMetadata;
}

export enum AccessSource {
  DARPA_BRIDGES = 'DARPA_BRIDGES',
  DIRECT_REGISTRATION = 'DIRECT_REGISTRATION',
  REFERRAL = 'REFERRAL',
  GOVERNMENT_INVITATION = 'GOVERNMENT_INVITATION'
}

export interface BridgesFormData {
  // Exact fields from DARPA Bridges contact form
  readonly fullName: string;           // "Full name*" - mandatory
  readonly email: string;              // "Email*" - mandatory 
  readonly phoneNumber: string;        // "Phone number*" - mandatory
  readonly companyOrganization: string; // "Company / Organization*" - mandatory
  readonly titleRole: string;          // "Your Title / Role*" - mandatory
  readonly topic: string;              // "Topic*" - mandatory dropdown
  readonly office?: string;            // "Office (Optional)" 
  readonly programManager?: string;    // "Program Manager (Optional)"
  readonly message?: string;           // "Message*" - optional free text
}

export interface ContactInference {
  readonly estimatedRole: EstimatedContactRole;
  readonly kmpLikelihood: KMPLikelihood;
  readonly emailDomainAnalysis: EmailDomainAnalysis;
  readonly companySizeEstimate: CompanySizeEstimate;
  readonly handoffLikelihood: HandoffLikelihood;
  readonly confidence: ConfidenceLevel;
}

export enum EstimatedContactRole {
  CEO_FSO_COMBINED = 'CEO_FSO_COMBINED',     // Small company, title suggests CEO/owner
  DEDICATED_FSO = 'DEDICATED_FSO',           // Title suggests security role
  BUSINESS_DEVELOPMENT = 'BUSINESS_DEVELOPMENT', // BD/Sales role, likely hands off
  TECHNICAL_LEAD = 'TECHNICAL_LEAD',         // Engineer/CTO, may handle security
  EXECUTIVE_LEADERSHIP = 'EXECUTIVE_LEADERSHIP', // VP/C-level, uncertain handoff
  UNKNOWN = 'UNKNOWN'
}

export enum KMPLikelihood {
  DEFINITELY_KMP = 'DEFINITELY_KMP',         // CEO, President, FSO titles
  LIKELY_KMP = 'LIKELY_KMP',                 // VP, Director, etc.
  POSSIBLY_KMP = 'POSSIBLY_KMP',             // Manager, Lead, etc.
  UNLIKELY_KMP = 'UNLIKELY_KMP'              // Coordinator, Analyst, etc.
}

export enum HandoffLikelihood {
  WILL_COMPLETE_PERSONALLY = 'WILL_COMPLETE_PERSONALLY',  // Small company CEO
  LIKELY_TO_HANDOFF = 'LIKELY_TO_HANDOFF',                // Large company BD
  MAY_DELEGATE = 'MAY_DELEGATE',                           // Mid-size company exec
  UNCERTAIN = 'UNCERTAIN'
}

export enum CompanySizeEstimate {
  MICRO = 'MICRO',           // <10 employees
  SMALL = 'SMALL',           // 10-100 employees  
  MEDIUM = 'MEDIUM',         // 100-500 employees
  LARGE = 'LARGE',           // 500+ employees
  ENTERPRISE = 'ENTERPRISE', // 1000+ employees
  UNKNOWN = 'UNKNOWN'
}

export interface EmailDomainAnalysis {
  readonly domain: string;
  readonly isProfessionalEmail: boolean;    // Not gmail/yahoo/etc
  readonly domainCompanyMatch: DomainMatchResult;
  readonly confidence: ConfidenceLevel;
  readonly extractedCompanyName?: string;
}

export interface DomainMatchResult {
  readonly matchFound: boolean;
  readonly extractedCompanyName?: string;
  readonly confidence: number;              // 0-1 confidence score
  readonly methodology: DomainMatchMethodology;
  readonly matchingElements: string[];
}

export enum DomainMatchMethodology {
  EXACT_MATCH = 'EXACT_MATCH',
  PARTIAL_MATCH = 'PARTIAL_MATCH', 
  KEYWORD_EXTRACTION = 'KEYWORD_EXTRACTION',
  FUZZY_MATCH = 'FUZZY_MATCH',
  NO_MATCH = 'NO_MATCH'
}

export enum ProvisioningStatus {
  PENDING = 'PENDING',
  LINK_GENERATED = 'LINK_GENERATED',
  LINK_ACCESSED = 'LINK_ACCESSED',
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  COMPANY_MATCHED = 'COMPANY_MATCHED',
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED'
}

export interface SecureProvisioningLink {
  readonly linkId: string;
  readonly token: string;
  readonly expirationTime: string;
  readonly accessCount: number;
  readonly maxAccesses: number;
  readonly ipRestrictions?: string[];
  readonly deviceFingerprint?: string;
  readonly isTestMode: boolean;
}

export interface AccessRequestMetadata {
  readonly requestedBy: string;           // DARPA official who created the link
  readonly requestedAt: string;
  readonly darpaProgramOffice?: string;
  readonly darpaTaskOrder?: string;
  readonly priority: RequestPriority;
  readonly classification: ClassificationLevel;
  readonly auditTrail: AuditEvent[];
}

export enum RequestPriority {
  ROUTINE = 'ROUTINE',
  ELEVATED = 'ELEVATED', 
  HIGH_PRIORITY = 'HIGH_PRIORITY',
  CRITICAL = 'CRITICAL'
}

// Test Entity Management Types
export interface TestEntityBaseline {
  readonly testEntityId: string;
  readonly assignedContact: TestContactInfo;
  readonly entityCharacteristics: TestEntityCharacteristics;
  readonly testScenario: TestScenario;
}

export interface TestContactInfo {
  readonly name: string;
  readonly email: string;                   // All use coleman@pearsonsecurityservices.com baseline
  readonly phone: string;
  readonly title: string;
  readonly estimatedRole: EstimatedContactRole;
  readonly kmpLikelihood: KMPLikelihood;
}

export interface TestEntityCharacteristics {
  readonly complexityLevel: ComplexityLevel;
  readonly businessSize: SBACategoryType;
  readonly fociComplexity: FOCIComplexityLevel;
  readonly kmpCount: number;
  readonly ownershipTiers: number;
  readonly foreignOwnershipPercentage: number;
  readonly description: string;
  readonly expectedChallenges: string[];
}

export enum ComplexityLevel {
  VERY_LOW = 'VERY_LOW',       // Darkstar - Single member LLC
  LOW = 'LOW',                 // Simple structures
  MODERATE = 'MODERATE',       // Valens - Multiple owners 
  HIGH = 'HIGH',               // PE-backed, complex structures
  VERY_HIGH = 'VERY_HIGH'      // Public companies, international
}

export enum FOCIComplexityLevel {
  NO_FOCI = 'NO_FOCI',                    // Clear domestic ownership
  POTENTIAL_FOCI = 'POTENTIAL_FOCI',      // Foreign contracts/revenue
  CLEAR_FOCI = 'CLEAR_FOCI',              // Foreign ownership present
  COMPLEX_FOCI = 'COMPLEX_FOCI'           // Multiple FOCI factors
}

export interface TestScenario {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly objectives: string[];
  readonly expectedOutcomes: string[];
  readonly testCriteria: TestCriteria[];
}

export interface TestCriteria {
  readonly criteriaId: string;
  readonly description: string;
  readonly expectedResult: string;
  readonly validationMethod: ValidationMethod;
}

export enum ValidationMethod {
  AUTOMATED_CHECK = 'AUTOMATED_CHECK',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  USER_FEEDBACK = 'USER_FEEDBACK',
  DATA_VALIDATION = 'DATA_VALIDATION'
}

// Company Matching and SAM Integration Types
export interface CompanyMatchingResult {
  readonly matchId: string;
  readonly uei?: string;
  readonly legalName: string;
  readonly dbaName?: string;
  readonly matchType: CompanyMatchType;
  readonly confidence: number;              // 0-1 confidence score
  readonly domainMatch: DomainMatchResult;
  readonly samData?: SAMEntityData;
  readonly validationStatus: ValidationStatus;
}

export enum CompanyMatchType {
  EXACT_UEI = 'EXACT_UEI',
  EXACT_NAME = 'EXACT_NAME',
  FUZZY_NAME = 'FUZZY_NAME',
  DOMAIN_MATCH = 'DOMAIN_MATCH',
  PARTIAL_MATCH = 'PARTIAL_MATCH',
  NO_MATCH = 'NO_MATCH'
}

export interface SAMEntityData {
  readonly uei: string;
  readonly legalBusinessName: string;
  readonly dbaName?: string;
  readonly cageCode?: string;
  readonly entityStructure: string;
  readonly stateOfIncorporation?: string;
  readonly countryOfIncorporation?: string;
  readonly physicalAddress: SAMAddress;
  readonly mailingAddress?: SAMAddress;
  readonly registrationStatus: string;
  readonly registrationDate?: string;
  readonly expirationDate?: string;
  readonly lastUpdated: string;
  readonly businessTypes: string[];
  readonly naicsCodes: SAMNAICSCode[];
}

export interface SAMAddress {
  readonly streetLine1: string;
  readonly streetLine2?: string;
  readonly city: string;
  readonly stateOrProvince: string;
  readonly zipCode: string;
  readonly country: string;
}

export interface SAMNAICSCode {
  readonly naicsCode: string;
  readonly naicsDescription: string;
  readonly isPrimary: boolean;
  readonly smallBusinessIndicator?: boolean;
}

// Initial Application State Types  
export interface InitialApplicationData {
  readonly sessionId: string;
  readonly source: AccessSource;
  readonly bridgesContext?: BridgesFormData;
  readonly testMode: boolean;
  readonly testEntity?: TestEntityBaseline;
  readonly prePopulatedEntity: Partial<CompanyEntity>;
  readonly contactInference: ContactInference;
  readonly companyMatches: CompanyMatchingResult[];
  readonly selectedMatch?: CompanyMatchingResult;
  readonly createdAt: string;
}

export interface OnboardingProgress {
  readonly currentStep: OnboardingStep;
  readonly completedSteps: OnboardingStep[];
  readonly totalSteps: number;
  readonly progressPercentage: number;
  readonly canProceed: boolean;
  readonly blockers: string[];
}

export enum OnboardingStep {
  SECURE_ACCESS_VALIDATION = 'SECURE_ACCESS_VALIDATION',
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  ACCOUNT_CREATION = 'ACCOUNT_CREATION',
  COMPANY_MATCHING = 'COMPANY_MATCHING',
  COMPANY_CONFIRMATION = 'COMPANY_CONFIRMATION',
  PROFILE_COMPLETION = 'PROFILE_COMPLETION',
  ACCESS_GRANTED = 'ACCESS_GRANTED'
}

// User Account Creation Types
export interface UserRegistrationDetails {
  readonly personalInfo: PersonalInformation;
  readonly credentials: AccountCredentials;
  readonly securityInfo: SecurityInformation;
  readonly preferences: UserPreferences;
  readonly terms: TermsAcceptance;
}

export interface PersonalInformation {
  readonly firstName: string;
  readonly lastName: string;
  readonly middleName?: string;
  readonly title: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly mobileNumber?: string;
  readonly preferredName?: string;
}

export interface AccountCredentials {
  readonly username?: string;              // Optional if using email
  readonly passwordHash?: string;          // Only if not using external auth
  readonly authProvider: AuthProvider;
  readonly externalId?: string;            // For login.gov, etc.
  readonly mfaEnabled: boolean;
  readonly mfaMethod?: MFAMethod;
}

export enum AuthProvider {
  LOCAL = 'LOCAL',                         // Username/password
  LOGIN_GOV = 'LOGIN_GOV',                // Login.gov integration
  CAC_PIV = 'CAC_PIV',                    // Common Access Card
  SAML_SSO = 'SAML_SSO',                  // SAML Single Sign-On
  OAUTH2 = 'OAUTH2'                       // OAuth2 provider
}

export enum MFAMethod {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  AUTHENTICATOR_APP = 'AUTHENTICATOR_APP',
  HARDWARE_TOKEN = 'HARDWARE_TOKEN',
  CAC_PIV = 'CAC_PIV'
}

export interface SecurityInformation {
  readonly clearanceLevel?: ClearanceLevel;
  readonly clearanceStatus?: ClearanceStatus;
  readonly citizenship: string[];
  readonly securityOfficer: boolean;
  readonly keyManagementPersonnel: boolean;
  readonly previousClearance?: ClearanceHistory;
}

export enum ClearanceStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED'
}

export interface ClearanceHistory {
  readonly previousLevel: ClearanceLevel;
  readonly issuingAgency: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly reason?: string;
}

export interface UserPreferences {
  readonly language: string;
  readonly timezone: string;
  readonly notifications: NotificationPreferences;
  readonly accessibility: AccessibilitySettings;
}

export interface NotificationPreferences {
  readonly email: boolean;
  readonly sms: boolean;
  readonly inApp: boolean;
  readonly securityAlerts: boolean;
  readonly complianceReminders: boolean;
}

export interface AccessibilitySettings {
  readonly screenReader: boolean;
  readonly highContrast: boolean;
  readonly largeFonts: boolean;
  readonly keyboardNavigation: boolean;
}

export interface TermsAcceptance {
  readonly privacyPolicy: TermAcceptance;
  readonly termsOfService: TermAcceptance;
  readonly governmentAccess: TermAcceptance;
  readonly dataRetention: TermAcceptance;
}

export interface TermAcceptance {
  readonly accepted: boolean;
  readonly version: string;
  readonly acceptedAt: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}
