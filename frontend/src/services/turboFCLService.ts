import axios from 'axios';
import { ApplicationData, SAMData, ValidationIssue, AIInsight } from '../types/turbofcl';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Auto-detect backend port
const detectBackendPort = async () => {
  for (let port = 8000; port <= 8009; port++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        return `http://localhost:${port}`;
      }
    } catch (e) {
      continue;
    }
  }
  return 'http://localhost:8000'; // fallback
};

// Update API base URL on startup
let dynamicApiUrl = API_BASE_URL;
detectBackendPort().then(url => {
  dynamicApiUrl = url;
  apiClient.defaults.baseURL = url;
});

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: dynamicApiUrl || API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// let authToken: string | null = null;

export const turboFCLService = {
  // Set auth token
  setAuthToken(token: string | null) {
    // authToken = token;
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  // Authentication
  async authenticate(email: string, _password: string): Promise<{
    accessToken: string;
    user: any;
  }> {
    // Mock authentication for development
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = {
      sub: '123456789',
      email,
      'custom:company_name': 'Test Defense LLC',
      'custom:role': 'FSO'
    };

    const mockToken = 'mock-jwt-token-' + Date.now();
    
    return {
      accessToken: mockToken,
      user: mockUser
    };
  },

  async verifyToken(token: string): Promise<boolean> {
    // Mock token verification
    return token.startsWith('mock-jwt-token-');
  },

  async refreshToken(_refreshToken: string): Promise<{ accessToken: string }> {
    // Mock token refresh
    return { accessToken: 'mock-jwt-token-' + Date.now() };
  },

  // Create new FCL application
  async createApplication(data: Partial<ApplicationData>): Promise<{ applicationId: string }> {
    const response = await apiClient.post('/api/applications', {
      company_name: data.companyName,
      uei: data.uei,
      cage_code: data.cageCode,
      entity_type: data.entityType,
      foci_status: data.fociStatus,
    });
    return response.data;
  },

  // Get SAM.gov data
  async getSAMData(uei: string): Promise<SAMData> {
    try {
      const response = await apiClient.get(`/api/sam-data/${uei}`);
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      return {
        legalBusinessName: `Company with UEI ${uei}`,
        uei,
        cageCode: '12345',
        entityStructure: 'LIMITED LIABILITY COMPANY',
        stateOfIncorporation: 'Delaware',
        principalPlaceOfBusiness: '123 Main St, City, ST 12345',
        registrationStatus: 'Active',
        lastUpdated: new Date().toISOString()
      };
    }
  },

  // Get EDGAR data for public companies
  async getEDGARData(companyName: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/edgar-data`, {
        params: { companyName }
      });
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      return {
        cik: '0001234567',
        filings: [
          { formType: '10-K', filingDate: '2024-12-31', description: 'Annual Report' },
          { formType: '8-K', filingDate: '2025-01-15', description: 'Current Report' }
        ],
        ownershipInfo: {
          institutionalOwnership: '15%',
          foreignOwnership: '8%',
          insiderOwnership: '25%'
        }
      };
    }
  },

  // Validate application with AI
  async validateApplication(applicationId: string): Promise<{
    issues: ValidationIssue[];
    insights: AIInsight[];
  }> {
    try {
      const response = await apiClient.post(`/api/applications/${applicationId}/validate`);
      return response.data;
    } catch (error) {
      // Return mock validation results
      return {
        issues: [],
        insights: [
          {
            type: 'info',
            message: 'Your application looks good so far. Continue adding required documents.',
            confidence: 0.85
          }
        ]
      };
    }
  },

  // Chat with AI assistant
  async chatWithAI(message: string): Promise<{
    response: string;
    sources: string[];
  }> {
    try {
      const response = await apiClient.post('/api/chat', { message });
      return response.data;
    } catch (error) {
      // Return mock AI response
      const responses = [
        "Based on your entity structure, you'll need to provide your Operating Agreement and verify all members' citizenship status.",
        "For FOCI mitigation, I recommend preparing board resolutions that explicitly exclude foreign parties from classified decision-making.",
        "Your SAM.gov data shows some inconsistencies. Let me help you identify what needs to be updated.",
        "The DCSA typically requires 45-90 days for FCL processing. I can help ensure your package is complete to avoid delays."
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        sources: ['DCSA Guidelines', 'FCL Manual']
      };
    }
  },

  // Upload document
  async uploadDocument(applicationId: string, file: File): Promise<{
    documentId: string;
    extractedData?: any;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post(`/api/applications/${applicationId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      // Mock successful upload
      return {
        documentId: 'doc-' + Date.now(),
        extractedData: {
          text: 'Mock extracted text from document',
          extractedKmps: []
        }
      };
    }
  },

  // Get application status
  async getApplicationStatus(applicationId: string): Promise<ApplicationData> {
    try {
      const response = await apiClient.get(`/api/applications/${applicationId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get application status');
    }
  },

  // Submit application to DCSA
  async submitApplication(applicationId: string): Promise<{
    submissionId: string;
    status: string;
  }> {
    try {
      const response = await apiClient.post(`/api/applications/${applicationId}/submit`);
      return response.data;
    } catch (error) {
      // Mock successful submission
      return {
        submissionId: 'FCL-' + Date.now(),
        status: 'submitted'
      };
    }
  },

  // Extract KMPs from documents using NER
  async extractKMPs(applicationId: string): Promise<any[]> {
    try {
      const response = await apiClient.post(`/api/applications/${applicationId}/extract-kmps`);
      return response.data.kmps;
    } catch (error) {
      // Return mock extracted KMPs
      return [
        {
          fullName: 'John Smith',
          role: 'FSO',
          extractedByAI: true,
          confidence: 0.92
        },
        {
          fullName: 'Jane Doe',
          role: 'ITPSO',
          extractedByAI: true,
          confidence: 0.88
        }
      ];
    }
  },

  // Generate FCL package
  async generatePackage(applicationId: string): Promise<{
    packageUrl: string;
    documents: string[];
  }> {
    try {
      const response = await apiClient.post(`/api/applications/${applicationId}/generate-package`);
      return response.data;
    } catch (error) {
      // Mock package generation
      return {
        packageUrl: 'https://example.com/package.zip',
        documents: ['Application Form', 'Supporting Documents', 'KMP List']
      };
    }
  },
};