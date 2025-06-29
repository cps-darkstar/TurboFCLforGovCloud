// TurboFCL Application Types

export interface FCLApplication {
  companyName: string;
  uei: string;
  cageCode: string;
  entityType: string | null;
}

export interface ApplicationData {
  companyName: string;
  uei: string;
  cageCode: string;
  entityType: string;
  ownershipStructure: string;
  fociStatus: string[];
  kmpStructure: string[];
  hasInternationalOps: boolean;
  hasForeignFunding: boolean;
  kmps: KMP[];
  documents: Document[];
  samData: SAMData | null;
  edgarData: EDGARData | null;
  validationIssues: ValidationIssue[];
  aiInsights: AIInsight[];
  processingStatus: 'idle' | 'fetching' | 'validating' | 'complete' | 'error';
}

export interface KMP {
  id: string;
  fullName: string;
  role: string;
  citizenshipStatus?: string;
  clearanceRequired: boolean;
  clearanceLevel?: string;
  extractedByAI?: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: any;
}

export interface SAMData {
  legalBusinessName: string;
  uei: string;
  cageCode: string;
  entityStructure: string;
  stateOfIncorporation: string;
  principalPlaceOfBusiness: string;
  registrationStatus: string;
  lastUpdated: string;
}

export interface EDGARData {
  cik: string;
  filings: Filing[];
  ownershipInfo: OwnershipInfo;
}

export interface Filing {
  formType: string;
  filingDate: string;
  description: string;
}

export interface OwnershipInfo {
  institutionalOwnership: string;
  foreignOwnership: string;
  insiderOwnership: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  field: string;
  message: string;
  source: string;
}

export interface AIInsight {
  type: 'recommendation' | 'warning' | 'info';
  message: string;
  confidence: number;
}

export interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp?: string;
}

export interface BusinessStructureRequirement {
  documents: string[];
  kmps: string[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
} 