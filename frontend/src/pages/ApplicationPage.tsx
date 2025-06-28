import React from 'react';
import { useParams } from 'react-router-dom';
import { useApplication } from '../contexts/ApplicationContext';
import { useAuth } from '../contexts/AuthContext';

const ApplicationPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { applicationData, updateApplicationData, currentStep, setCurrentStep } = useApplication();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <CompanyBasicsStep />;
      case 2:
        return <EntityTypeStep />;
      // Other steps will be added here
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-8 overflow-y-auto">
        {renderCurrentStep()}
      </main>
    </div>
  );
};

export default ApplicationPage;