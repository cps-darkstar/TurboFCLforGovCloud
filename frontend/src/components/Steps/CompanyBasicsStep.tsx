import React from 'react';
import { useApplicationData } from '../../hooks/useApplicationData';
import { Loader2, CheckCircle } from 'lucide-react';

export const CompanyBasicsStep = () => {
  const { applicationData, updateApplicationData, processingStatus } = useApplicationData();

  const handleUeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic validation to allow only alphanumeric characters
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    updateApplicationData('uei', value);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
      <p className="mt-2 text-sm text-gray-600">
        Start by entering your company's Unique Entity ID (UEI). We will use it to securely retrieve your basic information from SAM.gov. This information is required for DCSA verification.
      </p>

      <div className="mt-8 space-y-6">
        {/* UEI Input */}
        <div className="relative">
          <label htmlFor="uei" className="block text-sm font-medium text-gray-700">
            Unique Entity ID (UEI)
          </label>
          <input
            type="text"
            id="uei"
            value={applicationData.uei}
            onChange={handleUeiChange}
            maxLength={12}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter 12-character UEI"
          />
          {processingStatus === 'fetching' && (
            <div className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center pointer-events-none">
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}
           {processingStatus === 'complete' && applicationData.companyName && (
            <div className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center pointer-events-none">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>

        {/* Auto-filled Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Legal Business Name
          </label>
          <input
            type="text"
            id="companyName"
            value={applicationData.companyName}
            readOnly
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
          />
        </div>
        
        {/* Auto-filled CAGE Code */}
        <div>
          <label htmlFor="cageCode" className="block text-sm font-medium text-gray-700">
            CAGE Code
          </label>
          <input
            type="text"
            id="cageCode"
            value={applicationData.cageCode}
            readOnly
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};