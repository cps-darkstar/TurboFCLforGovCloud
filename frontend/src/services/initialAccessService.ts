/**
 * Initial Access Service for TurboFCL
 * Handles DARPA Bridges integration and seamless onboarding
 */

import {
    BridgesFormData,
    CompanyEntity,
    CompanyMatchingResult,
    CompanySizeEstimate,
    ConfidenceLevel,
    ContactInference,
    EmailDomainAnalysis,
    EstimatedContactRole,
    HandoffLikelihood,
    InitialAccessRequest,
    KMPLikelihood,
    OnboardingProgress,
    OnboardingStep,
    TestEntityBaseline
} from '@/types/enterprise';

export class InitialAccessService {
  private readonly baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  /**
   * Process secure link from DARPA Bridges handoff
   */
  async processSecureLink(token: string): Promise<InitialAccessRequest> {
    try {
      const response = await fetch(`${this.baseUrl}/api/initial-access/validate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Invalid or expired secure link');
      }

      const accessRequest = await response.json();
      
      // Audit the access attempt
      this.auditSecureAccess(token, true);
      
      return accessRequest;
    } catch (error) {
      this.auditSecureAccess(token, false, error.message);
      throw error;
    }
  }

  /**
   * Analyze contact information from DARPA Bridges form
   */
  analyzeContactInfo(bridgesData: BridgesFormData): ContactInference {
    const title = bridgesData.titleRole.toLowerCase();
    const companyName = bridgesData.companyOrganization.toLowerCase();
    const emailDomain = bridgesData.email.split('@')[1]?.toLowerCase() || '';

    // Estimate role based on title analysis
    const estimatedRole = this.estimateContactRole(title);
    
    // Determine KMP likelihood
    const kmpLikelihood = this.estimateKMPLikelihood(title, estimatedRole);
    
    // Analyze email domain
    const emailDomainAnalysis = this.analyzeEmailDomain(bridgesData.email, companyName);
    
    // Estimate company size
    const companySizeEstimate = this.estimateCompanySize(title, emailDomain);
    
    // Predict handoff likelihood
    const handoffLikelihood = this.estimateHandoffLikelihood(estimatedRole, companySizeEstimate);
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      emailDomainAnalysis.confidence,
      this.getRoleConfidence(estimatedRole),
      this.getSizeConfidence(companySizeEstimate)
    );

    return {
      estimatedRole,
      kmpLikelihood,
      emailDomainAnalysis,
      companySizeEstimate,
      handoffLikelihood,
      confidence
    };
  }

  /**
   * Map DARPA Bridges data to initial TurboFCL application
   */
  mapBridgesDataToApplication(
    bridgesData: BridgesFormData, 
    contactInference: ContactInference
  ): Partial<CompanyEntity> {
    return {
      legalName: this.cleanCompanyName(bridgesData.companyOrganization),
      
      primaryContact: {
        firstName: this.extractFirstName(bridgesData.fullName),
        lastName: this.extractLastName(bridgesData.fullName),
        title: bridgesData.titleRole,
        email: bridgesData.email,
        phone: bridgesData.phoneNumber,
        citizenship: ['US'], // Default assumption for DARPA contractors
        isKeyManagementPersonnel: contactInference.kmpLikelihood !== 'UNLIKELY_KMP'
      },
      
      // Infer business categories based on DARPA context
      businessCategories: this.inferBusinessCategories(bridgesData, contactInference),
      
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'DARPA_BRIDGES_HANDOFF',
        updatedBy: 'SYSTEM',
        version: 1,
        dataClassification: 'CUI',
        auditTrail: [{
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          eventType: 'ENTITY_CREATED',
          userId: 'SYSTEM',
          sessionId: crypto.randomUUID(),
          description: `Entity created from DARPA Bridges handoff - Topic: ${bridgesData.topic}`,
          metadata: {
            originalBridgesData: bridgesData,
            contactInference
          },
          riskLevel: 'LOW'
        }]
      }
    };
  }

  /**
   * Search for company matches using SAM.gov data
   */
  async searchCompanyMatches(
    reportedName: string,
    emailDomain: string,
    ueiHint?: string
  ): Promise<CompanyMatchingResult[]> {
    const searchParams = new URLSearchParams({
      name: reportedName,
      domain: emailDomain,
      ...(ueiHint && { uei: ueiHint })
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/api/initial-access/match-company?${searchParams}`
      );
      
      if (!response.ok) {
        throw new Error('Company search failed');
      }
      
      const matches = await response.json();
      return matches.sort((a: any, b: any) => b.confidence - a.confidence);
    } catch (error) {
      // Return empty array if search fails
      console.warn('Company search failed:', error);
      return [];
    }
  }

