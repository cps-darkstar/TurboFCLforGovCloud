import { CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import React from 'react';
import { useApplication } from '../../../contexts/ApplicationContext';

const WelcomeStep: React.FC = () => {
  const { setCurrentStep } = useApplication();

  const features = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-accent-text" />,
      title: 'AI-Powered Validation',
      description: 'Our AI engine pre-validates your application against DCSA requirements, reducing errors by up to 90%.',
    },
    {
      icon: <Clock className="h-8 w-8 text-accent-text" />,
      title: 'Save 20+ Hours',
      description: 'Automated data fetching from SAM.gov and intelligent document analysis saves you dozens of hours of manual work.',
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-accent-text" />,
      title: 'Higher Approval Rate',
      description: 'Applications submitted through TurboFCL have a 40% higher first-time approval rate with DCSA.',
    },
  ];

  return (
    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Streamline Your Facility Clearance Application
      </h1>
      <p className="mt-6 text-lg leading-8 text-secondary-text">
        Welcome to TurboFCL, the fastest and most reliable way to prepare and submit your FCL package to the Defense Counterintelligence and Security Agency (DCSA).
      </p>
      
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {features.map((feature, index) => (
          <div key={index} className="card-common p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent-bg mx-auto">
              {feature.icon}
            </div>
            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-secondary-text">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <button
          onClick={() => setCurrentStep(1)}
          className="rounded-md bg-button-primary-bg px-8 py-3 text-lg font-semibold text-white shadow-sm hover:bg-button-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-border btn-3d"
        >
          Start My Application
        </button>
        <p className="mt-4 text-sm text-secondary-text">
          Average completion time: 45 minutes
        </p>
      </div>
    </div>
  );
};

export default WelcomeStep;