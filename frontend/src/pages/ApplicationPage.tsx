import React from 'react';
import { useParams } from 'react-router-dom';
import WelcomeStep from '../components/application/steps/WelcomeStep';
import { Navigation } from '../components/layout/Navigation';
import { ProgressBar } from '../components/layout/ProgressBar';
import { CompanyBasicsStep } from '../components/Steps/CompanyBasicsStep';
import { EntityTypeStep } from '../components/Steps/EntityTypeStep';
import { useApplication } from '../contexts/ApplicationContext';

const ApplicationPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { currentStep, setCurrentStep } = useApplication();

  // TODO: Use the 'id' from useParams to fetch existing application data if it exists.
  if (id) {
    console.log("Application ID:", id);
  }

  const totalSteps = 3;
  const stepTitles = ['Welcome', 'Company Information', 'Entity Type'];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

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
    <div className="flex flex-col h-screen bg-background-primary">
      {currentStep > 0 && (
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
          title={stepTitles[currentStep]} 
        />
      )}
      <main className="flex-1 p-8 overflow-y-auto">
        {renderCurrentStep()}
      </main>
      {currentStep > 0 && (
        <Navigation
          onNext={handleNext}
          onBack={handleBack}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === totalSteps - 1}
        />
      )}
    </div>
  );
};

export default ApplicationPage;