  /**
   * Create test entity baselines with consistent data
   */
  createTestEntityBaselines(): TestEntityBaseline[] {
    const baseEmail = 'coleman@pearsonsecurityservices.com';
    const basePhone = '+1-703-555-0100';
    const baseName = 'Coleman Pearson';

    return [
      {
        testEntityId: 'CPS-Test-Entity_1_FSO',
        assignedContact: {
          name: baseName,
          email: baseEmail,
          phone: basePhone,
          title: 'CEO/FSO',
          estimatedRole: 'CEO_FSO_COMBINED',
          kmpLikelihood: 'DEFINITELY_KMP'
        },
        entityCharacteristics: {
          complexityLevel: 'VERY_LOW',
          businessSize: 'SMALL_BUSINESS',
          fociComplexity: 'NO_FOCI',
          kmpCount: 1,
          ownershipTiers: 1,
          foreignOwnershipPercentage: 0,
          description: 'Darkstar Capture Services, LLC - Single Member LLC, Virginia, ~$500K revenue, no FOCI',
          expectedChallenges: ['Basic FCL requirements', 'Single KMP validation']
        },
        testScenario: {
          scenarioId: 'SIMPLE_SINGLE_MEMBER_LLC',
          scenarioName: 'Simple Single Member LLC',
          objectives: ['Test basic FCL workflow', 'Validate single-person entity'],
          expectedOutcomes: ['Quick approval', 'Minimal FOCI concerns'],
          testCriteria: [
            {
              criteriaId: 'KMP_COUNT',
              description: 'Should identify exactly 1 KMP',
              expectedResult: '1 KMP identified',
              validationMethod: 'AUTOMATED_CHECK'
            }
          ]
        }
      },
      {
        testEntityId: 'CPS-Test-Entity_2_FSO',
        assignedContact: {
          name: baseName,
          email: baseEmail,
          phone: basePhone,
          title: 'FSO',
          estimatedRole: 'DEDICATED_FSO',
          kmpLikelihood: 'DEFINITELY_KMP'
        },
        entityCharacteristics: {
          complexityLevel: 'MODERATE',
          businessSize: 'SMALL_BUSINESS',
          fociComplexity: 'POTENTIAL_FOCI',
          kmpCount: 8,
          ownershipTiers: 2,
          foreignOwnershipPercentage: 5,
          description: 'Valens Global, LLC - 8 owners (2 controlling), Pennsylvania, $7M revenue, potential FOCI',
          expectedChallenges: ['Multiple owner validation', 'FOCI assessment', 'Complex ownership structure']
        },
        testScenario: {
          scenarioId: 'MULTI_OWNER_LLC',
          scenarioName: 'Multi-Owner LLC with Potential FOCI',
          objectives: ['Test complex ownership analysis', 'Validate FOCI detection'],
          expectedOutcomes: ['FOCI mitigation required', 'Multiple KMP verification'],
          testCriteria: [
            {
              criteriaId: 'FOCI_DETECTION',
              description: 'Should detect potential FOCI factors',
              expectedResult: 'FOCI assessment triggered',
              validationMethod: 'AUTOMATED_CHECK'
            }
          ]
        }
      },
      {
        testEntityId: 'CPS-Test-Entity_3_FSO',
        assignedContact: {
          name: baseName,
          email: baseEmail,
          phone: basePhone,
          title: 'Chief Security Officer',
          estimatedRole: 'DEDICATED_FSO',
          kmpLikelihood: 'DEFINITELY_KMP'
        },
        entityCharacteristics: {
          complexityLevel: 'HIGH',
          businessSize: 'LARGE_BUSINESS',
          fociComplexity: 'COMPLEX_FOCI',
          kmpCount: 15,
          ownershipTiers: 4,
          foreignOwnershipPercentage: 25,
          description: 'PE-backed defense contractor with complex ownership and international operations',
          expectedChallenges: [
            'Complex ownership tiers', 
            'Foreign investment analysis', 
            'Multiple FOCI factors',
            'Extensive KMP identification'
          ]
        },
        testScenario: {
          scenarioId: 'COMPLEX_PE_BACKED',
          scenarioName: 'PE-Backed Corporation with Complex FOCI',
          objectives: ['Test complex ownership analysis', 'Validate advanced FOCI mitigation'],
          expectedOutcomes: ['Complex FOCI mitigation plan', 'Extensive documentation requirements'],
          testCriteria: [
            {
              criteriaId: 'OWNERSHIP_ANALYSIS',
              description: 'Should analyze 4-tier ownership structure',
              expectedResult: 'Complete ownership mapping',
              validationMethod: 'MANUAL_REVIEW'
            }
          ]
        }
      }
    ];
  }

