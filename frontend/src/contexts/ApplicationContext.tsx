import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ApplicationData, ValidationIssue, AIInsight } from '../types/turbofcl';
import { ENTITY_TYPES, FOCI_CONDITIONS } from '../constants/businessRules';

interface ApplicationContextType {
  applicationData: ApplicationData;
  updateApplicationData: (data: Partial<ApplicationData>) => void;
  resetApplication: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isValidating: boolean;
  setIsValidating: (validating: boolean) => void;
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
  };

  const value: ApplicationContextType = {
    applicationData,
    updateApplicationData,
    resetApplication,
    currentStep,
    setCurrentStep,
    isValidating,
    setIsValidating
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};