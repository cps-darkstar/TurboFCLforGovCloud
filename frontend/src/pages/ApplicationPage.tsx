import React from 'react';
import { useParams } from 'react-router-dom';
import WelcomeStep from '../components/application/steps/WelcomeStep';
import { CompanyBasicsStep } from '../components/Steps/CompanyBasicsStep';
import { EntityTypeStep } from '../components/Steps/EntityTypeStep';
import { useApplication } from '../contexts/ApplicationContext';

const ApplicationPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { currentStep } = useApplication();

  // TODO: Use the 'id' from useParams to fetch existing application data if it exists.
  if (id) {
    console.log("Application ID:", id);
  }

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
    <div className="flex h-screen bg-background-primary">
      <main className="flex-1 p-8 overflow-y-auto">
        {renderCurrentStep()}
      </main>
    </div>
  );
};

export default ApplicationPage;