  /**
   * Calculate onboarding progress
   */
  calculateOnboardingProgress(
    currentStep: OnboardingStep,
    completedSteps: OnboardingStep[]
  ): OnboardingProgress {
    const allSteps = Object.values(OnboardingStep);
    const totalSteps = allSteps.length;
    const completedCount = completedSteps.length;
    const progressPercentage = Math.round((completedCount / totalSteps) * 100);
    
    // Check if we can proceed to next step
    const currentIndex = allSteps.indexOf(currentStep);
    const canProceed = currentIndex === 0 || completedSteps.includes(allSteps[currentIndex - 1]);
    
    return {
      currentStep,
      completedSteps,
      totalSteps,
      progressPercentage,
      canProceed,
      blockers: canProceed ? [] : ['Previous step not completed']
    };
  }

  // Private helper methods
  private estimateContactRole(title: string): EstimatedContactRole {
    if (title.includes('ceo') || title.includes('owner') || title.includes('founder') || title.includes('president')) {
      return 'CEO_FSO_COMBINED';
    } else if (title.includes('fso') || title.includes('security') || title.includes('compliance')) {
      return 'DEDICATED_FSO';
    } else if (title.includes('business development') || title.includes('sales') || title.includes('bd')) {
      return 'BUSINESS_DEVELOPMENT';
    } else if (title.includes('cto') || title.includes('engineer') || title.includes('technical')) {
      return 'TECHNICAL_LEAD';
    } else if (title.includes('vp') || title.includes('vice president') || title.includes('director')) {
      return 'EXECUTIVE_LEADERSHIP';
    }
    return 'UNKNOWN';
  }

  private estimateKMPLikelihood(title: string, role: EstimatedContactRole): KMPLikelihood {
    if (role === 'CEO_FSO_COMBINED' || role === 'DEDICATED_FSO') {
      return 'DEFINITELY_KMP';
    } else if (role === 'EXECUTIVE_LEADERSHIP' || role === 'TECHNICAL_LEAD') {
      return 'LIKELY_KMP';
    } else if (title.includes('manager') || title.includes('lead')) {
      return 'POSSIBLY_KMP';
    }
    return 'UNLIKELY_KMP';
  }

  private analyzeEmailDomain(email: string, companyName: string): EmailDomainAnalysis {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    const isProfessionalEmail = !personalDomains.includes(domain);
    
    let confidence: ConfidenceLevel = 'LOW';
    let extractedCompanyName = '';
    
    if (isProfessionalEmail) {
      extractedCompanyName = domain
        .replace(/\.(com|org|net|gov|mil)$/, '')
        .replace(/[-_]/g, ' ')
        .split('.')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      confidence = this.calculateDomainMatchConfidence(extractedCompanyName, companyName);
    }

    return {
      domain,
      isProfessionalEmail,
      confidence,
      extractedCompanyName: extractedCompanyName || undefined,
      domainCompanyMatch: {
        matchFound: isProfessionalEmail && confidence !== 'LOW',
        extractedCompanyName: extractedCompanyName || undefined,
        confidence: this.confidenceToNumber(confidence),
        methodology: isProfessionalEmail ? 'KEYWORD_EXTRACTION' : 'NO_MATCH',
        matchingElements: isProfessionalEmail ? [extractedCompanyName] : []
      }
    };
  }

