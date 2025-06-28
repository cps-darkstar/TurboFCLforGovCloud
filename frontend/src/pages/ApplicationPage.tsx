import React from 'react';
import { useParams } from 'react-router-dom';
import { useApplication } from '../contexts/ApplicationContext';
import TurboFCL from './TurboFCL';

const ApplicationPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { applicationData, updateApplicationData } = useApplication();

  // If ID is provided, load existing application
  // For now, we'll use the TurboFCL component directly
  
  return <TurboFCL />;
};

export default ApplicationPage;