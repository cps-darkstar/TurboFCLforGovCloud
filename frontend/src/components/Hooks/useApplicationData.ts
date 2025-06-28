import { useCallback, useState } from 'react';
import { AIInsight, FCLApplication, SAMData, ValidationIssue } from '../types'; // We will create this types file next

// This hook centralizes all application form state and related business logic.
export const useApplicationData = () => {
  const [applicationData, setApplicationData] = useState<FCLApplication>({
    companyName: '',
    uei: '',
    cageCode: '',
    entityType: null,
  });

  const [processingStatus, setProcessingStatus] = useState<'idle' | 'fetching' | 'validating' | 'complete' | 'error'>('idle');
  const [validation, setValidation] = useState<{ issues: ValidationIssue[], insights: AIInsight[] }>({ issues: [], insights: [] });

  // Simulates fetching data from our backend, which in turn calls SAM.gov
  const fetchSamData = async (uei: string): Promise<SAMData> => {
    console.log(`Fetching SAM.gov data for UEI: ${uei}`);
    setProcessingStatus('fetching');
    
    // In a real application, this would be a 'fetch' call to our FastAPI backend.
    // The 'await new Promise' simulates network latency for a realistic UX.
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // This is the mock data our backend would return after fetching from SAM.gov
    const mockSamData: SAMData = {
      legalBusinessName: "Quantum Dynamics LLC",
      uei: uei,
      cageCode: "8C7V9",
      entityStructure: "LIMITED LIABILITY COMPANY",
      stateOfIncorporation: "DE",
    };
    
    setProcessingStatus('complete');
    return mockSamData;
  };

  // A memoized function to update the application state.
  // Using useCallback ensures this function has a stable identity across re-renders.
  const updateApplicationData = useCallback((field: keyof FCLApplication, value: any) => {
    setApplicationData(prev => ({ ...prev, [field]: value }));

    // BUSINESS LOGIC: When a valid 12-character UEI is entered, automatically trigger the SAM.gov lookup.
    if (field === 'uei' && value.length === 12) {
      fetchSamData(value).then(samData => {
        // Once data is fetched, update the relevant fields in our state.
        setApplicationData(prev => ({
          ...prev,
          companyName: samData.legalBusinessName,
          cageCode: samData.cageCode,
        }));
        // In a future step, we would trigger AI-powered validation here.
      });
    }
  }, []);

  return {
    applicationData,
    updateApplicationData,
    processingStatus,
    validation,
  };
};