  private estimateCompanySize(title: string, domain: string): CompanySizeEstimate {
    // Size hints from title
    if (title.includes('ceo') || title.includes('owner') || title.includes('founder')) {
      return 'SMALL'; // CEOs usually in smaller companies for defense contractors
    } else if (title.includes('vp') || title.includes('director')) {
      return 'MEDIUM';
    } else if (title.includes('c-level') || title.includes('chief')) {
      return 'LARGE';
    }
    
    // Size hints from domain (could be enhanced with domain intelligence)
    if (domain.includes('consulting') || domain.includes('services')) {
      return 'SMALL';
    }
    
    return 'UNKNOWN';
  }

  private estimateHandoffLikelihood(role: EstimatedContactRole, size: CompanySizeEstimate): HandoffLikelihood {
    if (role === 'CEO_FSO_COMBINED' || (role === 'DEDICATED_FSO' && size === 'SMALL')) {
      return 'WILL_COMPLETE_PERSONALLY';
    } else if (role === 'BUSINESS_DEVELOPMENT' || size === 'LARGE') {
      return 'LIKELY_TO_HANDOFF';
    } else if (size === 'MEDIUM') {
      return 'MAY_DELEGATE';
    }
    return 'UNCERTAIN';
  }

  private calculateOverallConfidence(
    emailConfidence: ConfidenceLevel,
    roleConfidence: ConfidenceLevel,
    sizeConfidence: ConfidenceLevel
  ): ConfidenceLevel {
    const scores = [emailConfidence, roleConfidence, sizeConfidence]
      .map(conf => this.confidenceToNumber(conf));
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return this.numberToConfidence(avgScore);
  }

  private calculateDomainMatchConfidence(extracted: string, reported: string): ConfidenceLevel {
    const extractedLower = extracted.toLowerCase();
    const reportedLower = reported.toLowerCase();
    
    if (extractedLower === reportedLower) return 'HIGH';
    if (extractedLower.includes(reportedLower) || reportedLower.includes(extractedLower)) return 'MEDIUM';
    
    // Check for word overlap
    const extractedWords = extractedLower.split(' ');
    const reportedWords = reportedLower.split(' ');
    const overlap = extractedWords.filter(word => reportedWords.includes(word)).length;
    
    if (overlap > 0) return 'MEDIUM';
    return 'LOW';
  }

  private getRoleConfidence(role: EstimatedContactRole): ConfidenceLevel {
    switch (role) {
      case 'CEO_FSO_COMBINED':
      case 'DEDICATED_FSO':
        return 'HIGH';
      case 'EXECUTIVE_LEADERSHIP':
      case 'TECHNICAL_LEAD':
        return 'MEDIUM';
      case 'BUSINESS_DEVELOPMENT':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private getSizeConfidence(size: CompanySizeEstimate): ConfidenceLevel {
    return size === 'UNKNOWN' ? 'LOW' : 'MEDIUM';
  }

  private confidenceToNumber(confidence: ConfidenceLevel): number {
    switch (confidence) {
      case 'VERY_LOW': return 0.1;
      case 'LOW': return 0.3;
      case 'MEDIUM': return 0.5;
      case 'HIGH': return 0.7;
      case 'VERY_HIGH': return 0.9;
      case 'CERTAIN': return 1.0;
      default: return 0.3;
    }
  }

  private numberToConfidence(score: number): ConfidenceLevel {
    if (score >= 0.9) return 'VERY_HIGH';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    if (score >= 0.3) return 'LOW';
    return 'VERY_LOW';
  }

  private extractFirstName(fullName: string): string {
    return fullName.trim().split(' ')[0] || '';
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private cleanCompanyName(rawName: string): string {
    return rawName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/,?\s*(LLC|Inc\.?|Corp\.?|Corporation)$/i, match => match.toUpperCase());
  }

  private inferBusinessCategories(bridgesData: BridgesFormData, inference: ContactInference): any[] {
    // Basic inference based on DARPA context - could be enhanced
    const categories = [];
    
    // Most DARPA contractors are small businesses
    if (inference.companySizeEstimate === 'SMALL' || inference.companySizeEstimate === 'MICRO') {
      categories.push({
        category: 'SMALL_BUSINESS',
        certificationNumber: undefined,
        expirationDate: undefined,
        certifyingAgency: 'SBA'
      });
    }
    
    return categories;
  }

  private auditSecureAccess(token: string, success: boolean, error?: string): void {
    // Log security event for audit trail
    console.log(`Secure access attempt: ${success ? 'SUCCESS' : 'FAILED'}`, {
      token: token.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      error
    });
  }
}
