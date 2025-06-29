/**
 * Enterprise Compliance Service
 * 
 * This service provides comprehensive compliance management capabilities
 * for the TurboFCL enterprise system, ensuring adherence to NISPOM,
 * FedRAMP, and other government regulations.
 */

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  regulation: string; // NISPOM, FedRAMP, DFARS, etc.
  category: 'SECURITY' | 'PRIVACY' | 'AUDIT' | 'OPERATIONAL' | 'FINANCIAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mandatory: boolean;
  applicable_entities: string[];
  implementation_guidance: string;
  verification_method: 'AUTOMATED' | 'MANUAL' | 'HYBRID';
  frequency: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

export interface ComplianceAssessment {
  id: string;
  requirement_id: string;
  entity_id: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE' | 'PENDING';
  score: number; // 0-100
  last_assessed: Date;
  next_assessment: Date;
  assessor: string;
  evidence: ComplianceEvidence[];
  findings: ComplianceFinding[];
  remediation_plan?: RemediationPlan;
}

export interface ComplianceEvidence {
  id: string;
  type: 'DOCUMENT' | 'SCREENSHOT' | 'LOG' | 'CERTIFICATE' | 'REPORT';
  title: string;
  description: string;
  file_url?: string;
  file_hash?: string;
  collected_date: Date;
  expiration_date?: Date;
  classification?: string;
}

export interface ComplianceFinding {
  id: string;
  type: 'VIOLATION' | 'WEAKNESS' | 'OBSERVATION' | 'RECOMMENDATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  impact: string;
  root_cause?: string;
  recommendation: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED';
  due_date?: Date;
}

export interface RemediationPlan {
  id: string;
  finding_id: string;
  title: string;
  description: string;
  actions: RemediationAction[];
  target_completion: Date;
  assigned_to: string;
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  progress_percentage: number;
}

export interface RemediationAction {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  due_date: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  completion_date?: Date;
  notes?: string;
}

export interface ComplianceReport {
  id: string;
  title: string;
  type: 'EXECUTIVE' | 'DETAILED' | 'TECHNICAL' | 'REGULATORY';
  period_start: Date;
  period_end: Date;
  overall_score: number;
  compliance_rate: number;
  total_requirements: number;
  compliant_requirements: number;
  non_compliant_requirements: number;
  pending_requirements: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  trends: ComplianceTrend[];
  generated_date: Date;
  generated_by: string;
}

export interface ComplianceTrend {
  period: string;
  compliance_rate: number;
  total_findings: number;
  resolved_findings: number;
}

