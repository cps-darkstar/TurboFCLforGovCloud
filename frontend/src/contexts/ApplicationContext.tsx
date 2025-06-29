import React, { createContext, ReactNode, useContext, useState } from 'react';
import { FOCI_CONDITIONS } from '../constants/businessRules';
import { ApplicationData } from '../types/turbofcl';

interface ApplicationContextType {
  applicationData: ApplicationData;
  updateApplicationData: (data: Partial<ApplicationData>) => void;
  resetApplication: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isValidating: boolean;
  setIsValidating: (validating: boolean) => void;
  processingStatus: 'idle' | 'fetching' | 'validating' | 'complete' | 'error';
  setProcessingStatus: (status: 'idle' | 'fetching' | 'validating' | 'complete' | 'error') => void;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export const useApplication = () => {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
};

interface ApplicationProviderProps {
  children: ReactNode;
}

const initialApplicationData: ApplicationData = {
  companyName: '',
  uei: '',
  cageCode: '',
  entityType: '',
  ownershipStructure: '',
  fociStatus: [FOCI_CONDITIONS.NO_FOCI],
  kmpStructure: [],
  hasInternationalOps: false,
  hasForeignFunding: false,
  kmps: [],
  documents: [],
  samData: null,
  edgarData: null,
  validationIssues: [],
  aiInsights: [],
  processingStatus: 'idle'
};

export const ApplicationProvider: React.FC<ApplicationProviderProps> = ({ children }) => {
  const [applicationData, setApplicationData] = useState<ApplicationData>(initialApplicationData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'fetching' | 'validating' | 'complete' | 'error'>('idle');

  const updateApplicationData = (data: Partial<ApplicationData>) => {
    setApplicationData(prev => ({
      ...prev,
      ...data
    }));
  };

  const resetApplication = () => {
    setApplicationData(initialApplicationData);
    setCurrentStep(0);
    setIsValidating(false);
    setProcessingStatus('idle');
  };

  const value: ApplicationContextType = {
    applicationData,
    updateApplicationData,
    resetApplication,
    currentStep,
    setCurrentStep,
    isValidating,
    setIsValidating,
    processingStatus,
    setProcessingStatus
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};