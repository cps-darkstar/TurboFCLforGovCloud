import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

interface AccountRequestFormData {
  fsoName: string;
  email: string;
  companyName: string;
  uei: string;
  phone: string;
  additionalInfo: string;
}

const AccountRequestForm: React.FC = () => {
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
        // Reset form
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Request Submitted Successfully</CardTitle>
          <CardDescription className="text-lg">
            Your account request has been submitted for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens next:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Coleman will review your request within 1-2 business days</li>
                <li>• You'll receive login credentials via email once approved</li>
                <li>• Your company information will be pre-populated in the system</li>
                <li>• You can then begin your FCL application process</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button 
              onClick={() => setSubmitStatus('idle')}
              variant="outline"
            >
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Request TurboFCL Account Access</CardTitle>
        <CardDescription>
          Submit your information to request access to the TurboFCL system. 
          Coleman will review and approve your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div>
              <Label htmlFor="fsoName">
                FSO Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fsoName"
                type="text"
                value={formData.fsoName}
                onChange={handleInputChange('fsoName')}
                placeholder="Enter the Facility Security Officer name"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                The FSO will be the primary account owner and FCL application originator.
              </p>
            </div>

            <div>
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="fso@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleInputChange('companyName')}
                placeholder="Enter your company's legal name"
                required
              />
            </div>

            <div>
              <Label htmlFor="uei">
                UEI (Unique Entity Identifier)
              </Label>
              <Input
                id="uei"
                type="text"
                value={formData.uei}
                onChange={handleInputChange('uei')}
                placeholder="12-character UEI from SAM.gov"
                maxLength={12}
              />
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href="https://sam.gov/content/entity-registration" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Don't have a UEI? Register your entity at SAM.gov
                </a>
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange('additionalInfo')}
                placeholder="Any additional context about your request or company..."
                rows={3}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• The FSO will be the primary administrator for your company's FCL application</li>
              <li>• Only one FCL case per business entity is allowed at any time</li>
              <li>• The FSO can create additional user accounts for Key Management Personnel (KMP)</li>
              <li>• All users will be associated with the single FCL application in progress</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Submitting Request...' : 'Submit Account Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountRequestForm;