class ComplianceService {
  private baseUrl: string;
  private requirements: Map<string, ComplianceRequirement> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || '/api/v1';
    this.initializeComplianceRequirements();
  }

  private initializeComplianceRequirements(): void {
    // Initialize with common government compliance requirements
    const nisponRequirements: ComplianceRequirement[] = [
      {
        id: 'NISPOM-5-100',
        name: 'Facility Security Clearance',
        description: 'Contractor must obtain and maintain appropriate facility security clearance',
        regulation: 'NISPOM',
        category: 'SECURITY',
        severity: 'CRITICAL',
        mandatory: true,
        applicable_entities: ['ALL'],
        implementation_guidance: 'Submit SF-328 and maintain current FCL',
        verification_method: 'MANUAL',
        frequency: 'ANNUALLY'
      },
      {
        id: 'NISPOM-5-200',
        name: 'Personnel Security Clearances',
        description: 'Personnel must have appropriate security clearances for classified access',
        regulation: 'NISPOM',
        category: 'SECURITY',
        severity: 'CRITICAL',
        mandatory: true,
        applicable_entities: ['ALL'],
        implementation_guidance: 'Verify and maintain personnel clearance records',
        verification_method: 'AUTOMATED',
        frequency: 'CONTINUOUS'
      },
      {
        id: 'NISPOM-5-300',
        name: 'FOCI Mitigation',
        description: 'Foreign ownership, control, or influence must be properly mitigated',
        regulation: 'NISPOM',
        category: 'SECURITY',
        severity: 'HIGH',
        mandatory: true,
        applicable_entities: ['FOREIGN_ENTITIES'],
        implementation_guidance: 'Implement approved FOCI mitigation measures',
        verification_method: 'HYBRID',
        frequency: 'ANNUALLY'
      }
    ];

    // Load requirements into memory
    nisponRequirements.forEach(req => {
      this.requirements.set(req.id, req);
    });
  }

  /**
   * Get all compliance requirements
   */
  async getRequirements(
    category?: string,
    regulation?: string,
    severity?: string
  ): Promise<ComplianceRequirement[]> {
    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      if (regulation) queryParams.append('regulation', regulation);
      if (severity) queryParams.append('severity', severity);

      const response = await fetch(`${this.baseUrl}/compliance/requirements?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch compliance requirements:', error);
      // Return cached requirements as fallback
      return Array.from(this.requirements.values()).filter(req => {
        if (category && req.category !== category) return false;
        if (regulation && req.regulation !== regulation) return false;
        if (severity && req.severity !== severity) return false;
        return true;
      });
    }
  }

  /**
   * Perform compliance assessment for an entity
   */
  async performAssessment(
    entityId: string,
    requirementIds: string[],
    assessorId: string
  ): Promise<ComplianceAssessment[]> {
    try {
      const payload = {
        entity_id: entityId,
        requirement_ids: requirementIds,
        assessor_id: assessorId
      };

      const response = await fetch(`${this.baseUrl}/compliance/assessments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const assessments = await response.json();
      
      // Cache assessments
      assessments.forEach((assessment: ComplianceAssessment) => {
        this.assessments.set(assessment.id, assessment);
      });

      return assessments;
    } catch (error) {
      console.error('Failed to perform compliance assessment:', error);
      throw error;
    }
  }

  /**
   * Get compliance status for an entity
   */
  async getComplianceStatus(entityId: string): Promise<{
    overall_score: number;
    compliance_rate: number;
    assessments: ComplianceAssessment[];
    critical_findings: ComplianceFinding[];
    overdue_actions: RemediationAction[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/compliance/status/${entityId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get compliance status:', error);
      throw error;
    }
  }

  /**
   * Create compliance finding
   */
  async createFinding(
    assessmentId: string,
    finding: Omit<ComplianceFinding, 'id'>
  ): Promise<ComplianceFinding> {
    try {
      const payload = {
        assessment_id: assessmentId,
        ...finding
      };

      const response = await fetch(`${this.baseUrl}/compliance/findings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create compliance finding:', error);
      throw error;
    }
  }

  /**
   * Create remediation plan
   */
  async createRemediationPlan(
    findingId: string,
    plan: Omit<RemediationPlan, 'id' | 'finding_id'>
  ): Promise<RemediationPlan> {
    try {
      const payload = {
        finding_id: findingId,
        ...plan
      };

      const response = await fetch(`${this.baseUrl}/compliance/remediation-plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create remediation plan:', error);
      throw error;
    }
  }

  /**
   * Upload compliance evidence
   */
  async uploadEvidence(
    assessmentId: string,
    evidence: Omit<ComplianceEvidence, 'id'>,
    file?: File
  ): Promise<ComplianceEvidence> {
    try {
      const formData = new FormData();
      formData.append('assessment_id', assessmentId);
      formData.append('evidence', JSON.stringify(evidence));
      
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`${this.baseUrl}/compliance/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
          // Don't set Content-Type for FormData
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload compliance evidence:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateReport(
    entityId: string,
    reportType: 'EXECUTIVE' | 'DETAILED' | 'TECHNICAL' | 'REGULATORY',
    periodStart: Date,
    periodEnd: Date
  ): Promise<ComplianceReport> {
    try {
      const payload = {
        entity_id: entityId,
        report_type: reportType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      };

      const response = await fetch(`${this.baseUrl}/compliance/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Check if entity is compliant for specific requirement
   */
  async checkCompliance(
    entityId: string,
    requirementId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/compliance/check/${entityId}/${requirementId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.compliant === true;
    } catch (error) {
      console.error('Failed to check compliance:', error);
      return false;
    }
  }

  /**
   * Get compliance trends
   */
  async getComplianceTrends(
    entityId: string,
    period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    count: number = 12
  ): Promise<ComplianceTrend[]> {
    try {
      const queryParams = new URLSearchParams({
        period,
        count: count.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/compliance/trends/${entityId}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get compliance trends:', error);
      return [];
    }
  }

  /**
   * Schedule automated compliance check
   */
  async scheduleAutomatedCheck(
    entityId: string,
    requirementId: string,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ): Promise<void> {
    try {
      const payload = {
        entity_id: entityId,
        requirement_id: requirementId,
        frequency
      };

      const response = await fetch(`${this.baseUrl}/compliance/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to schedule automated compliance check:', error);
      throw error;
    }
  }

  /**
   * Export compliance data
   */
  async exportComplianceData(
    entityId: string,
    format: 'CSV' | 'JSON' | 'PDF',
    includeEvidence: boolean = false
  ): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams({
        format: format.toLowerCase(),
        include_evidence: includeEvidence.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/compliance/export/${entityId}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export compliance data:', error);
      throw error;
    }
  }

  /**
   * Validate compliance configuration
   */
  validateComplianceConfig(
    entityType: string,
    clearanceLevel: string,
    contractTypes: string[]
  ): {
    required_regulations: string[];
    applicable_requirements: string[];
    recommended_frequency: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    const config = {
      required_regulations: ['NISPOM'],
      applicable_requirements: [] as string[],
      recommended_frequency: 'ANNUALLY',
      risk_level: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    };

    // Determine applicable requirements based on entity characteristics
    if (['SECRET', 'TOP_SECRET', 'SCI', 'SAP'].includes(clearanceLevel)) {
      config.applicable_requirements.push('NISPOM-5-100', 'NISPOM-5-200');
      config.risk_level = 'HIGH';
    }

    if (contractTypes.includes('CLASSIFIED')) {
      config.required_regulations.push('DFARS');
      config.recommended_frequency = 'QUARTERLY';
      config.risk_level = 'CRITICAL';
    }

    if (contractTypes.includes('CLOUD')) {
      config.required_regulations.push('FedRAMP');
    }

    return config;
  }

  // Private helper methods

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Calculate overall compliance score
   */
  calculateComplianceScore(assessments: ComplianceAssessment[]): number {
    if (assessments.length === 0) return 0;

    const totalWeight = assessments.reduce((sum, assessment) => {
      const requirement = this.requirements.get(assessment.requirement_id);
      const weight = this.getSeverityWeight(requirement?.severity || 'MEDIUM');
      return sum + weight;
    }, 0);

    const weightedScore = assessments.reduce((sum, assessment) => {
      const requirement = this.requirements.get(assessment.requirement_id);
      const weight = this.getSeverityWeight(requirement?.severity || 'MEDIUM');
      return sum + (assessment.score * weight);
    }, 0);

    return Math.round(weightedScore / totalWeight);
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 2;
    }
  }
}

// Export singleton instance
export const complianceService = new ComplianceService();
export default complianceService;
