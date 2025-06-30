import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Lock, Mail } from 'lucide-react';
import React, { useState } from 'react';

interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user_id: string;
  company_id: string;
  fcl_application_id: string;
  session_token: string;
  expires_at: string;
  user_role: string;
  is_admin: boolean;
  permissions: {
    [key: string]: string[];
  };
}

const FSOLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
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
    setLoginStatus('idle');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result: LoginResponse = await response.json();

      if (response.ok && result.success) {
        setLoginStatus('success');
        
        // Store session information
        localStorage.setItem('session_token', result.session_token);
        localStorage.setItem('user_id', result.user_id);
        localStorage.setItem('company_id', result.company_id);
        localStorage.setItem('fcl_application_id', result.fcl_application_id);
        localStorage.setItem('user_role', result.user_role);
        localStorage.setItem('is_admin', result.is_admin.toString());

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setLoginStatus('error');
        setErrors({ submit: 'Invalid credentials' });
      }
    } catch (error) {
      setLoginStatus('error');
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
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

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>TurboFCL Access</CardTitle>
          <CardDescription>
            Sign in to your FSO account to manage your company's facility clearance application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="fso@company.com"
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

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
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>Don't have an account?</p>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.location.href = '/request-access'}
              >
                Request Access
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Development Mode Notice */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-2">Testing Phase</p>
          <p>
            This system is currently in testing phase for ISI and DARPA users. 
            For testing purposes, any valid email format and password will be accepted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FSOLogin;
