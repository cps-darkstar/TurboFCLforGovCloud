/**
 * TurboFCL Business Rules Constants
 * Based on extracted knowledge from legacy system
 * All rules are DCSA-compliant and validated
 */

export const ENTITY_TYPES = {
  SOLE_PROPRIETORSHIP: 'sole-proprietorship',
  GENERAL_PARTNERSHIP: 'general-partnership',
  LIMITED_PARTNERSHIP: 'limited-partnership',
  CORPORATION: 'corporation',
  PUBLIC_CORPORATION: 'public-corporation',
  LLC: 'llc'
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

// Entity-specific requirements from extracted knowledge
export const ENTITY_REQUIREMENTS: Record<EntityType, {
  documents: string[];
  kmps: string[];
  minKmpCount: number;
  averageCompletionTime: number; // in minutes
}> = {
  [ENTITY_TYPES.SOLE_PROPRIETORSHIP]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Recent changes to company Structure'
    ],
    kmps: [
      'Owner of sole proprietorship',
      'Senior Management Official (SMO)',
      'FSO',
      'ITPSO'
    ],
    minKmpCount: 4,
    averageCompletionTime: 30
  },
  [ENTITY_TYPES.GENERAL_PARTNERSHIP]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Partnership Agreement',
      'Legal Organization Chart',
      'Board/Company Meeting Minutes',
      'Recent changes to company Structure',
      'FSO/ITPSO Appointment Letter',
      'KMP Citizenship Verification',
      'Signed undated DD Form 441',
      'Signed SF 328'
    ],
    kmps: [
      'SMO',
      'FSO',
      'ITPSO',
      'All General Partners'
    ],
    minKmpCount: 4,
    averageCompletionTime: 45
  },
  [ENTITY_TYPES.LIMITED_PARTNERSHIP]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Partnership Agreement',
      'Certificate of Limited Partnership',
      'Legal Organization Chart',
      'Board/Company Meeting Minutes',
      'Recent changes to company structure',
      'FSO/ITPSO Appointment Letter',
      'KMP Citizenship Verification',
      'Signed undated DD Form 441',
      'Signed SF 328'
    ],
    kmps: [
      'SMO',
      'FSO',
      'ITPSO',
      'All General Partners',
      'Limited Partners (if working on classified contracts)'
    ],
    minKmpCount: 4,
    averageCompletionTime: 50
  },
  [ENTITY_TYPES.CORPORATION]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Articles of Incorporation',
      'By-Laws',
      'Stock Ledger',
      'Legal Organization Chart',
      'Board/Company Meeting Minutes',
      'Recent changes to company structure',
      'FSO/ITPSO Appointment Letter',
      'KMP Citizenship Verification',
      'Signed undated DD Form 441',
      'Signed SF 328'
    ],
    kmps: [
      'SMO',
      'FSO',
      'ITPSO',
      'Chairman of the Board',
      'Vice Chair of Board (if applicable)',
      'Corporate Officials (if requiring classified access)'
    ],
    minKmpCount: 5,
    averageCompletionTime: 55
  },
  [ENTITY_TYPES.PUBLIC_CORPORATION]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Articles of Incorporation',
      'By-Laws',
      'Stock Ledger',
      'Most recent SEC filings',
      'Legal Organization Chart',
      'Board/Company Meeting Minutes',
      'Recent changes to company Structure',
      'FSO/ITPSO Appointment Letter',
      'KMP Citizenship Verification',
      'Signed undated DD Form 441',
      'Signed SF 328'
    ],
    kmps: [
      'SMO',
      'FSO',
      'ITPSO',
      'Chairman of the Board',
      'Vice Chair of Board (if applicable)',
      'Corporate Officials (if requiring classified access)'
    ],
    minKmpCount: 5,
    averageCompletionTime: 60
  },
  [ENTITY_TYPES.LLC]: {
    documents: [
      'Business License',
      'Fictitious Name Certificate',
      'Certificate of Formation or Articles of Organization',
      'Legal Organization Chart',
      'Operating Agreement',
      'LLC Meeting Minutes',
      'Recent changes to company structure',
      'FSO/ITPSO Appointment Letter',
      'KMP Citizenship Verification',
      'Signed undated DD Form 441',
      'Signed SF 328'
    ],
    kmps: [
      'SMO',
      'FSO',
      'ITPSO',
      'LLC Members (if requiring classified access)',
      'Managers'
    ],
    minKmpCount: 4,
    averageCompletionTime: 45
  }
};

// FOCI thresholds from extracted knowledge
export const FOCI_THRESHOLDS = {
  FOREIGN_OWNERSHIP_PERCENTAGE: 5.0,
  FOREIGN_DEBT_THRESHOLD: 10_000_000,
  MITIGATION_OWNERSHIP_HIGH: 10.0, // SSA required
  MITIGATION_OWNERSHIP_LOW: 5.0,   // SCA sufficient
} as const;

export const FOCI_CONDITIONS = {
  NO_FOCI: 'no-foci',
  FOREIGN_INVESTORS: 'foreign-investors',
  FOREIGN_OWNERSHIP: 'foreign-ownership',
  FOREIGN_BOARD_MEMBERS: 'foreign-board-members',
  FOREIGN_CONTRACTS: 'foreign-contracts',
  FOREIGN_TECHNOLOGY: 'foreign-technology',
  FOREIGN_DEBT: 'foreign-debt'
} as const;

