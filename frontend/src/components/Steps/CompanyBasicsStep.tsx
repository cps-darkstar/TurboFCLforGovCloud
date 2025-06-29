import { CheckCircle, Loader2, Search } from 'lucide-react';
import React, { useState } from 'react';
import { useApplication } from '../../contexts/ApplicationContext';
import { turboFCLService } from '../../services/turboFCLService';
import { Button } from '../ui/Button';

export const CompanyBasicsStep = () => {
  const { applicationData, updateApplicationData, processingStatus, setProcessingStatus } = useApplication();
  const [lookupError, setLookupError] = useState<string>('');

  const handleUeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic validation to allow only alphanumeric characters
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    updateApplicationData({ uei: value });
    // Clear any previous error when user starts typing
    if (lookupError) setLookupError('');
  };

  const handleLookupCompany = async () => {
    if (!applicationData.uei || applicationData.uei.length !== 12) {
      setLookupError('Please enter a valid 12-character UEI');
      return;
    }

    try {
      setProcessingStatus('fetching');
      setLookupError('');
      
      const samData = await turboFCLService.getSAMData(applicationData.uei);
      
      updateApplicationData({
        companyName: samData.legalBusinessName,
        cageCode: samData.cageCode,
        samData: samData
      });
      
      setProcessingStatus('complete');
    } catch (error) {
      setLookupError('Unable to fetch company data. Please verify your UEI and try again.');
      setProcessingStatus('error');
    }
  };

  const isUeiValid = applicationData.uei.length === 12;
  const hasCompanyData = applicationData.companyName && applicationData.cageCode;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Company Information</h2>
      <p className="mt-2 text-sm text-secondary-text">
        Start by entering your company's Unique Entity ID (UEI). We will use it to securely retrieve your basic information from SAM.gov. This information is required for DCSA verification.
      </p>

      <div className="mt-8 space-y-6">
        {/* UEI Input */}
        <div className="relative">
          <label htmlFor="uei" className="block text-sm font-medium text-secondary-text">
            Unique Entity ID (UEI) *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="uei"
              value={applicationData.uei}
              onChange={handleUeiChange}
              maxLength={12}
              className="form-input block w-full px-3 py-2 border rounded-l-md shadow-sm placeholder-gray-400 sm:text-sm"
              placeholder="Enter 12-character UEI"
            />
            <Button
              onClick={handleLookupCompany}
              disabled={!isUeiValid || processingStatus === 'fetching'}
              className="rounded-l-none"
              variant="primary"
            >
              {processingStatus === 'fetching' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Lookup</span>
            </Button>
          </div>
          {lookupError && (
            <p className="mt-1 text-sm text-red-600">{lookupError}</p>
          )}
          {processingStatus === 'complete' && hasCompanyData && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Company data retrieved successfully
            </p>
          )}
        </div>

        {/* Auto-filled Company Name */}
        {hasCompanyData && (
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-secondary-text">
              Legal Business Name
            </label>
            <input
              type="text"
              id="companyName"
              value={applicationData.companyName}
              readOnly
              className="form-input mt-1 block w-full px-3 py-2 bg-gray-50 border rounded-md shadow-sm sm:text-sm"
            />
          </div>
        )}
        
        {/* Auto-filled CAGE Code */}
        {hasCompanyData && (
          <div>
            <label htmlFor="cageCode" className="block text-sm font-medium text-secondary-text">
              CAGE Code
            </label>
            <input
              type="text"
              id="cageCode"
              value={applicationData.cageCode}
              readOnly
              className="form-input mt-1 block w-full px-3 py-2 bg-gray-50 border rounded-md shadow-sm sm:text-sm"
            />
          </div>
        )}

        {hasCompanyData && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Company Information Retrieved
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Your company data has been successfully retrieved from SAM.gov. You can now proceed to the next step.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};