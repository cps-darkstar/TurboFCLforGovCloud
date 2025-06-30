import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle,
    Building,
    CheckCircle,
    ExternalLink,
    FileText,
    Settings,
    Shield,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FCLComponent {
  complete: boolean;
  required: boolean;
  last_updated?: string;
}

interface FCLStatus {
  company_id: string;
  fcl_application_id: string;
  status: string;
  progress_percentage: number;
  components: {
    [key: string]: FCLComponent;
  };
  last_updated: string;
  next_required_action: string;
  can_submit: boolean;
}

interface SystemStatus {
  user_id: string;
  company_id: string;
  fcl_application_id: string;
  user_role: string;
  is_admin: boolean;
  company_name: string;
  fcl_status: string;
  progress_percentage: number;
  pending_actions: string[];
  recent_activity: any[];
}

const FSODashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [fclStatus, setFclStatus] = useState<FCLStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const userId = localStorage.getItem('user_id');
      const companyId = localStorage.getItem('company_id');

      if (!sessionToken || !userId || !companyId) {
        window.location.href = '/login';
        return;
      }

      // Fetch system status
      const statusResponse = await fetch(`/api/v1/auth/status?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setSystemStatus(status);
      }

      // Fetch FCL application status
      const fclResponse = await fetch(`/api/v1/auth/fcl-status/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (fclResponse.ok) {
        const fcl = await fclResponse.json();
        setFclStatus(fcl);
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'bg-gray-500';
      case 'APPLICATION_COMPONENTS_INCOMPLETE':
        return 'bg-yellow-500';
      case 'APPLICATION_COMPONENTS_COMPLETE':
        return 'bg-blue-500';
      case 'APPLICATION_GENERATED_READY_TO_SUBMIT':
        return 'bg-green-500';
      case 'SUBMITTED_TO_DCSA':
        return 'bg-purple-500';
      case 'UNDER_REVIEW':
        return 'bg-indigo-500';
      case 'APPROVED':
        return 'bg-green-600';
      case 'DENIED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getComponentIcon = (componentName: string) => {
    switch (componentName) {
      case 'company_profile':
        return <Building className="h-5 w-5" />;
      case 'key_management_personnel':
        return <Users className="h-5 w-5" />;
      case 'business_structure':
        return <FileText className="h-5 w-5" />;
      case 'foreign_ownership':
        return <ExternalLink className="h-5 w-5" />;
      case 'facility_information':
        return <Building className="h-5 w-5" />;
      case 'security_procedures':
        return <Shield className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const formatComponentName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">TurboFCL</h1>
              </div>
              {systemStatus && (
                <div className="text-sm text-gray-600">
                  {systemStatus.company_name} • {systemStatus.user_role}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FCL Application Status */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>FCL Application Status</CardTitle>
                <CardDescription>
                  Track the progress of your facility clearance application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fclStatus && (
                  <>
                    {/* Overall Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className={getStatusColor(fclStatus.status)}>
                          {fclStatus.status.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          Last updated: {new Date(fclStatus.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(fclStatus.progress_percentage)}%
                        </div>
                        <p className="text-sm text-gray-600">Complete</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={fclStatus.progress_percentage} className="w-full" />

                    {/* Components Checklist */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">Application Components</h3>
                      {Object.entries(fclStatus.components).map(([name, component]) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getComponentIcon(name)}
                            <span className="font-medium">{formatComponentName(name)}</span>
                            {component.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {component.complete ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                            <span className="text-sm">
                              {component.complete ? 'Complete' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Next Action */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Next Required Action</h3>
                      <p className="text-blue-800">{fclStatus.next_required_action}</p>
                      {fclStatus.can_submit && (
                        <Button className="mt-3">
                          Submit Application to DCSA
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start">
                  <Building className="mr-2 h-4 w-4" />
                  Update Company Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Documents
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Verify UEI on SAM.gov
                </Button>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium">2.0.0-beta.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Environment:</span>
                    <Badge variant="outline">Testing</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Support:</span>
                    <a href="mailto:support@turbofcl.com" className="text-blue-600 hover:underline">
                      Contact
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
};

export default FSODashboard;