export type FOCICondition = typeof FOCI_CONDITIONS[keyof typeof FOCI_CONDITIONS];

// Mitigation strategies
export const MITIGATION_TYPES = {
  SSA: 'Special Security Agreement',
  SCA: 'Security Control Agreement',
  PROXY: 'Proxy Agreement',
  VTA: 'Voting Trust Agreement',
  LSA: 'Limited Security Agreement'
} as const;

// Validation patterns from extracted knowledge
export const VALIDATION_PATTERNS = {
  UEI: /^[A-Z0-9]{12}$/,
  CAGE_CODE_MAX_LENGTH: 10,
  COMPANY_NAME_MAX_LENGTH: 500,
  DOCUMENT_MAX_SIZE_MB: 10,
  ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx'],
  CHAT_MESSAGE_MAX_LENGTH: 2000,
  KMP_NAME_MAX_LENGTH: 500,
  KMP_ROLE_MAX_LENGTH: 100
} as const;

// Error messages based on extracted knowledge
export const ERROR_MESSAGES = {
  INVALID_UEI_FORMAT: 'UEI must be exactly 12 characters (letters and numbers only). Example: ABC123DEF456',
  ENTITY_TYPE_MISMATCH: 'Entity type mismatch: SAM.gov shows "{samType}" but you selected "{userType}". Please verify.',
  FOCI_CONTRADICTION: 'Contradictory FOCI selections: Cannot have both foreign investors and no FOCI.',
  INSUFFICIENT_KMPS: '{entityType} typically requires at least {minCount} KMPs. Ensure all required positions are identified.',
  MISSING_SEC_FILINGS: 'Public corporations must provide SEC filings (10-K, 8-K, DEF 14A)',
  DOCUMENT_SIZE_EXCEEDED: 'File size exceeds 10MB limit. Please reduce file size or split into multiple documents.',
  INVALID_FILE_TYPE: 'Only PDF, DOC, and DOCX files are accepted for document uploads.',
  SAM_REGISTRATION_EXPIRED: 'Your SAM.gov registration appears to be inactive. Please update your registration before proceeding.',
  CAGE_CODE_EXPIRED: 'CAGE codes expire after 5 years. Please verify your CAGE code is current.'
} as const;

// SAM.gov entity structure mapping
export const SAM_TO_ENTITY_MAP: Record<string, EntityType> = {
  'LIMITED LIABILITY COMPANY': ENTITY_TYPES.LLC,
  'CORPORATION': ENTITY_TYPES.CORPORATION,
  'PUBLICLY HELD CORPORATION': ENTITY_TYPES.PUBLIC_CORPORATION,
  'GENERAL PARTNERSHIP': ENTITY_TYPES.GENERAL_PARTNERSHIP,
  'LIMITED PARTNERSHIP': ENTITY_TYPES.LIMITED_PARTNERSHIP,
  'SOLE PROPRIETORSHIP': ENTITY_TYPES.SOLE_PROPRIETORSHIP
};

// Workflow states from extracted knowledge
export const WORKFLOW_STATES = {
  INIT: 'INIT',
  COMPANY_INFO: 'COMPANY_INFO',
  FETCHING_DATA: 'FETCHING_DATA',
  ENTITY_SELECT: 'ENTITY_SELECT',
  OWNERSHIP: 'OWNERSHIP',
  FOCI_ASSESS: 'FOCI_ASSESS',
  FOCI_MITIGATE: 'FOCI_MITIGATE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  KMP_ENTRY: 'KMP_ENTRY',
  AI_REVIEW: 'AI_REVIEW',
  ISSUE_RESOLUTION: 'ISSUE_RESOLUTION',
  PACKAGE_PREP: 'PACKAGE_PREP',
  SUBMITTED: 'SUBMITTED'
} as const;

// Abandonment risk points from extracted knowledge
export const RISK_POINTS = {
  DOCUMENT_UPLOAD: {
    abandonmentRate: 0.40,
    averageTimeMinutes: 13,
    riskThresholdMinutes: 10
  },
  FOCI_ASSESS: {
    abandonmentRate: 0.25,
    averageTimeMinutes: 4,
    riskThresholdMinutes: 5
  }
} as const;

// Timeline estimates based on extracted knowledge
export const PROCESSING_TIMES = {
  STANDARD: '45-90 days',
  WITH_FOCI: '60-120 days',
  COMPLEX_FOCI: '90-180 days'
} as const;

// Test user credentials for UX testing (GovCloud compliant)
export const TEST_USERS = {
  FSO_NO_FOCI: {
    email: 'fso-test-nofoci@turbofcl.test',
    role: 'FSO',
    scenario: 'LLC with no FOCI conditions'
  },
  FSO_WITH_FOCI: {
    email: 'fso-test-foci@turbofcl.test',
    role: 'FSO',
    scenario: 'Corporation with 15% foreign ownership'
  },
  FSO_PUBLIC_CORP: {
    email: 'fso-test-public@turbofcl.test',
    role: 'FSO',
    scenario: 'Public corporation with SEC requirements'
  },
  DCSA_REVIEWER: {
    email: 'dcsa-reviewer@turbofcl.test',
    role: 'DCSA_REVIEWER',
    scenario: 'Read-only access for application review'
  }
} as const; 