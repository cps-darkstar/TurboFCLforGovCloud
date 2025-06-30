import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, ExternalLink, User } from 'lucide-react';
import React, { useState } from 'react';

interface AccountRequestForm {
  fso_name: string;
  fso_email: string;
  fso_phone: string;
  company_name: string;
  uei: string;
  request_reason: string;
  estimated_personnel_count: number | '';
  agrees_to_terms: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const FSOAccountRequest: React.FC = () => {
  const [formData, setFormData] = useState<AccountRequestForm>({
    fso_name: '',
    fso_email: '',
    fso_phone: '',
    company_name: '',
    uei: '',
    request_reason: '',
    estimated_personnel_count: '',
    agrees_to_terms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSamGovRedirect, setShowSamGovRedirect] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.fso_name.trim()) {
      newErrors.fso_name = 'FSO name is required';
    }

    if (!formData.fso_email.trim()) {
      newErrors.fso_email = 'FSO email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.fso_email)) {
      newErrors.fso_email = 'Please enter a valid email address';
    }

    if (!formData.fso_phone.trim()) {
      newErrors.fso_phone = 'FSO phone number is required';
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    // UEI validation (12 characters)
    if (formData.uei && formData.uei.length !== 12) {
      newErrors.uei = 'UEI must be exactly 12 characters';
    }

    if (!formData.agrees_to_terms) {
      newErrors.agrees_to_terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/v1/auth/request-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          estimated_personnel_count: formData.estimated_personnel_count || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        if (result.redirect_to_sam_gov) {
          setShowSamGovRedirect(true);
        }
      } else {
        setSubmitStatus('error');
        setErrors({ submit: result.detail || 'Failed to submit request' });
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AccountRequestForm, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Request Submitted Successfully</CardTitle>
            <CardDescription>
              Your account request has been received and is being processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSamGovRedirect && (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Action Required:</strong> You need to register your company with SAM.gov 
                      to obtain a Unique Entity Identifier (UEI) before proceeding.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open('https://sam.gov/content/entity-registration', '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Register with SAM.gov
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {showSamGovRedirect && (
                  <li>Register your company with SAM.gov to obtain UEI</li>
                )}
                <li>Check your email for account creation instructions</li>
                <li>Complete FSO registration with provided credentials</li>
                <li>Begin FCL application process</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Request TurboFCL Access</CardTitle>
          <CardDescription>
            Complete this form to request access to the TurboFCL system. 
            The Facility Security Officer (FSO) will be the primary administrator for your company's account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* FSO Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-lg font-semibold">
                <User className="h-5 w-5" />
                <span>Facility Security Officer (FSO) Information</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fso_name">FSO Full Name *</Label>
                  <Input
                    id="fso_name"
                    value={formData.fso_name}
                    onChange={(e) => handleInputChange('fso_name', e.target.value)}
                    placeholder="John Smith"
                    className={errors.fso_name ? 'border-red-500' : ''}
                  />
                  {errors.fso_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.fso_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fso_phone">FSO Phone Number *</Label>
                  <Input
                    id="fso_phone"
                    value={formData.fso_phone}
                    onChange={(e) => handleInputChange('fso_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={errors.fso_phone ? 'border-red-500' : ''}
                  />
                  {errors.fso_phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.fso_phone}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="fso_email">FSO Email Address *</Label>
                <Input
                  id="fso_email"
                  type="email"
                  value={formData.fso_email}
                  onChange={(e) => handleInputChange('fso_email', e.target.value)}
                  placeholder="fso@company.com"
                  className={errors.fso_email ? 'border-red-500' : ''}
                />
                {errors.fso_email && (
                  <p className="text-red-500 text-sm mt-1">{errors.fso_email}</p>
                )}
              </div>
            </div>

            {/* Company Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-lg font-semibold">
                <Building className="h-5 w-5" />
                <span>Company Information</span>
              </div>

              <div>
                <Label htmlFor="company_name">Legal Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Defense Contractor LLC"
                  className={errors.company_name ? 'border-red-500' : ''}
                />
                {errors.company_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="uei">Unique Entity Identifier (UEI)</Label>
                <Input
                  id="uei"
                  value={formData.uei}
                  onChange={(e) => handleInputChange('uei', e.target.value.toUpperCase())}
                  placeholder="Enter 12-character UEI"
                  maxLength={12}
                  className={errors.uei ? 'border-red-500' : ''}
                />
                {errors.uei && (
                  <p className="text-red-500 text-sm mt-1">{errors.uei}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  If you don't have a UEI, you'll be redirected to SAM.gov to register your company.
                </p>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-4">
              <div className="text-lg font-semibold">Additional Information</div>

              <div>
                <Label htmlFor="estimated_personnel_count">Estimated Personnel Requiring Clearance</Label>
                <Input
                  id="estimated_personnel_count"
                  type="number"
                  value={formData.estimated_personnel_count}
                  onChange={(e) => handleInputChange('estimated_personnel_count', parseInt(e.target.value) || '')}
                  placeholder="25"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="request_reason">Reason for FCL Application</Label>
                <Textarea
                  id="request_reason"
                  value={formData.request_reason}
                  onChange={(e) => handleInputChange('request_reason', e.target.value)}
                  placeholder="Brief description of why your company needs facility clearance..."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agrees_to_terms"
                  checked={formData.agrees_to_terms}
                  onCheckedChange={(checked) => handleInputChange('agrees_to_terms', !!checked)}
                />
                <Label htmlFor="agrees_to_terms" className="text-sm">
                  I agree to the terms and conditions and understand that the FSO will be responsible 
                  for managing the company's FCL application and user access. *
                </Label>
              </div>
              {errors.agrees_to_terms && (
                <p className="text-red-500 text-sm">{errors.agrees_to_terms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              {errors.submit && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Account Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FSOAccountRequest;
