import React, { useState } from 'react';

interface AccountRequestFormData {
  fsoName: string;
  email: string;
  companyName: string;
  uei: string;
  phone: string;
  additionalInfo: string;
}

const SimpleAccountRequestForm: React.FC = () => {
  const [formData, setFormData] = useState<AccountRequestFormData>({
    fsoName: '',
    email: '',
    companyName: '',
    uei: '',
    phone: '',
    additionalInfo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (field: keyof AccountRequestFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/v1/auth/request-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fso_name: formData.fsoName,
          email: formData.email,
          company_name: formData.companyName,
          uei: formData.uei,
          phone: formData.phone,
          additional_info: formData.additionalInfo
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          fsoName: '',
          email: '',
          companyName: '',
          uei: '',
          phone: '',
          additionalInfo: ''
        });
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.detail || 'Failed to submit account request');
        setSubmitStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.fsoName && formData.email && formData.companyName;

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Request Submitted Successfully</h2>
          <p className="text-gray-600">Your account request has been submitted for review.</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">What happens next:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Coleman will review your request within 1-2 business days</li>
            <li>• You'll receive login credentials via email once approved</li>
            <li>• Your company information will be pre-populated in the system</li>
            <li>• You can then begin your FCL application process</li>
          </ul>
        </div>
        
        <div className="text-center">
          <button 
            onClick={() => setSubmitStatus('idle')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request TurboFCL Account Access</h2>
        <p className="text-gray-600">
          Submit your information to request access to the TurboFCL system. 
          Coleman will review and approve your request.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-600 mr-2">⚠</span>
              <p className="text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fsoName" className="block text-sm font-medium text-gray-700 mb-1">
            FSO Name <span className="text-red-500">*</span>
          </label>
          <input
            id="fsoName"
            type="text"
            value={formData.fsoName}
            onChange={handleInputChange('fsoName')}
            placeholder="Enter the Facility Security Officer name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            The FSO will be the primary account owner and FCL application originator.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="fso@company.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleInputChange('companyName')}
            placeholder="Enter your company's legal name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="uei" className="block text-sm font-medium text-gray-700 mb-1">
            UEI (Unique Entity Identifier)
          </label>
          <input
            id="uei"
            type="text"
            value={formData.uei}
            onChange={handleInputChange('uei')}
            placeholder="12-character UEI from SAM.gov"
            maxLength={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2">
            <a 
              href="https://sam.gov/content/entity-registration" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Don't have a UEI? Register your entity at SAM.gov →
            </a>
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange('phone')}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Information
          </label>
          <textarea
            id="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange('additionalInfo')}
            placeholder="Any additional context about your request or company..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The FSO will be the primary administrator for your company's FCL application</li>
            <li>• Only one FCL case per business entity is allowed at any time</li>
            <li>• The FSO can create additional user accounts for Key Management Personnel (KMP)</li>
            <li>• All users will be associated with the single FCL application in progress</li>
          </ul>
        </div>

        <button 
          type="submit" 
          className={`w-full py-3 px-4 rounded-md font-medium ${
            !isFormValid || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Submitting Request...' : 'Submit Account Request'}
        </button>
      </form>
    </div>
  );
};

export default SimpleAccountRequestForm;
