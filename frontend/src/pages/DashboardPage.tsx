import { AlertTriangle, CheckCircle, Clock, FileText, Plus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mockApplications = [
    {
      id: '1',
      companyName: user?.companyName || 'Test Company LLC',
      status: 'draft',
      createdAt: '2025-01-27',
      progress: 45
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-5 w-5 text-secondary-text" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-accent-text" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-secondary-text" />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="h1-typography">Dashboard</h1>
        <p className="p-typography">Welcome back, {user?.companyName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary-accent" />
            <div className="ml-4">
              <p className="h2-typography">{mockApplications.length}</p>
              <p className="p-typography">Applications</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="h2-typography">0</p>
              <p className="p-typography">In Review</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="h2-typography">0</p>
              <p className="p-typography">Approved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <h2 className="h2-typography">FCL Applications</h2>
            <button
              onClick={() => navigate('/application')}
              className="button-primary"
            >
              <Plus className="h-4 w-4" />
              New Application
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-border-subtle">
          {mockApplications.map((app) => (
            <div key={app.id} className="px-6 py-4 hover:bg-background-secondary cursor-pointer" onClick={() => navigate('/application')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(app.status)}
                  <div>
                    <h3 className="font-medium text-text-primary">{app.companyName}</h3>
                    <p className="text-sm text-text-secondary">Created {app.createdAt}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="bg-accent-bg rounded-full h-2.5">
                      <div className="bg-accent-text h-2.5 rounded-full" style={{ width: `${app.progress}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{app.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;