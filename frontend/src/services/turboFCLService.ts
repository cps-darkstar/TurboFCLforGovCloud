import axios from 'axios';
import { ApplicationData, ChatMessage, SAMData, ValidationIssue, AIInsight } from '../types/turbofcl';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const turboFCLService = {
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
    const response = await apiClient.get(`/api/sam-data/${uei}`);
    return response.data;
  },

  // Get EDGAR data for public companies
  async getEDGARData(companyName: string): Promise<any> {
    const response = await apiClient.get(`/api/edgar-data`, {
      params: { companyName }
    });
    return response.data;
  },

  // Validate application with AI
  async validateApplication(applicationId: string): Promise<{
    issues: ValidationIssue[];
    insights: AIInsight[];
  }> {
    const response = await apiClient.post(`/api/applications/${applicationId}/validate`);
    return response.data;
  },

  // Chat with AI assistant
  async chatWithAI(message: string): Promise<{
    response: string;
    sources: string[];
  }> {
    const response = await apiClient.post('/api/chat', { message });
    return response.data;
  },

  // Upload document
  async uploadDocument(applicationId: string, file: File): Promise<{
    documentId: string;
    extractedData?: any;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicationId', applicationId);

    const response = await apiClient.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get application status
  async getApplicationStatus(applicationId: string): Promise<ApplicationData> {
    const response = await apiClient.get(`/api/applications/${applicationId}`);
    return response.data;
  },

  // Submit application to DCSA
  async submitApplication(applicationId: string): Promise<{
    submissionId: string;
    status: string;
  }> {
    const response = await apiClient.post(`/api/applications/${applicationId}/submit`);
    return response.data;
  },

  // Extract KMPs from documents using NER
  async extractKMPs(applicationId: string): Promise<any[]> {
    const response = await apiClient.post(`/api/applications/${applicationId}/extract-kmps`);
    return response.data.kmps;
  },

  // Generate FCL package
  async generatePackage(applicationId: string): Promise<{
    packageUrl: string;
    documents: string[];
  }> {
    const response = await apiClient.post(`/api/applications/${applicationId}/generate-package`);
    return response.data;
  },
}; 